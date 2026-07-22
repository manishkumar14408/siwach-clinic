import Image from 'next/image';
import { PATIENT_PHOTOS } from '@/lib/patientPhotos';

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

interface PatientAvatarProps {
  uhid: number;
  name: string;
  size?: number;
  shape?: 'circle' | 'square';
  bg?: string;
  fg?: string;
  ring?: boolean;
  className?: string;
}

export default function PatientAvatar({
  uhid,
  name,
  size = 36,
  shape = 'circle',
  bg = 'var(--color-primary-light)',
  fg = 'var(--color-primary-dark)',
  ring = false,
  className = '',
}: PatientAvatarProps) {
  const photo = PATIENT_PHOTOS[uhid];
  const radius = shape === 'circle' ? '9999px' : `${Math.round(size * 0.28)}px`;
  const ringShadow = ring
    ? `0 0 0 3px var(--color-surface), 0 0 0 4.5px var(--color-border-strong)`
    : undefined;

  if (photo) {
    return (
      <div
        className={`relative overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size, borderRadius: radius, boxShadow: ringShadow }}
      >
        <Image src={photo} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.38),
        boxShadow: ringShadow,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
