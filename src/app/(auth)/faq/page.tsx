'use client';

import { useState, useEffect } from 'react';
import { Plus, HelpCircle, Loader2, Trash2, Edit3, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'Doctor & Hospital Information',
  'Orthopedics (Bones, Joints, Muscles)',
  'After Booking & Confirmation',
  'Fees, Billing & Payment (FAQ)',
  'Online vs In‑Hospital Consultation',
  'General',
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'General',
  });

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      let url = '/api/faq';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      setFaqs(data.data || []);
    } catch (err) {
      console.error('Fetch FAQs failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaqs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  function resetForm() {
    setEditingId(null);
    setForm({
      question: '',
      answer: '',
      category: 'General',
    });
    setFormError('');
  }

  function openForm() {
    resetForm();
    setShowForm(true);
  }

  function beginEdit(faq: FAQ) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'General',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.question.trim() || !form.answer.trim()) {
      setFormError('Question and answer are required.');
      return;
    }

    setSubmitting(true);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/faq/${editingId}` : '/api/faq';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: form.question,
          answer: form.answer,
          category: form.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save FAQ');
        return;
      }

      setShowForm(false);
      resetForm();
      fetchFaqs();
    } catch (err) {
      console.error('Save FAQ failed', err);
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this FAQ?')) return;
    try {
      const res = await fetch(`/api/faq/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete FAQ');
        return;
      }
      fetchFaqs();
    } catch (err) {
      console.error('Delete FAQ failed', err);
      alert('Unable to delete FAQ.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            FAQ
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Manage frequently asked questions and answers for patients
          </p>
        </div>
        <button onClick={openForm} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--color-text)' }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : faqs.length === 0 ? (
          <div className="card text-center py-16">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-primary)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>No FAQs found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Create a new FAQ to get started.</p>
          </div>
        ) : (
          faqs.map(faq => (
            <div key={faq.id} className="card p-5 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-base" style={{ color: 'var(--color-text)' }}>
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className="badge badge-neutral text-xs whitespace-nowrap">{faq.category}</span>
                    )}
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {faq.answer}
                  </p>
                  <div className="text-xs" style={{ color: 'var(--color-text-light)' }}>
                    Updated {format(new Date(faq.updated_at), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => beginEdit(faq)} className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="btn-ghost text-danger opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingId ? 'Edit FAQ' : 'New FAQ'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Add or update frequently asked questions
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-[#f4f4f4]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Question</label>
                <input
                  type="text"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="Enter FAQ question"
                  className="input-field mt-2 w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Answer</label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  className="input-field mt-2 h-40 w-full resize-none"
                  placeholder="Enter detailed answer"
                />
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="input-field mt-2 w-full"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="btn-ghost w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingId ? 'Save Changes' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
