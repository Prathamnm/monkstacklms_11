import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/unauthorized']

// NOTE: Full role-based route enforcement for page routes is handled client-side
// in (dashboard)/layout.tsx using MSAL auth state (tokens are not accessible
// in Next.js Edge middleware without a session cookie).
// Server-side enforcement at the API route level is done in each API route
// handler via validateToken() + requireRole().

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Allow unauthenticated runtime auth bootstrap config.
  if (pathname === '/api/auth/msal-config') {
    return NextResponse.next()
  }
  if (pathname === '/api/auth/callback/azure-ad') {
    return NextResponse.next()
  }
  if (pathname === '/api/health/ready' || pathname === '/api/health/live') {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For protected API routes: require Bearer token header (format check only;
  // full JWT validation happens inside each API route handler via validateToken())
  if (pathname.startsWith('/api/')) {
    if (
      pathname === '/api/admin/users/sync' &&
      request.headers.get('x-sync-secret')
    ) {
      return NextResponse.next()
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Redirect bare root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // All other page routes (dashboard routes) — allow through.
  // Client-side auth guard in (dashboard)/layout.tsx handles authentication
  // and role-based redirection for page routes.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}
