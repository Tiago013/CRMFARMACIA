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
  if (!isAuthPage && !hasToken && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Basic RBAC from JWT payload
  if (hasToken && request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/finance') || request.nextUrl.pathname.startsWith('/saas')) {
    try {
      const token = request.cookies.get('auth_token')?.value || '';
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payloadStr = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadStr);
        const role = payload.role;

        const path = request.nextUrl.pathname;
        
        // Cajero can only access /sales and maybe /dashboard (limited)
        if (role === 'cajero') {
          const allowedCajeroPaths = ['/sales', '/dashboard'];
          if (!allowedCajeroPaths.some(p => path.startsWith(p))) {
            return NextResponse.redirect(new URL('/sales', request.url));
          }
        }
        
        // Regente cannot access /finance or /saas
        if (role === 'regente') {
          const restrictedRegentePaths = ['/finance', '/saas', '/billing'];
          if (restrictedRegentePaths.some(p => path.startsWith(p))) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        }
      }
    } catch (e) {
      // Ignore decoding errors, let backend handle invalid tokens
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/sales/:path*', '/finance/:path*', '/inventory/:path*', '/crm/:path*', '/saas/:path*', '/billing/:path*'],
};
