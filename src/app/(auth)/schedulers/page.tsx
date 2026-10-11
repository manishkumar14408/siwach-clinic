'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  RefreshCw, Loader2, Clock, CheckCircle2, XCircle, PauseCircle,
  AlertTriangle, ArrowRight, ExternalLink, Activity, PowerOff,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Scheduler, SchedulerOverview, SchedulerRun, SchedulerState } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPLAY_TZ = 'Asia/Kolkata';
const REFRESH_MS = 60_000;
const STRIP_RUNS = 60;
const PAGE_SIZE = 25;

function formatIST(ts: string | null, withDate = true) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: DISPLAY_TZ,
    ...(withDate ? { day: 'numeric', month: 'short' } : {}),
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(ts));
}

/** Time only when it's today in IST, otherwise date and time. */
function formatNext(ts: string) {
  const day = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: DISPLAY_TZ });
  return formatIST(ts, day(new Date(ts)) !== day(new Date()));
}

function relative(ts: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  const dist = formatDistanceToNowStrict(d);
  return d.getTime() > Date.now() ? `in ${dist}` : `${dist} ago`;
}

function formatDuration(ms: number | null) {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

/** Today's 10:00 AM in the given timezone, as an ISO instant. */
function tenAmIn(tz: string) {
  const now = new Date();
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(now).map(x => [x.type, x.value])
  );
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(now.getTime() / 60_000) * 60_000;
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, 10, 0) - offset).toISOString();
}

function tzClock(tz: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? tz;
}

/** n8n node names can contain double spaces; tidy them for display. */
function cleanName(name: string) {
  return name.replace(/\s+/g, ' ').trim();
}

