'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Loader2, X, CheckCircle2 } from 'lucide-react';

interface HealthTip {
  id: number;
  tip_text: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface HealthTipForm {
  tip_text: string;
  category: string;
  is_active: boolean;
}

const emptyForm: HealthTipForm = {
  tip_text: '',
  category: '',
  is_active: true,
};

export default function HealthTipsPage() {
  const [healthTips, setHealthTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<HealthTipForm>(emptyForm);
  const [editingTip, setEditingTip] = useState<HealthTip | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchHealthTips();
  }, []);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  async function fetchHealthTips() {
    setLoading(true);
    try {
      const res = await fetch('/api/health_tips');
      const data = await res.json();
      setHealthTips(data.data || []);
    } catch (error) {
      console.error('Failed to fetch health tips', error);
    } finally {
      setLoading(false);
    }
  }
 
  function openAddForm() {
    setEditingTip(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(tip: HealthTip) {
    setEditingTip(tip);
    setForm({
      tip_text: tip.tip_text,
      category: tip.category ?? '',
      is_active: tip.is_active,
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.tip_text.trim()) {
      setFormError('Health tip content is required.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        tip_text: form.tip_text.trim(),
        category: form.category.trim() || null,
        is_active: form.is_active,
      };

      const url = editingTip ? `/api/health_tips/${editingTip.id}` : '/api/health_tips';
      const method = editingTip ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Unable to save health tip.');
        return;
      }

      setActionMessage(editingTip ? 'Health tip updated successfully.' : 'Health tip added successfully.');
      setFormOpen(false);
      setEditingTip(null);
      setForm(emptyForm);
      fetchHealthTips();
    } catch (error) {
      console.error('Save health tip failed', error);
      setFormError('Unable to save health tip.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTip(tip: HealthTip) {
    const confirmed = window.confirm('Delete this health tip? This action cannot be undone.');
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/health_tips/${tip.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data.error || 'Unable to delete health tip.');
        return;
      }
      setActionMessage('Health tip deleted successfully.');
      fetchHealthTips();
    } catch (error) {
      console.error('Delete health tip failed', error);
      setActionMessage('Unable to delete health tip.');
    } finally {
      setSaving(false);
    }
  }

  function formatCreatedAt(value: string) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Health Tips
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Manage clinical advice snippets for broadcast or patient guidance.
          </p>
        </div>
        <button type="button" onClick={openAddForm} className="btn-primary">
          <Plus size={16} /> Add health tip
        </button>
      </div>

      {actionMessage && (
        <div className="card p-4" style={{ border: '1px solid var(--color-success-light)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
            <CheckCircle2 size={18} />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : healthTips.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>
              No health tips available yet.
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Use the Add button above to create a new tip.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-6">Tip</div>
              <div className="col-span-2 hidden sm:block">Category</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Created At</div>
              <div className="col-span-12 sm:col-span-12 md:col-span-12 lg:col-span-12" />
            </div>

            {healthTips.map((tip) => (
              <div key={tip.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]">
                <div className="col-span-6 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {tip.tip_text}
                  </p>
                </div>
                <div className="col-span-2 hidden sm:block">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {tip.category || 'General'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className={`badge ${tip.is_active ? 'badge-success' : 'badge-warning'}`}>
                    {tip.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="col-span-2 text-right text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {formatCreatedAt(tip.created_at)}
                </div>
                <div className="col-span-12 flex flex-wrap gap-2 sm:col-span-12 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditForm(tip)}
                    className="btn-secondary"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTip(tip)}
                    className="btn-secondary"
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full transition-colors"
              style={{ color: 'var(--color-text-light)' }}
              aria-label="Close form"
            >
              <X size={18} />
            </button>
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                {editingTip ? 'Edit health tip' : 'Add health tip'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Create or update advice snippets to keep your hospital guidance current.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--color-text)' }}>
                  Tip text
                </label>
                <textarea
                  value={form.tip_text}
                  onChange={(event) => setForm(prev => ({ ...prev, tip_text: event.target.value }))}
                  rows={4}
                  className="input-field"
                  placeholder="Type the health tip content here"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                    Category
                  </div>
                  <input
                    value={form.category}
                    onChange={(event) => setForm(prev => ({ ...prev, category: event.target.value }))}
                    placeholder="E.g. Nutrition, Exercise, Wellness"
                    className="input-field"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl p-4"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm(prev => ({ ...prev, is_active: event.target.checked }))}
                    className="h-4 w-4 rounded"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                    Active tip
                  </span>
                </label>
              </div>

              {formError && (
                <div className="rounded-2xl bg-[#fdecea] p-3 text-sm" style={{ color: 'var(--color-danger)' }}>
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
                  {saving ? 'Saving...' : editingTip ? 'Update tip' : 'Create tip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
