export type Role = 'admin' | 'receptionist';

export type Permission =
  | 'dashboard:view'
  | 'patients:view' | 'patients:create' | 'patients:update' | 'patients:delete'
  | 'appointments:view' | 'appointments:create' | 'appointments:update' | 'appointments:delete'
  | 'leads:view' | 'leads:create' | 'leads:update' | 'leads:delete'
  | 'faq:view' | 'faq:create' | 'faq:update' | 'faq:delete'
  | 'health_tips:view' | 'health_tips:create' | 'health_tips:update' | 'health_tips:delete';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'patients:view', 'patients:create', 'patients:update', 'patients:delete',
  'appointments:view', 'appointments:create', 'appointments:update', 'appointments:delete',
  'leads:view', 'leads:create', 'leads:update', 'leads:delete',
  'faq:view', 'faq:create', 'faq:update', 'faq:delete',
  'health_tips:view', 'health_tips:create', 'health_tips:update', 'health_tips:delete',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL_PERMISSIONS,
  receptionist: [
    'patients:view', 'patients:create', 'patients:update',
    'appointments:view', 'appointments:create', 'appointments:update',
    'leads:view', 'leads:create', 'leads:update',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  return Array.isArray(perms) && perms.includes(permission);
}

// Maps page path prefixes to the permission needed to visit them.
// Used by middleware (redirect) and sidebar (filter).
export const PAGE_PERMISSIONS: Array<{ path: string; permission: Permission }> = [
  { path: '/dashboard', permission: 'dashboard:view' },
  { path: '/patients', permission: 'patients:view' },
  { path: '/appointments', permission: 'appointments:view' },
  { path: '/hot-leads', permission: 'leads:view' },
  { path: '/faq', permission: 'faq:view' },
  { path: '/health-tips', permission: 'health_tips:view' },
];

// First page the role can access — used as the fallback redirect.
export function defaultPath(role: string): string {
  const entry = PAGE_PERMISSIONS.find(({ permission }) =>
    hasPermission(role, permission)
  );
  return entry?.path ?? '/login';
}
