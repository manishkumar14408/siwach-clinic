'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Flame, Loader2, Search, X, Trash2, Edit3,
  ChevronLeft, ChevronRight, UserPlus, CheckCircle2,
} from 'lucide-react';
import { useUser } from '@/components/UserProvider';
import { hasPermission } from '@/lib/permissions';
import { format } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  lead_id: number;
  patient_id: number;
  patient_name: string | null;
  patient_phone: string | null;
  concern: string | null;
  booked_against: string | null;
  hot_lead: boolean;
  manually_added: boolean;
  start_day: string;
  end_day: string | null;
  appointment_time: string | null;
  created_at: string;
  updated_at: string;
}

interface PatientResult {
  patient_uhid: number;
  full_name: string;
  whatsapp_no: string | null;
  age_dob: string | null;
  gender: string | null;
}

interface Doctor {
  id: number;
  doctor_name: string;
}

interface LeadForm {
  patient_id: string;
  patient_label: string;
  appointment_date: string;
  appointment_time: string;
  concern: string;
  booked_against: string;
  hot_lead: boolean;
}

interface NewPatientForm {
  full_name: string;
  age: string;
  gender: string;
  whatsapp_no: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00',
  '17:00', '17:30', '18:00', '18:30', '19:00',
];

const GENDERS = ['Male', 'Female', 'Other'];

const EMPTY_LEAD: LeadForm = {
  patient_id: '',
  patient_label: '',
  appointment_date: '',
  appointment_time: '',
  concern: '',
  booked_against: '',
  hot_lead: true,
};

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

function parseAppointmentTs(ts: string | null): { date: string; time: string } {
  if (!ts) return { date: '', time: '' };
  const normalized = ts.replace('T', ' ');
  const [datePart = '', timePart = ''] = normalized.split(' ');
  const [h = '', m = ''] = timePart.split(':');
  return { date: datePart, time: h && m ? `${h}:${m}` : '' };
}

