'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Users, Phone, ChevronRight, ChevronLeft,
  Loader2, X, Plus, Edit3, CheckCircle2, XCircle,
} from 'lucide-react';
import PatientAvatar from '@/components/PatientAvatar';

interface Patient {
  patient_uhid: number;
  full_name: string;
  age_dob: string | null;
  gender: string | null;
  whatsapp_no: string | null;
  phone_no: string | null;
  email: string | null;
  blood_group: string | null;
  address: string | null;
  relation: string | null;
  marital_status: string | null;
  preferred_language: string | null;
  feedback_type: 'GFORM' | 'GREVIEW' | null;
  followup_sent: boolean;
}

interface PatientForm {
  full_name: string;
  age: string;
  gender: string;
  whatsapp_no: string;
  email: string;
  blood_group: string;
  address: string;
  relation: string;
  marital_status: string;
  preferred_language: string;
}

const EMPTY_FORM: PatientForm = {
  full_name: '',
  age: '',
  gender: '',
  whatsapp_no: '',
  email: '',
  blood_group: '',
  address: '',
  relation: '',
  marital_status: '',
  preferred_language: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

const avatarColors = [
  ['#e8f0eb', '#3a673a'], ['#fef4e8', '#9a5f1a'],
  ['#f0edf9', '#5a3f9a'], ['#e8f5f8', '#1a6d80'],
  ['#fdf0ee', '#9a2a1a'],
];

function FeedbackToggle({ patientId, value, followupSent, onChange }: { patientId: number; value: 'GFORM' | 'GREVIEW' | null; followupSent: boolean; onChange: (v: 'GFORM' | 'GREVIEW' | null) => void }) {
  const [saving, setSaving] = useState(false);

  async function select(type: 'GFORM' | 'GREVIEW') {
    const next = value === type ? null : type;
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_type: next }),
      });
      if (res.ok) onChange(next);
    } catch {
      console.error('Failed to update feedback type');
    } finally {
      setSaving(false);
    }
  }
