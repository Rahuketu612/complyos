/**
 * COMPLYOS Route Protection Middleware
 * 
 * Protects authenticated routes and redirects unauthenticated users.
 * - Public routes: /login, /register, /forgot-password, /reset-password, /api (health)
 * - Authenticated routes: All /app/* and /api/* routes except health
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/health',
  '/api/auth/session',
];

// Auth callback URLs (after login redirect)
const AUTH_REDIRECT_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookies = request.cookies;
  
  // Check if route is public
  const isPublicRoute =
    pathname === '/' || PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  
  // Get auth state from session cookie (set by login/logout actions)
  const sessionCookie = cookies.get('complyos-session');
  let isAuthenticated = false;
  
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      isAuthenticated = session.authenticated === true;
    } catch {
      isAuthenticated = false;
    }
  }
  
  // If route is public and user is authenticated, redirect to dashboard
  if (isPublicRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  // If route requires auth but user is not authenticated
  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Add return URL for post-login redirect
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
