// Helpers for reading n8n Schedule Trigger nodes: describe the rule in plain
// English and compute when it fires next, in the timezone n8n schedules in.

export interface N8nNode {
  name: string
  type: string
  disabled?: boolean
  parameters?: Record<string, unknown>
}

export type N8nConnections = Record<
  string,
  { main?: Array<Array<{ node: string }> | null> }
>

interface IntervalRule {
  field?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'cronExpression'
  secondsInterval?: number
  minutesInterval?: number
  hoursInterval?: number
  daysInterval?: number
  weeksInterval?: number
  monthsInterval?: number
  triggerAtMinute?: number
  triggerAtHour?: number
  triggerAtDay?: number[]
  triggerAtDayOfMonth?: number
  expression?: string
}

export const SCHEDULE_TRIGGER_TYPE = 'n8n-nodes-base.scheduleTrigger'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getRules(node: N8nNode): IntervalRule[] {
  const rule = node.parameters?.rule as { interval?: IntervalRule[] } | undefined
  // n8n omits `field` when it is left at its default, which is "days".
  return (rule?.interval ?? [{}]).map(r => ({ field: 'days', ...r }))
}

function clock(hour = 0, minute = 0) {
  const h = hour % 12 || 12
  return `${h}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

function every(n: number | undefined, unit: string) {
  return !n || n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`
}

export function describeRule(r: IntervalRule): string {
  switch (r.field) {
    case 'seconds': return every(r.secondsInterval, 'second')
    case 'minutes': return every(r.minutesInterval, 'minute')
    case 'hours':
      return `${every(r.hoursInterval, 'hour')}, at :${String(r.triggerAtMinute ?? 0).padStart(2, '0')}`
    case 'days':
      return `${r.daysInterval && r.daysInterval > 1 ? `Every ${r.daysInterval} days` : 'Daily'} at ${clock(r.triggerAtHour, r.triggerAtMinute)}`
    case 'weeks': {
      const days = (r.triggerAtDay?.length ? r.triggerAtDay : [0]).map(d => WEEKDAYS[d]).join(', ')
      return `${r.weeksInterval && r.weeksInterval > 1 ? `Every ${r.weeksInterval} weeks` : 'Weekly'} on ${days} at ${clock(r.triggerAtHour, r.triggerAtMinute)}`
    }
    case 'months':
      return `${r.monthsInterval && r.monthsInterval > 1 ? `Every ${r.monthsInterval} months` : 'Monthly'} on day ${r.triggerAtDayOfMonth ?? 1} at ${clock(r.triggerAtHour, r.triggerAtMinute)}`
    case 'cronExpression': return `Cron: ${r.expression ?? '?'}`
    default: return 'Unknown schedule'
  }
}

/** Expected gap between runs in ms, for gap detection. Null when irregular. */
export function expectedIntervalMs(r: IntervalRule): number | null {
  const MIN = 60_000
  switch (r.field) {
    case 'seconds': return (r.secondsInterval || 1) * 1000
    case 'minutes': return (r.minutesInterval || 1) * MIN
    case 'hours': return (r.hoursInterval || 1) * 60 * MIN
    case 'days': return (r.daysInterval || 1) * 24 * 60 * MIN
    default: return null
  }
}

// ── Next-run calculation ─────────────────────────────────────────────────────

interface WallClock { year: number; month: number; day: number; weekday: number; hour: number; minute: number }

function wallClock(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
  return {
    year: +get('year'), month: +get('month'), day: +get('day'),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
    hour: +get('hour'), minute: +get('minute'),
  }
}

// n8n turns each rule into a cron expression, so "every N" means "*/N" on
// that cron field (e.g. every 2 days = days 1, 3, 5… of the month).
function matches(r: IntervalRule, w: WallClock): boolean {
  const atMinute = (r.triggerAtMinute ?? 0) === w.minute
  const atHour = (r.triggerAtHour ?? 0) === w.hour
  switch (r.field) {
    case 'minutes': return w.minute % (r.minutesInterval || 1) === 0
    case 'hours': return atMinute && w.hour % (r.hoursInterval || 1) === 0
    case 'days': return atMinute && atHour && (w.day - 1) % (r.daysInterval || 1) === 0
    case 'weeks': return atMinute && atHour && (r.triggerAtDay?.length ? r.triggerAtDay : [0]).includes(w.weekday)
    case 'months':
      return atMinute && atHour && w.day === (r.triggerAtDayOfMonth ?? 1) && (w.month - 1) % (r.monthsInterval || 1) === 0
    default: return false
  }
}

/** Next fire time after `from`, or null for rules we can't compute (cron, seconds). */
export function nextRun(r: IntervalRule, timeZone: string, from = new Date()): Date | null {
  if (r.field === 'seconds') return new Date(from.getTime() + (r.secondsInterval || 1) * 1000)
  if (r.field === 'cronExpression') return null

  const MIN = 60_000
  let t = Math.floor(from.getTime() / MIN) * MIN + MIN
  const limit = t + 62 * 24 * 60 * MIN
  const fixedMinute = r.field !== 'minutes' ? (r.triggerAtMinute ?? 0) : null

  while (t < limit) {
    const w = wallClock(new Date(t), timeZone)
    if (matches(r, w)) return new Date(t)
    // Jump straight to the target minute instead of stepping one at a time.
    t += fixedMinute !== null && w.minute !== fixedMinute
      ? ((fixedMinute - w.minute + 60) % 60) * MIN
      : r.field === 'minutes' ? MIN : 60 * MIN
  }
  return null
}

/** Every path of node names from `start` to a leaf (excluding `start`), capped at `max`. */
export function downstreamPaths(start: string, connections: N8nConnections, max = 6): string[][] {
  const paths: string[][] = []
  const walk = (node: string, path: string[]) => {
    if (paths.length >= max) return
    const next = (connections[node]?.main ?? []).flatMap(b => b ?? []).map(c => c.node)
      .filter(n => n !== start && !path.includes(n))
    if (!next.length) {
      if (path.length) paths.push(path)
      return
    }
    for (const n of next) walk(n, [...path, n])
  }
  walk(start, [])
  return paths
}
