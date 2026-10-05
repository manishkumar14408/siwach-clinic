'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, Calendar, Flame, RefreshCw, TrendingUp,
  Phone, Clock, Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { format, addDays, startOfWeek, isToday, parseISO } from 'date-fns';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="card lg:col-span-7 flex items-center justify-center h-[280px]">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="card lg:col-span-5 flex items-center justify-center h-[280px]">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPI {
  total_patients: number;
  todays_appointments: number;
  new_leads_mtd: number;
  return_patients: number;
  hot_leads_mtd: number;
}

interface ChartRow { month: string; appointments: number; leads: number; }
interface DoctorRow { name: string; value: number; }

interface Lead {
  lead_id: string;
  patient_id: string;
  patient_name: string | null;
  whatsapp_no: string | null;
  concern: string | null;
  booked_against: string | null;
  hot_lead: boolean;
  forwarded_to: string | null;
  forwarded_time: string | null;
  status: string;
  summary: string | null;
  start_day: string;
  end_day: string | null;
  created_at: string;
  updated_at: string;
  appointment_time: string | null;
  reengagement_count: number;
  last_reengaged_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'badge-primary',
  closed: 'badge-success',
  lost: 'badge-danger',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [doctorDist, setDoctorDist] = useState<DoctorRow[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weekBase, setWeekBase] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekCounts, setWeekCounts] = useState<Record<string, { count: number; hot_count: number }>>({});

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekBase, i));

  function prevWeek() {
    const nb = addDays(weekBase, -7);
    setWeekBase(nb);
    setSelectedDate(format(nb, 'yyyy-MM-dd'));
  }
  function nextWeek() {
    const nb = addDays(weekBase, 7);
    setWeekBase(nb);
    setSelectedDate(format(nb, 'yyyy-MM-dd'));
  }

  // Fetch KPI + chart data
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setKpi(d.data.kpi);
          setChartData(d.data.chartData || []);
          setDoctorDist(d.data.doctorDist || []);
        }
      })
      .finally(() => setDashLoading(false));
  }, []);

  // Fetch week lead counts — refetch whenever the displayed week changes
  useEffect(() => {
    const start = format(weekDates[0], 'yyyy-MM-dd');
    const end = format(weekDates[6], 'yyyy-MM-dd');
    fetch(`/api/leads?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, { count: number; hot_count: number }> = {};
        (d.data || []).forEach((row: { date: string; count: number; hot_count: number }) => {
          map[row.date] = { count: row.count, hot_count: row.hot_count };
        });
        setWeekCounts(map);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBase]);

  // Fetch leads for selected date
  useEffect(() => {
    setLeadsLoading(true);
    fetch(`/api/leads?date=${selectedDate}`)
      .then(r => r.json())
      .then(d => setLeads(d.data || []))
      .finally(() => setLeadsLoading(false));
  }, [selectedDate]);

  const kpiCards = kpi ? [
    { label: 'Total Patients',        value: kpi.total_patients,       icon: Users,       color: '#4a8c4a', bg: '#e8f0eb' },
    { label: "Today's Appointments",  value: kpi.todays_appointments,  icon: Calendar,    color: '#e8940a', bg: '#fef4e8' },
    { label: 'New Leads MTD',         value: kpi.new_leads_mtd,        icon: TrendingUp,  color: '#7c6ab5', bg: '#f0edf9' },
    { label: 'Return Patients',       value: kpi.return_patients,      icon: RefreshCw,   color: '#2d7d94', bg: '#e8f5f8' },
    { label: 'Hot Leads MTD',         value: kpi.hot_leads_mtd,        icon: Flame,       color: '#c0392b', bg: '#fdecea' },
  ] : [];

  return (
    <div className="space-y-8">

      {/* ── KPI Cards ── */}
      {dashLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map((card, i) => (
            <div key={i} className="card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
              <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-text)' }}>
                {card.value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      {!dashLoading && (
        <DashboardCharts chartData={chartData} doctorDist={doctorDist} />
      )}

      {/* ── Patient Leads ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base" style={{ color: 'var(--color-text)' }}>
            Patient Leads
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
              {format(weekDates[0], 'd MMM')} – {format(weekDates[6], 'd MMM yyyy')}
            </span>
            <button
              onClick={() => router.push('/hot-leads?new=1')}
              className="btn-primary inline-flex items-center gap-1.5 text-sm py-1.5 px-3"
            >
              <Flame size={14} />
              Add Hot Lead
            </button>
          </div>
        </div>

        {/* Week calendar with prev/next */}
        <div className="card p-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek}
              className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[#f0ece6]"
              style={{ color: 'var(--color-text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5 overflow-x-auto flex-1">
              {weekDates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = dateStr === selectedDate;
                const todayDate = isToday(date);
                const dayData = weekCounts[dateStr];
                const count = dayData?.count;
                const hotCount = dayData?.hot_count;
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[60px] transition-all duration-150 flex-1"
                    style={{
                      background: isSelected ? 'var(--color-primary)' : todayDate ? 'var(--color-primary-light)' : 'transparent',
                      color: isSelected ? 'white' : todayDate ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                    }}>
                    <span className="text-xs uppercase font-medium">{format(date, 'EEE')}</span>
                    <span className="text-lg font-display font-semibold">{format(date, 'd')}</span>
                    {count ? (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-center">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: isSelected ? 'rgba(255,255,255,0.3)' : '#4a8c4a',
                            color: 'white', lineHeight: '1',
                          }}>
                          {count}
                        </span>
                        {hotCount ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: isSelected ? 'rgba(255,100,80,0.5)' : '#c0392b',
                              color: 'white', lineHeight: '1',
                            }}>
                            🔥{hotCount}
                          </span>
                        ) : null}
                      </div>
                    ) : <span className="mt-0.5 h-[16px]" />}
                  </button>
                );
              })}
            </div>
            <button onClick={nextWeek}
              className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[#f0ece6]"
              style={{ color: 'var(--color-text-muted)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Leads list */}
        <div className="card p-0 overflow-hidden">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp size={36} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No leads for this date</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                <div className="col-span-3">PATIENT</div>
                <div className="col-span-3 hidden sm:block">CONCERN</div>
                <div className="col-span-2 hidden md:block">DOCTOR</div>
                <div className="col-span-2 hidden md:block">APPT TIME</div>
                <div className="col-span-1">STATUS</div>
                <div className="col-span-1">HOT</div>
              </div>

              {leads.map(lead => {
                const sc = STATUS_COLORS[lead.status] || 'badge-neutral';
                return (
                  <button
                    key={lead.lead_id}
                    onClick={() => setSelectedLead(lead)}
                    className="w-full grid grid-cols-12 gap-3 px-5 py-4 items-center text-left transition-colors hover:bg-[#f8f6f1]"
                    style={{ background: lead.hot_lead ? '#fff9f5' : undefined }}>

                    <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                        {(lead.patient_name || lead.patient_id).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {lead.patient_name || `#${lead.patient_id}`}
                        </p>
                        {lead.whatsapp_no && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                            <Phone size={9} />{lead.whatsapp_no}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-3 hidden sm:block">
                      <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {lead.concern || '—'}
                      </p>
                    </div>

                    <div className="col-span-2 hidden md:block">
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {lead.booked_against || '—'}
                      </p>
                    </div>

                    <div className="col-span-2 hidden md:flex items-center gap-1">
                      {lead.appointment_time ? (
                        <>
                          <Clock size={11} style={{ color: 'var(--color-primary)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                            {formatTime(lead.appointment_time)}
                          </span>
                        </>
                      ) : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>}
                    </div>

                    <div className="col-span-1">
                      <span className={`badge ${sc} capitalize`}>{lead.status}</span>
                    </div>

                    <div className="col-span-1 flex items-center gap-1 justify-end">
                      {lead.hot_lead && <Flame size={14} style={{ color: '#c0392b' }} />}
                      <ChevronRight size={14} style={{ color: 'var(--color-text-light)' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Lead Detail Modal ── */}
      {selectedLead && (() => {
        const lead = selectedLead;
        const sc = STATUS_COLORS[lead.status] || 'badge-neutral';

        function fmtDate(val: string | null) {
          if (!val) return '—';
          try { return format(parseISO(val), 'dd MMM yyyy'); } catch { return val; }
        }
        function fmtDateTime(val: string | null) {
          if (!val) return '—';
          try { return format(parseISO(val), 'dd MMM yyyy, h:mm a'); } catch { return val; }
        }

        const fields = [
          { label: 'Lead ID',           value: `#${lead.lead_id}` },
          { label: 'Patient',           value: lead.patient_name || `UHID #${lead.patient_id}`, href: `/patients/${lead.patient_id}` },
          { label: 'WhatsApp',          value: lead.whatsapp_no },
          { label: 'Status',            value: lead.status, badge: sc },
          { label: 'Hot Lead',          value: lead.hot_lead ? '🔥 Yes' : 'No' },
          { label: 'Concern',           value: lead.concern },
          { label: 'Booked Against',    value: lead.booked_against },
          { label: 'Appointment Time',  value: formatTime(lead.appointment_time) },
          { label: 'Start Day',         value: fmtDate(lead.start_day) },
          { label: 'End Day',           value: fmtDate(lead.end_day) },
          { label: 'Forwarded To',      value: lead.forwarded_to },
          { label: 'Forwarded Time',    value: fmtDateTime(lead.forwarded_time) },
          { label: 'Reengagements',     value: String(lead.reengagement_count ?? 0) },
          { label: 'Last Reengaged',    value: fmtDateTime(lead.last_reengaged_at) },
          { label: 'Created At',        value: fmtDateTime(lead.created_at) },
          { label: 'Updated At',        value: fmtDateTime(lead.updated_at) },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedLead(null)} />
            <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-semibold"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                    {(lead.patient_name || lead.patient_id).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link
                      href={`/patients/${lead.patient_id}`}
                      className="font-display text-lg font-semibold underline"
                      style={{ color: '#2563eb' }}
                    >
                      {lead.patient_name || `UHID #${lead.patient_id}`}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`badge ${sc} capitalize`}>{lead.status}</span>
                      {lead.hot_lead && (
                        <span className="badge text-xs" style={{ background: '#fdecea', color: '#c0392b' }}>
                          🔥 Hot Lead
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)}
                  className="p-2 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {fields.map(({ label, value, badge, href }) => (
                  <div key={label}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                    {badge ? (
                      <span className={`badge ${badge} capitalize`}>{value ?? '—'}</span>
                    ) : href ? (
                      <Link
                        href={href}
                        className="text-sm font-medium break-words underline"
                        style={{ color: '#2563eb' }}
                      >
                        {value ?? '—'}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium break-words" style={{ color: 'var(--color-text)' }}>
                        {value ?? '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary if present */}
              {lead.summary && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Summary</p>
                  <p className="text-sm" style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
                    {lead.summary}
                  </p>
                </div>
              )}

              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button onClick={() => setSelectedLead(null)} className="btn-secondary w-full justify-center">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
