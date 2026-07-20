'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MapPin, Heart, AlertCircle, Loader2, User, MessageCircle
} from 'lucide-react';

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
}

interface ChatRow {
  id: number;
  message: { type: 'human' | 'ai'; content: string };
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function renderMarkdown(text: string) {
  // Bold, italic, then line breaks
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
  return html;
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`);
        const data = await res.json();
        if (res.ok) setPatient(data.data.patient);
      } catch { console.error('Failed to fetch patient'); }
      finally { setLoading(false); }
    }
    fetchPatient();
  }, [id]);

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch(`/api/patients/${id}/chats`);
        const data = await res.json();
        if (res.ok) setChats(data.data || []);
      } catch { console.error('Failed to fetch chats'); }
      finally { setChatsLoading(false); }
    }
    fetchChats();
  }, [id]);

  // Scroll to latest message once chats load
  useEffect(() => {
    if (!chatsLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [chatsLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Patient not found</p>
        <Link href="/patients" className="btn-secondary mt-4 inline-flex">Back to patients</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={15} />
        Back to Patients
      </Link>

      {/* Patient header card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-semibold flex-shrink-0"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            {getInitials(patient.full_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  {patient.full_name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="badge badge-neutral">UHID #{patient.patient_uhid}</span>
                  {patient.gender && (
                    <span className="badge badge-neutral capitalize">{patient.gender}</span>
                  )}
                  {patient.blood_group && (
                    <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                      <Heart size={10} className="mr-1" />
                      {patient.blood_group}
                    </span>
                  )}
                </div>
                {patient.age_dob && (
                  <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    {patient.age_dob}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mt-6 pt-6"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          {patient.whatsapp_no && (
            <div className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>WhatsApp</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.whatsapp_no}</p>
              </div>
            </div>
          )}
          {patient.phone_no && (
            <div className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Phone</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.phone_no}</p>
              </div>
            </div>
          )}
          {patient.email && (
            <div className="flex items-start gap-2">
              <Mail size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.email}</p>
              </div>
            </div>
          )}
          {patient.relation && (
            <div className="flex items-start gap-2">
              <User size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Relation</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.relation}</p>
              </div>
            </div>
          )}
          {patient.marital_status && (
            <div className="flex items-start gap-2">
              <Heart size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Marital Status</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.marital_status}</p>
              </div>
            </div>
          )}
          {patient.preferred_language && (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Preferred Language</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.preferred_language}</p>
              </div>
            </div>
          )}
          {patient.address && (
            <div className="flex items-start gap-2 md:col-span-3">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Address</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Chat */}
      <div className="card p-0 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ background: '#075E54', color: '#fff' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: '#128C7E' }}>
            {getInitials(patient.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{patient.full_name}</p>
            <p className="text-xs opacity-75">
              {patient.whatsapp_no ? `+${patient.whatsapp_no}` : 'No WhatsApp number'}
            </p>
          </div>
          <MessageCircle size={18} className="opacity-75 flex-shrink-0" />
        </div>

        {/* Messages */}
        <div
          className="flex flex-col gap-2 p-4 overflow-y-auto"
          style={{ height: '520px', background: '#E5DDD5' }}
        >
          {chatsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin" style={{ color: '#075E54' }} />
            </div>
          ) : !patient.whatsapp_no ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: '#666' }}>No WhatsApp number on record</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: '#666' }}>No conversation history found</p>
            </div>
          ) : (
            chats.map((chat) => {
              const isHuman = chat.message.type === 'human';
              return (
                <div key={chat.id} className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[75%] px-3 py-2 text-sm shadow-sm"
                    style={{
                      background: isHuman ? '#DCF8C6' : '#FFFFFF',
                      color: '#111',
                      borderRadius: isHuman
                        ? '12px 0px 12px 12px'
                        : '0px 12px 12px 12px',
                      lineHeight: '1.5',
                    }}
                  >
                    {!isHuman && (
                      <p className="text-xs font-semibold mb-1" style={{ color: '#075E54' }}>
                        Hospital AI Assistant
                      </p>
                    )}
                    {isHuman ? (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{chat.message.content}</p>
                    ) : (
                      <div
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(chat.message.content) }}
                        style={{ whiteSpace: 'pre-wrap' }}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}
