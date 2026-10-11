import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import {
  SCHEDULE_TRIGGER_TYPE, getRules, describeRule, nextRun, expectedIntervalMs, downstreamPaths,
  type N8nNode, type N8nConnections,
} from '@/lib/n8nSchedule'
import type { Scheduler, SchedulerGap, SchedulerOverview, SchedulerRun } from '@/types'

// Read-only view of the n8n "Patient Reminders" workflow, straight from the
// n8n tables that live in the same Postgres database as the clinic app.

const WORKFLOW_NAME = process.env.N8N_REMINDERS_WORKFLOW_NAME || 'Patient Reminders'
// n8n schedules in GENERIC_TIMEZONE when a workflow has no timezone of its own.
// Its built-in default is America/New_York.
const N8N_DEFAULT_TIMEZONE = process.env.N8N_DEFAULT_TIMEZONE || 'America/New_York'
const WINDOW_DAYS = 14

interface WorkflowRow {
  id: string
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: N8nConnections
  settings: { timezone?: string } | null
  updatedAt: Date
  versionId: string | null
  activeVersionId: string | null
}

interface RunRow {
  id: number
  status: string
  mode: string
  startedAt: Date
  stoppedAt: Date | null
  trigger: string
}

function toRun(r: RunRow): SchedulerRun {
  return {
    id: r.id,
    trigger: r.trigger,
    status: r.status,
    mode: r.mode,
    started_at: r.startedAt.toISOString(),
    stopped_at: r.stoppedAt?.toISOString() ?? null,
    duration_ms: r.stoppedAt ? r.stoppedAt.getTime() - r.startedAt.getTime() : null,
  }
}

function findGaps(runs: SchedulerRun[], intervalMs: number, checkUntil: Date | null): SchedulerGap[] {
  const times = runs
    .filter(r => r.mode === 'trigger')
    .map(r => new Date(r.started_at).getTime())
    .sort((a, b) => a - b)
  if (checkUntil && times.length) times.push(checkUntil.getTime())

  const gaps: SchedulerGap[] = []
  for (let i = 1; i < times.length; i++) {
    const diff = times[i] - times[i - 1]
    if (diff > intervalMs * 1.5) {
      gaps.push({
        from: new Date(times[i - 1]).toISOString(),
        to: new Date(times[i]).toISOString(),
        missed: Math.round(diff / intervalMs) - 1,
      })
    }
  }
  return gaps.reverse()
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  const user = token ? verifyToken(token) : null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const workflow = await queryOne<WorkflowRow>(
      `SELECT id, name, active, nodes, connections, settings, "updatedAt", "versionId", "activeVersionId"
       FROM workflow_entity
       WHERE name = $1 AND NOT COALESCE("isArchived", false)
       ORDER BY active DESC, "updatedAt" DESC
       LIMIT 1`,
      [WORKFLOW_NAME]
    )
    if (!workflow) {
      return NextResponse.json({ error: `n8n workflow "${WORKFLOW_NAME}" not found` }, { status: 404 })
    }

    // What n8n is actually running is the published version, which can differ
    // from the draft in workflow_entity.
    let nodes = workflow.nodes
    let connections = workflow.connections
    let liveVersionAt: Date | null = null
    if (workflow.activeVersionId) {
      const live = await queryOne<{ nodes: N8nNode[]; connections: N8nConnections; createdAt: Date }>(
        `SELECT nodes, connections, "createdAt" FROM workflow_history WHERE "versionId" = $1`,
        [workflow.activeVersionId]
      )
      if (live) {
        nodes = live.nodes
        connections = live.connections
        liveVersionAt = live.createdAt
      }
    }

    const tzSetting = workflow.settings?.timezone
    const timezoneIsDefault = !tzSetting || tzSetting === 'DEFAULT'
    const timezone = timezoneIsDefault ? N8N_DEFAULT_TIMEZONE : tzSetting

    const triggers = nodes.filter(n => n.type === SCHEDULE_TRIGGER_TYPE)
    const triggerNames = triggers.map(t => t.name)

    // n8n doesn't record which trigger started an execution, but the trigger's
    // node name appears in that execution's run data.
    const rows = await query<RunRow>(
      `SELECT DISTINCT ON (e.id) e.id, e.status, e.mode, e."startedAt", e."stoppedAt", t.name AS trigger
       FROM execution_entity e
       JOIN execution_data d ON d."executionId" = e.id
       CROSS JOIN LATERAL unnest($2::text[]) AS t(name)
       WHERE e."workflowId" = $1
         AND e."deletedAt" IS NULL
         AND e."startedAt" >= now() - make_interval(days => $3)
         AND strpos(d.data, '"' || t.name || '"') > 0
       ORDER BY e.id DESC`,
      [workflow.id, triggerNames, WINDOW_DAYS]
    )
    const runs = rows.map(toRun)
    const now = new Date()

    const schedulers: Scheduler[] = triggers.map(node => {
      const rules = getRules(node)
      const mine = runs.filter(r => r.trigger === node.name)
      const lastScheduled = mine.find(r => r.mode === 'trigger') ?? null
      const disabled = Boolean(node.disabled)
      const live = workflow.active && !disabled

      const nextRuns = live
        ? rules.map(r => nextRun(r, timezone, now)).filter((d): d is Date => d !== null)
        : []
      const intervalMs = rules.length === 1 ? expectedIntervalMs(rules[0]) : null

      return {
        name: node.name,
        state: !workflow.active ? 'workflow_inactive'
          : disabled ? 'disabled'
          : lastScheduled?.status === 'error' || lastScheduled?.status === 'crashed' ? 'failing'
          : 'running',
        disabled,
        schedule: rules.map(describeRule).join(' · '),
        next_run: nextRuns.length ? new Date(Math.min(...nextRuns.map(d => d.getTime()))).toISOString() : null,
        last_run: mine[0] ?? null,
        last_success_at: mine.find(r => r.status === 'success')?.started_at ?? null,
        last_error_at: mine.find(r => r.status === 'error' || r.status === 'crashed')?.started_at ?? null,
        runs: mine.length,
        errors: mine.filter(r => r.status === 'error' || r.status === 'crashed').length,
        steps: downstreamPaths(node.name, connections),
        gaps: intervalMs ? findGaps(mine, intervalMs, live ? now : null) : [],
      }
    })

    const baseUrl = process.env.N8N_BASE_URL?.replace(/\/$/, '')
    const overview: SchedulerOverview = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        updated_at: workflow.updatedAt.toISOString(),
        live_version_at: liveVersionAt?.toISOString() ?? null,
        has_unpublished_changes: Boolean(workflow.activeVersionId && workflow.versionId !== workflow.activeVersionId),
        timezone,
        timezone_is_default: timezoneIsDefault,
        n8n_url: baseUrl ? `${baseUrl}/workflow/${workflow.id}` : null,
      },
      window_days: WINDOW_DAYS,
      generated_at: now.toISOString(),
      schedulers,
      runs,
    }

    return NextResponse.json({ data: overview })
  } catch (err) {
    console.error('GET schedulers error:', err)
    return NextResponse.json({ error: 'Failed to load schedulers' }, { status: 500 })
  }
}