const EMPTY_NEW_PATIENT: NewPatientForm = {
  full_name: '',
  age: '',
  gender: '',
  whatsapp_no: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string | null) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'NA';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HotLeadsPage() {
  const currentUser = useUser();
  const canDeleteLead = hasPermission(currentUser?.role ?? '', 'leads:delete');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [hotFilter, setHotFilter] = useState(true);
  const LIMIT = 10;

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [form, setForm] = useState<LeadForm>(EMPTY_LEAD);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Patient search inside form
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientSearched, setPatientSearched] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // New patient inline sub-form
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState<NewPatientForm>(EMPTY_NEW_PATIENT);
  const [creatingPatient, setCreatingPatient] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (hotFilter) params.set('hot', 'true');
      const res = await fetch(`/api/hot-leads?${params}`);
      const data = await res.json();
      setLeads(data.data || []);
      setTotalCount(data.meta?.total || 0);
      setPages(data.meta?.pages || 1);
    } catch (err) {
      console.error('Fetch leads failed', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, hotFilter]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 250);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  useEffect(() => { setPage(1); }, [searchQuery, hotFilter]);

  useEffect(() => {
    fetch('/api/doctors').then(r => r.json()).then(d => setDoctors(d.data || []));
  }, []);

  // Patient search inside form
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      setShowDropdown(false);
      setPatientSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
      const data = await res.json();
      const results = data.data || [];
      setPatientResults(results);
      setShowDropdown(results.length > 0);
      setPatientSearched(true);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Close patient dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-open from dashboard ?new=1
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('new') === '1') {
      openForm();
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openForm() {
    setEditingLeadId(null);
    setForm(EMPTY_LEAD);
    setPatientSearch('');
    setPatientResults([]);
    setShowDropdown(false);
    setPatientSearched(false);
    setShowNewPatient(false);
    setNewPatient(EMPTY_NEW_PATIENT);
    setFormError('');
    setShowForm(true);
  }

  function beginEdit(lead: Lead) {
    setEditingLeadId(lead.lead_id);
    const appt = parseAppointmentTs(lead.appointment_time);
    setForm({
      patient_id: String(lead.patient_id),
      patient_label: lead.patient_name || '',
      appointment_date: appt.date,
      appointment_time: appt.time,
      concern: lead.concern || '',
      booked_against: lead.booked_against || '',
      hot_lead: lead.hot_lead,
    });
    setPatientSearch(lead.patient_name || '');
    setPatientResults([]);
    setShowDropdown(false);
    setPatientSearched(false);
    setShowNewPatient(false);
    setNewPatient(EMPTY_NEW_PATIENT);
    setFormError('');
    setShowForm(true);
  }

  function selectPatient(p: PatientResult) {
    setForm(f => ({ ...f, patient_id: String(p.patient_uhid), patient_label: p.full_name }));
    setPatientSearch(p.full_name);
    setShowDropdown(false);
    setShowNewPatient(false);
  }

  function clearPatient() {
    setForm(f => ({ ...f, patient_id: '', patient_label: '' }));
    setPatientSearch('');
    setPatientResults([]);
    setPatientSearched(false);
    setShowNewPatient(false);
  }

  // ── Create new patient then set patient_id ─────────────────────────────────

  async function handleCreatePatient() {
    if (!newPatient.full_name.trim()) {
      setFormError('Patient full name is required.');
      return;
    }
    if (!newPatient.whatsapp_no.trim()) {
      setFormError('WhatsApp number is required for new patients.');
      return;
    }
    setCreatingPatient(true);
    setFormError('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newPatient.full_name.trim(),
          age_dob: newPatient.age ? String(parseInt(newPatient.age, 10)) : null,
          gender: newPatient.gender || null,
          whatsapp_no: newPatient.whatsapp_no || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create patient');
        return;
      }
      const created = data.data;
      setForm(f => ({ ...f, patient_id: String(created.patient_uhid), patient_label: created.full_name }));
      setPatientSearch(created.full_name);
      setShowNewPatient(false);
      setNewPatient(EMPTY_NEW_PATIENT);
    } catch {
      setFormError('Network error creating patient. Please try again.');
    } finally {
      setCreatingPatient(false);
    }
  }

  // ── Submit lead ────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.patient_id) { setFormError('Please select or create a patient.'); return; }
    if (!form.concern.trim()) { setFormError('Concern is required.'); return; }

    setSubmitting(true);
    try {
      const appointmentDatetime = form.appointment_date
        ? `${form.appointment_date} ${form.appointment_time ? form.appointment_time + ':00.000000' : '00:00:00.000000'}`
        : null;

      const payload = {
        patient_id: parseInt(form.patient_id, 10),
        start_day: todayStr(),
        end_day: null,
        appointment_time: appointmentDatetime,
        concern: form.concern.trim(),
        booked_against: form.booked_against || null,
        hot_lead: form.hot_lead,
        status: 'open',
        manually_added: true,
      };

      const res = await fetch(
        editingLeadId !== null ? `/api/hot-leads/${editingLeadId}` : '/api/hot-leads',
        {
          method: editingLeadId !== null ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to save lead'); return; }

      setShowForm(false);
      setPage(1);
      fetchLeads();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this lead?')) return;
    try {
      const res = await fetch(`/api/hot-leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to delete lead');
        return;
      }
      fetchLeads();
    } catch {
      alert('Unable to delete lead.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const patientConfirmed = !!form.patient_id;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Patient Leads
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {totalCount} lead{totalCount !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={openForm} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Hot / All toggle */}
      <div className="inline-flex rounded-xl p-1 gap-1" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setHotFilter(true)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={hotFilter ? { background: '#c0392b', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' } : { color: 'var(--color-text-muted)' }}
        >
          <Flame size={14} /> Hot Leads
        </button>
        <button
          onClick={() => setHotFilter(false)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={!hotFilter ? { background: '#fff', color: 'var(--color-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' } : { color: 'var(--color-text-muted)' }}
        >
          All Leads
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-light)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by patient name, UHID, or WhatsApp number..."
          className="input-field pl-11 pr-11"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{ color: 'var(--color-text-light)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <Flame size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{searchQuery ? 'No leads found' : 'No leads yet'}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{searchQuery ? 'Try a different search' : 'Add your first lead to get started'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-4">PATIENT</div>
              <div className="col-span-3 hidden sm:block">CONCERN</div>
              <div className="col-span-2 hidden md:block">DOCTOR</div>
              <div className="col-span-1 hidden lg:block">DATE</div>
              <div className="col-span-2 text-right">ACTIONS</div>
            </div>

            {leads.map(lead => (
              <div key={lead.lead_id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]">
                {/* Patient */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: '#e8f0eb', color: '#3a673a' }}>
                    {getInitials(lead.patient_name || 'Unknown')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {lead.patient_name || 'Unknown'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {lead.patient_phone || '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {lead.hot_lead && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#fdecea', color: '#c0392b' }}>
                          <Flame size={9} /> Hot
                        </span>
                      )}
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                        #{lead.lead_id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Concern */}
                <div className="col-span-3 hidden sm:block">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {lead.concern || '—'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {format(new Date(lead.created_at), 'd MMM yyyy')}
                  </p>
                </div>

                {/* Doctor */}
                <div className="col-span-2 hidden md:block">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                    {lead.booked_against || '—'}
                  </p>
                </div>

                {/* Date */}
                <div className="col-span-1 hidden lg:block">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {format(new Date(lead.start_day), 'd MMM')}
                  </p>
                  {lead.appointment_time && (
                    <p className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                      {formatTime(lead.appointment_time)}
                    </p>
                  )}
                </div>

                {/* Actions — always at extreme right */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    onClick={() => beginEdit(lead)}
                    className="p-2 rounded-lg transition-colors hover:bg-[#eef2ee]"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Edit"
                  >
                    <Edit3 size={15} />
                  </button>
                  {canDeleteLead && (
                    <button
                      onClick={() => handleDelete(lead.lead_id)}
                      className="p-2 rounded-lg transition-colors hover:bg-red-50"
                      style={{ color: '#c0392b' }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl flex flex-col" style={{ maxHeight: '92vh' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingLeadId !== null ? 'Edit Lead' : 'Add Lead'}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {editingLeadId !== null ? `Editing lead #${editingLeadId}` : 'Search for a patient or add a new one'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-[#f4f4f4]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto px-6 py-5 space-y-5">

                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {/* ── Patient section ────────────────────────────────────── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Patient
                  </p>

                  {/* Confirmed patient pill */}
                  {patientConfirmed ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                        style={{ background: '#e8f0eb', color: '#3a673a' }}>
                        {getInitials(form.patient_label)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{form.patient_label}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>UHID #{form.patient_id}</p>
                      </div>
                      {editingLeadId === null && (
                        <button type="button" onClick={clearPatient} className="p-1.5 rounded-lg hover:bg-[#e8e8e8]">
                          <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Patient search */
                    <div ref={patientSearchRef} className="relative">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                        <Search size={14} style={{ color: 'var(--color-text-light)' }} />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={e => setPatientSearch(e.target.value)}
                          placeholder="Search by name or phone..."
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: 'var(--color-text)' }}
                          autoFocus
                        />
                        {patientSearch && (
                          <button type="button" onClick={() => { setPatientSearch(''); setPatientResults([]); setPatientSearched(false); setShowDropdown(false); }}>
                            <X size={13} style={{ color: 'var(--color-text-light)' }} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown results */}
                      {showDropdown && (
                        <div className="absolute z-30 mt-1 w-full rounded-2xl border bg-white shadow-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                          {patientResults.map(p => (
                            <button
                              key={p.patient_uhid}
                              type="button"
                              onClick={() => selectPatient(p)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f6f1] text-left"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                style={{ background: '#e8f0eb', color: '#3a673a' }}>
                                {getInitials(p.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.full_name}</p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {[p.whatsapp_no, p.age_dob, p.gender].filter(Boolean).join(' · ') || `UHID #${p.patient_uhid}`}
                                </p>
                              </div>
                              <CheckCircle2 size={16} className="flex-shrink-0 ml-auto" style={{ color: 'var(--color-primary)' }} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add new patient prompt — shown when search returned no results */}
                      {patientSearched && patientResults.length === 0 && !patientConfirmed && (
                        <div className="mt-2 flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Patient not found in records</p>
                          <button
                            type="button"
                            onClick={() => { setShowNewPatient(true); setNewPatient(p => ({ ...p, full_name: patientSearch })); }}
                            className="inline-flex items-center gap-1.5 text-sm font-medium"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            <UserPlus size={14} /> Add New Patient
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── New patient inline form ──────────────────────────── */}
                  {showNewPatient && !patientConfirmed && (
                    <div className="mt-3 rounded-2xl p-4 space-y-3" style={{ background: '#f0f7f0', border: '1px solid #c8ddc8' }}>
                      <p className="text-xs font-semibold" style={{ color: '#3a673a' }}>
                        New Patient Details
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Full Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newPatient.full_name}
                            onChange={e => setNewPatient(p => ({ ...p, full_name: e.target.value }))}
                            className="input-field mt-1 w-full"
                            placeholder="Patient full name"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Age</label>
                          <input
                            type="number"
                            min={0} max={150}
                            value={newPatient.age}
                            onChange={e => setNewPatient(p => ({ ...p, age: e.target.value }))}
                            className="input-field mt-1 w-full"
                            placeholder="Years"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Gender</label>
                          <select value={newPatient.gender} onChange={e => setNewPatient(p => ({ ...p, gender: e.target.value }))} className="input-field mt-1 w-full">
                            <option value="">Select</option>
                            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>WhatsApp No <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newPatient.whatsapp_no}
                            onChange={e => setNewPatient(p => ({ ...p, whatsapp_no: e.target.value }))}
                            className="input-field mt-1 w-full"
                            placeholder="e.g. 919876543210"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCreatePatient}
                          disabled={creatingPatient}
                          className="btn-primary inline-flex items-center gap-1.5 text-sm"
                        >
                          {creatingPatient ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          Create Patient
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewPatient(false); setNewPatient(EMPTY_NEW_PATIENT); }}
                          className="btn-ghost text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Lead Details ───────────────────────────────────────── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    Lead Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">

                    {/* Appointment Date */}
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Appt. Date <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                      <input
                        type="date"
                        value={form.appointment_date}
                        onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                        className="input-field mt-1.5 w-full"
                      />
                    </div>

                    {/* Appointment Time */}
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Appt. Time <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                      <select
                        value={form.appointment_time}
                        onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                        className="input-field mt-1.5 w-full"
                      >
                        <option value="">No time</option>
                        {TIMES.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                      </select>
                    </div>

                    {/* Hot Lead dropdown */}
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Is Hot Lead?</label>
                      <select
                        value={form.hot_lead ? 'true' : 'false'}
                        onChange={e => setForm(f => ({ ...f, hot_lead: e.target.value === 'true' }))}
                        className="input-field mt-1.5 w-full"
                      >
                        <option value="true">🔥 Yes — Hot Lead</option>
                        <option value="false">No — Regular Lead</option>
                      </select>
                    </div>

                    {/* Booked Against */}
                    <div className="col-span-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Booked Against</label>
                      <select
                        value={form.booked_against}
                        onChange={e => setForm(f => ({ ...f, booked_against: e.target.value }))}
                        className="input-field mt-1.5 w-full"
                      >
                        <option value="">Select doctor</option>
                        {doctors.map(d => <option key={d.id} value={d.doctor_name}>{d.doctor_name}</option>)}
                      </select>
                    </div>

                    {/* Concern */}
                    <div className="col-span-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Concern <span className="text-red-500">*</span></label>
                      <textarea
                        value={form.concern}
                        onChange={e => setForm(f => ({ ...f, concern: e.target.value }))}
                        rows={3}
                        placeholder="Describe the patient's concern"
                        className="input-field mt-1.5 w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost w-full sm:w-auto">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!patientConfirmed && !showNewPatient)}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingLeadId !== null ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
