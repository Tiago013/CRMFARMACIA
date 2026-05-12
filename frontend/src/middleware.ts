import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  
  // Note: We'll need to read the JWT token from cookies here later.
  // For now, since Zustand uses localStorage by default which we can't access in edge middleware,
  // we either switch Zustand to use cookies or use a server-side cookie check.
  // Let's assume we have an 'auth_token' cookie for the MVP logic.
  const hasToken = request.cookies.has('auth_token');

  // If going to login page and already logged in, redirect to dashboard
  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If going to a protected route and not logged in, redirect to login
  // TEMPORARILY DISABLED FOR LOCAL DEMO
  // if (!isAuthPage && !hasToken && request.nextUrl.pathname.startsWith('/dashboard')) {
  //  return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