function slug(name: string) {
  return cleanName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const STATE_META: Record<SchedulerState, { label: string; badge: string; dot: string; icon: typeof CheckCircle2 }> = {
  running: { label: 'Running', badge: 'badge-success', dot: 'var(--color-success)', icon: CheckCircle2 },
  failing: { label: 'Failing', badge: 'badge-danger', dot: 'var(--color-danger)', icon: XCircle },
  disabled: { label: 'Disabled', badge: 'badge-neutral', dot: 'var(--color-text-light)', icon: PauseCircle },
  workflow_inactive: { label: 'Workflow off', badge: 'badge-neutral', dot: 'var(--color-text-light)', icon: PowerOff },
};

function isError(status: string) {
  return status === 'error' || status === 'crashed';
}

function runColor(status: string) {
  if (status === 'success') return 'var(--color-success)';
  if (isError(status)) return 'var(--color-danger)';
  if (status === 'running' || status === 'waiting') return 'var(--color-accent)';
  return 'var(--color-border-strong)';
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'success' ? 'badge-success'
    : isError(status) ? 'badge-danger'
    : status === 'running' || status === 'waiting' ? 'badge-warning'
    : 'badge-neutral';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function SchedulerTabs({ schedulers, active, onSelect }: {
  schedulers: Scheduler[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    // Folder tabs: the row overlaps the panel's top border by 1px, and the
    // selected tab's bottom border matches the panel background so it merges in.
    <div role="tablist" aria-label="Schedulers" className="relative z-10 -mb-px flex gap-1.5 overflow-x-auto">
      {schedulers.map(s => {
        const id = slug(s.name);
        const selected = id === active;
        const meta = STATE_META[s.state];
        const inactive = s.state === 'disabled' || s.state === 'workflow_inactive';
        return (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            onClick={() => onSelect(id)}
            className={`flex-1 min-w-[200px] text-left rounded-t-2xl px-4 pt-3 pb-3.5 transition-colors duration-150 ${selected ? '' : 'hover:brightness-[0.98]'}`}
            style={{
              background: selected ? 'var(--color-surface)' : 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderTop: selected ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderBottomColor: selected ? 'var(--color-surface)' : 'var(--color-border)',
              paddingTop: selected ? 'calc(0.75rem - 2px)' : undefined,
            }}
          >
            <span className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: meta.dot }} />
              <span className="text-sm font-medium leading-snug"
                style={{ color: selected ? 'var(--color-primary-dark)' : 'var(--color-text)' }}>
                {cleanName(s.name)}
              </span>
            </span>
            <span className="block text-xs mt-1 pl-4" style={{ color: 'var(--color-text-muted)' }}>
              {inactive ? meta.label
                : s.state === 'failing' ? `Failing · next ${s.next_run ? formatNext(s.next_run) : '—'}`
                : s.next_run ? `Next ${formatNext(s.next_run)}` : meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Scheduler panel ───────────────────────────────────────────────────────────

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-light)' }}>{label}</p>
      {children}
    </div>
  );
}

function SchedulerPanel({ s, runs, timezone, windowDays }: {
  s: Scheduler;
  runs: SchedulerRun[];
  timezone: string;
  windowDays: number;
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const meta = STATE_META[s.state];
  const Icon = meta.icon;
  const strip = runs.slice(0, STRIP_RUNS).reverse();
  const successRate = s.runs ? Math.round(((s.runs - s.errors) / s.runs) * 100) : null;
  const missed = s.gaps.reduce((sum, g) => sum + g.missed, 0);
  const inactive = s.state === 'disabled' || s.state === 'workflow_inactive';
  const filtered = runs.filter(r =>
    statusFilter === 'all' || (statusFilter === 'error' ? isError(r.status) : r.status === statusFilter)
  );
  const id = slug(s.name);

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className="rounded-b-2xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Lifecycle */}
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              {cleanName(s.name)}
            </h2>
            <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <Clock size={13} /> {s.schedule}
              <span style={{ color: 'var(--color-text-light)' }}>({tzClock(timezone)})</span>
            </p>
          </div>
          <span className={`badge ${meta.badge} gap-1 self-start`}>
            <Icon size={12} /> {meta.label}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Fact label="LAST RUN">
            {s.last_run ? (
              <>
                <p className="text-sm font-medium mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: runColor(s.last_run.status) }} />
                  {formatIST(s.last_run.started_at)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {relative(s.last_run.started_at)} · {s.last_run.status}
                </p>
              </>
            ) : (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>No runs recorded</p>
            )}
          </Fact>
          <Fact label="NEXT RUN">
            {s.next_run ? (
              <>
                <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{formatIST(s.next_run)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{relative(s.next_run)}</p>
              </>
            ) : (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {inactive ? 'Not scheduled' : 'Unknown'}
              </p>
            )}
          </Fact>
          <Fact label={`RUNS (${windowDays} DAYS)`}>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>
              {s.runs} · {s.errors} error{s.errors === 1 ? '' : 's'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {successRate === null ? 'No data' : `${successRate}% success`}
            </p>
          </Fact>
          <Fact label="LAST ERROR">
            <p className="text-sm font-medium mt-1"
              style={{ color: s.last_error_at ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {s.last_error_at ? formatIST(s.last_error_at) : 'None'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {s.last_error_at ? relative(s.last_error_at) : `in the last ${windowDays} days`}
            </p>
          </Fact>
        </div>

        {/* Run strip */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            <span>Last {strip.length} run{strip.length === 1 ? '' : 's'}</span>
            {strip.length > 0 && <span style={{ color: 'var(--color-text-light)' }}>oldest → newest</span>}
          </div>
          {strip.length ? (
            <div className="flex items-end gap-[3px] h-8">
              {strip.map(r => (
                <div
                  key={r.id}
                  title={`#${r.id} · ${r.status} · ${formatIST(r.started_at)}`}
                  className="flex-1 max-w-[12px] rounded-sm"
                  style={{
                    background: runColor(r.status),
                    height: r.status === 'success' ? '100%' : '70%',
                    opacity: r.mode === 'trigger' ? 1 : 0.45,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="h-8 rounded-md" style={{ background: 'var(--color-surface-2)' }} />
          )}
        </div>

        {s.gaps.length > 0 && (
          <details className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-warning-light)' }}>
            <summary className="cursor-pointer flex items-center gap-1.5 font-medium" style={{ color: 'var(--color-warning)' }}>
              <AlertTriangle size={14} />
              {missed} expected run{missed === 1 ? '' : 's'} missing in {s.gaps.length} gap{s.gaps.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {s.gaps.slice(0, 6).map(g => (
                <li key={g.from}>{formatIST(g.from)} → {formatIST(g.to)} · ~{g.missed} missed</li>
              ))}
            </ul>
          </details>
        )}

        {s.steps.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-light)' }}>WHAT IT DOES</p>
            <div className="space-y-2">
              {s.steps.map(path => (
                <div key={path.join('>')} className="flex flex-wrap items-center gap-1.5">
                  {path.map((step, i) => (
                    <span key={step} className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight size={12} style={{ color: 'var(--color-text-light)' }} />}
                      <span className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                        {step}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run history */}
      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Run history</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Runs n8n has kept from the last {windowDays} days
            </p>
          </div>
          <select className="input-field !py-2 !w-auto" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setVisible(PAGE_SIZE); }}>
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {['Run', 'Status', 'Started (IST)', 'Duration', 'Mode'].map(h => (
                  <th key={h} className="text-left font-medium text-xs px-6 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map(r => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--color-text-muted)' }}>#{r.id}</td>
                  <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-3 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                    {formatIST(r.started_at)}
                    <span className="text-xs ml-2" style={{ color: 'var(--color-text-light)' }}>{relative(r.started_at)}</span>
                  </td>
                  <td className="px-6 py-3" style={{ color: 'var(--color-text-muted)' }}>{formatDuration(r.duration_ms)}</td>
                  <td className="px-6 py-3" style={{ color: 'var(--color-text-muted)' }}>{r.mode === 'trigger' ? 'Scheduled' : r.mode}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    {runs.length === 0
                      ? (inactive ? 'This scheduler is not running, so there are no runs.' : `No runs in the last ${windowDays} days.`)
                      : 'No runs match this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > visible && (
          <div className="px-6 py-3 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
            <button className="btn-secondary" onClick={() => setVisible(v => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} left)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SchedulersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SchedulerOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/schedulers');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load schedulers');
      setData(json.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedulers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(() => load(), REFRESH_MS);
    // Keep "in 12 min" / "3 min ago" labels current between refreshes.
    const tick = setInterval(() => setTick(t => t + 1), 15_000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [load]);

  const runsByTrigger = useMemo(() => {
    const map: Record<string, SchedulerRun[]> = {};
    for (const r of data?.runs ?? []) (map[r.trigger] ??= []).push(r);
    return map;
  }, [data]);

  const selectTab = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <XCircle size={28} className="mx-auto mb-3" style={{ color: 'var(--color-danger)' }} />
        <p className="font-medium" style={{ color: 'var(--color-text)' }}>{error}</p>
        <button onClick={() => load(true)} className="btn-secondary mt-4">Try again</button>
      </div>
    );
  }

  const { workflow } = data;
  // Live schedulers first; disabled ones keep their relative order at the end.
  const schedulers = [...data.schedulers].sort((a, b) =>
    Number(a.state === 'disabled' || a.state === 'workflow_inactive') -
    Number(b.state === 'disabled' || b.state === 'workflow_inactive'));
  const requested = searchParams.get('tab');
  const activeScheduler = schedulers.find(s => slug(s.name) === requested) ?? schedulers[0];
  const runningCount = schedulers.filter(s => s.state === 'running').length;
  const failingCount = schedulers.filter(s => s.state === 'failing').length;
  // Colour the summary by overall health: off, something failing, or all good.
  const health = !workflow.active
    ? { bg: 'var(--color-surface-2)', fg: 'var(--color-text-muted)', accent: 'var(--color-text-light)', note: 'Workflow is off in n8n' }
    : failingCount
    ? { bg: 'var(--color-danger-light)', fg: 'var(--color-danger)', accent: 'var(--color-danger)', note: `${failingCount} failing` }
    : { bg: 'var(--color-primary-light)', fg: 'var(--color-primary-dark)', accent: 'var(--color-primary)', note: 'All live schedulers healthy' };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>Schedulers</h1>
          <div className="flex items-center gap-3 rounded-2xl pl-3 pr-5 py-2.5 self-start sm:self-auto"
            style={{ background: health.bg, border: `1px solid ${health.accent}33` }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: health.accent, color: 'white' }}>
              <Activity size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-xl font-semibold" style={{ color: health.fg }}>
                {runningCount} / {schedulers.length}
                <span className="font-body text-sm font-medium ml-1.5">schedulers running</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: health.fg, opacity: 0.8 }}>{health.note}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-text-light)' }}>
            Updated {formatIST(data.generated_at, false)}
          </span>
          {workflow.n8n_url && (
            <a href={workflow.n8n_url} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink size={15} /> Open in n8n
            </a>
          )}
          <button onClick={() => load(true)} className="btn-secondary" disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
          Couldn&apos;t refresh: {error}. Showing the last loaded data.
        </div>
      )}

      {workflow.timezone_is_default && workflow.timezone !== DISPLAY_TZ && (
        <div className="rounded-xl px-4 py-3 text-sm flex gap-2.5"
          style={{ background: 'var(--color-warning-light)', color: 'var(--color-text)' }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
          <span>
            This workflow has no timezone set, so n8n runs its schedules in <strong>{workflow.timezone}</strong> time.
            A &ldquo;10 AM&rdquo; schedule fires at <strong>{formatIST(tenAmIn(workflow.timezone), false)} IST</strong>.
            Set GENERIC_TIMEZONE to Asia/Kolkata on the n8n services to fix this.
          </span>
        </div>
      )}
      {workflow.has_unpublished_changes && (
        <div className="rounded-xl px-4 py-3 text-sm flex gap-2.5"
          style={{ background: 'var(--color-accent-light)', color: 'var(--color-text)' }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <span>The workflow has draft changes that aren&apos;t published yet. This page shows the version n8n is running.</span>
        </div>
      )}

      {/* Per-scheduler tabs */}
      {activeScheduler ? (
        <div>
          <SchedulerTabs schedulers={schedulers} active={slug(activeScheduler.name)} onSelect={selectTab} />
          <SchedulerPanel
            key={activeScheduler.name}
            s={activeScheduler}
            runs={runsByTrigger[activeScheduler.name] ?? []}
            timezone={workflow.timezone}
            windowDays={data.window_days}
          />
        </div>
      ) : (
        <div className="card text-center py-10" style={{ color: 'var(--color-text-muted)' }}>
          This workflow has no schedule triggers.
        </div>
      )}
    </div>
  );
}

export default function SchedulersPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <SchedulersView />
    </Suspense>
  );
}
