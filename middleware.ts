import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'siwach_auth_token';

// Pages that only admin can visit. Everything else is open to all authenticated roles.
const ADMIN_ONLY = ['/dashboard', '/faq', '/health-tips'];

// Where each role lands when they have no access to the requested page.
const ROLE_DEFAULT: Record<string, string> = {
  admin: '/dashboard',
  receptionist: '/patients',
};

function decodeJwtRole(token: string): string | null {
  try {
    const b64 = token.split('.')[1];
    if (!b64) return null;
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  const role = decodeJwtRole(token);
  if (!role) return NextResponse.redirect(new URL('/login', req.url));

  const isAdminOnly = ADMIN_ONLY.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  if (isAdminOnly && role !== 'admin') {
    const fallback = ROLE_DEFAULT[role] ?? '/patients';
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patients/:path*',
    '/appointments/:path*',
    '/hot-leads/:path*',
    '/faq/:path*',
    '/health-tips/:path*',
  ],
};
