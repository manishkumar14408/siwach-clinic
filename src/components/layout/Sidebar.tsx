'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Calendar, Stethoscope,
  LogOut, Menu, X, ChevronRight, Flame, HelpCircle
} from 'lucide-react';
import { hasPermission, type Permission } from '@/lib/permissions';

interface SidebarProps {
  user: { name: string; role: string; email: string };
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard:view' as Permission },
  { href: '/patients', icon: Users, label: 'Patients', permission: 'patients:view' as Permission },
  { href: '/appointments', icon: Calendar, label: 'Appointments', permission: 'appointments:view' as Permission },
  { href: '/hot-leads', icon: Flame, label: 'Hot Leads', permission: 'leads:view' as Permission },
  { href: '/faq', icon: HelpCircle, label: 'FAQ', permission: 'faq:view' as Permission },
  { href: '/health-tips', icon: Stethoscope, label: 'Health Tips', permission: 'health_tips:view' as Permission },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const navItems = NAV_ITEMS.filter(({ permission }) => hasPermission(user.role, permission));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-primary)', color: 'white' }}>
            <Stethoscope size={18} />
          </div>
          <div>
            <p className="font-display font-semibold text-sm leading-tight" style={{ color: 'var(--color-text)' }}>
              Siwach Sanjeevani
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Orthopaedic Clinic</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium px-3 mb-3" style={{ color: 'var(--color-text-light)' }}>
          NAVIGATION
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: isActive ? 'var(--color-primary-light)' : 'transparent',
                color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
              }}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: 'var(--color-primary)', color: 'white' }}>
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{user.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-light)' }}
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0"
        style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} />
          <span className="font-display font-semibold text-sm">Siwach Sanjeevani</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg"
          style={{ color: 'var(--color-text)' }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col animate-slide-in-right"
            style={{ background: 'var(--color-surface)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