console.log(followupSent, value, 'followupSent, value');
  return (
    <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
      {saving ? (
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-light)' }} />
      ) : (
        <>
          {(!followupSent || value === 'GREVIEW') && (
            <button
              disabled={followupSent}
              onClick={() => select('GREVIEW')}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: value === 'GREVIEW' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: value === 'GREVIEW' ? '#fff' : 'var(--color-text-muted)',
                border: '1px solid',
                borderColor: value === 'GREVIEW' ? 'var(--color-primary)' : 'var(--color-border)',
              }}
            >
              Google Map
            </button>
          )}
          {(!followupSent || value === 'GFORM') && (
            <button
              disabled={followupSent}
              onClick={() => select('GFORM')}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: value === 'GFORM' ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: value === 'GFORM' ? '#fff' : 'var(--color-text-muted)',
                border: '1px solid',
                borderColor: value === 'GFORM' ? 'var(--color-primary)' : 'var(--color-border)',
              }}
            >
              Google Form
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();
      setPatients(data.data || []);
      setTotal(data.meta?.total || 0);
      setPages(data.meta?.pages || 1);
    } catch {
      console.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => { setPage(1); }, [search]);

  function updateFeedbackType(patientUhid: number, value: 'GFORM' | 'GREVIEW' | null) {
    setPatients(prev => prev.map(p => p.patient_uhid === patientUhid ? { ...p, feedback_type: value } : p));
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(patient: Patient, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(patient.patient_uhid);
    setForm({
      full_name: patient.full_name,
      age: patient.age_dob || '',
      gender: patient.gender || '',
      whatsapp_no: patient.whatsapp_no || '',
      email: patient.email || '',
      blood_group: patient.blood_group || '',
      address: patient.address || '',
      relation: patient.relation || '',
      marital_status: patient.marital_status || '',
      preferred_language: patient.preferred_language || '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        age_dob: form.age ? String(parseInt(form.age, 10)) : null,
        gender: form.gender || null,
        whatsapp_no: form.whatsapp_no || null,
        phone_no: null,
        email: form.email || null,
        blood_group: form.blood_group || null,
        address: form.address || null,
        relation: form.relation || null,
        marital_status: form.marital_status || null,
        preferred_language: form.preferred_language || null,
      };

      const res = await fetch(
        editingId !== null ? `/api/patients/${editingId}` : '/api/patients',
        {
          method: editingId !== null ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save patient');
        return;
      }

      setShowForm(false);
      fetchPatients();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof PatientForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Patients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total} total patients registered
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-light)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or email..." className="input-field pl-11 pr-11" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{ color: 'var(--color-text-light)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Patient list */}
      <div className="card p-0 overflow-hidden">
        {/* Pagination bar */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} patients</p>
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
        ) : patients.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{search ? 'No patients found' : 'No patients yet'}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{search ? 'Try a different search term' : 'Add your first patient to get started'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-3">PATIENT</div>
              <div className="col-span-2 hidden sm:block">CONTACT</div>
              <div className="col-span-1 hidden md:block">UHID</div>
              <div className="col-span-3">GET FEEDBACK</div>
              <div className="col-span-1">FEEDBACK TRIGGERED</div>
              <div className="col-span-2" />
            </div>

            {patients.map((patient, i) => {
              const [bg, fg] = avatarColors[i % avatarColors.length];
              const contact = patient.whatsapp_no || patient.phone_no;

              return (
                <div key={patient.patient_uhid} className="group grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]">
                  {/* Patient */}
                  <Link href={`/patients/${patient.patient_uhid}`} className="col-span-3 flex items-center gap-3 min-w-0">
                    <PatientAvatar uhid={patient.patient_uhid} name={patient.full_name} size={36} bg={bg} fg={fg} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{patient.full_name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {[patient.age_dob, patient.gender, patient.blood_group].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </Link>

                  {/* Contact */}
                  <div className="col-span-2 hidden sm:flex items-center gap-1.5">
                    <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{contact || '—'}</span>
                  </div>

                  {/* UHID */}
                  <div className="col-span-1 hidden md:block">
                    <span className="badge badge-neutral">#{patient.patient_uhid}</span>
                  </div>

                  {/* Feedback toggle */}
                  <div className="col-span-3">
                    <FeedbackToggle
                      patientId={patient.patient_uhid}
                      value={patient.feedback_type}
                      followupSent={patient.followup_sent}
                      onChange={v => updateFeedbackType(patient.patient_uhid, v)}
                    /> 
                  </div>

                  <div className="col-span-1">
                    {patient.followup_sent ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
                    ) : (
                      <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <button
                      onClick={e => openEdit(patient, e)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Edit patient"
                    >
                      <Edit3 size={14} />
                    </button>
                    <Link href={`/patients/${patient.patient_uhid}`} className="p-1.5 rounded-lg">
                      <ChevronRight size={15} style={{ color: 'var(--color-text-light)' }} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingId !== null ? 'Edit Patient' : 'Add New Patient'}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {editingId !== null ? `Editing UHID #${editingId}` : 'Fill in the patient details below'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-[#f4f4f4]">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto px-6 py-5 space-y-4">
                {formError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                {/* Full name — full width */}
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => field('full_name', e.target.value)}
                    placeholder="Enter patient full name"
                    className="input-field mt-1.5 w-full"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Age</label>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={form.age}
                      onChange={e => field('age', e.target.value)}
                      placeholder="Years"
                      className="input-field mt-1.5 w-full"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Gender</label>
                    <select value={form.gender} onChange={e => field('gender', e.target.value)} className="input-field mt-1.5 w-full">
                      <option value="">Select gender</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Blood Group</label>
                    <select value={form.blood_group} onChange={e => field('blood_group', e.target.value)} className="input-field mt-1.5 w-full">
                      <option value="">Select blood group</option>
                      {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>WhatsApp No</label>
                    <input
                      type="text"
                      value={form.whatsapp_no}
                      onChange={e => field('whatsapp_no', e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="input-field mt-1.5 w-full"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => field('email', e.target.value)}
                      placeholder="patient@email.com"
                      className="input-field mt-1.5 w-full"
                    />
                  </div>

                  {/* Relation */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Relation</label>
                    <input
                      type="text"
                      value={form.relation}
                      onChange={e => field('relation', e.target.value)}
                      placeholder="e.g. Self, Spouse, Child"
                      className="input-field mt-1.5 w-full"
                    />
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Marital Status</label>
                    <select value={form.marital_status} onChange={e => field('marital_status', e.target.value)} className="input-field mt-1.5 w-full">
                      <option value="">Select status</option>
                      {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Preferred Language */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Preferred Language</label>
                    <input
                      type="text"
                      value={form.preferred_language}
                      onChange={e => field('preferred_language', e.target.value)}
                      placeholder="e.g. Hindi, English"
                      className="input-field mt-1.5 w-full"
                    />
                  </div>
                </div>

                {/* Address — full width */}
                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => field('address', e.target.value)}
                    placeholder="Patient address"
                    rows={2}
                    className="input-field mt-1.5 w-full resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost w-full sm:w-auto">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingId !== null ? 'Save Changes' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}