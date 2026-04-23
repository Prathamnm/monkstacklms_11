import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function sanitizeHost(rawHost: string | null): string {
  return (rawHost ?? '').split(',')[0]?.trim() ?? ''
}

function sanitizeProto(rawProto: string | null): string {
  const normalized = (rawProto ?? '').split(',')[0]?.trim().toLowerCase()
  return normalized === 'http' || normalized === 'https' ? normalized : 'https'
}

function isInvalidPublicHost(host: string): boolean {
  return host.includes('0.0.0.0') || host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

function resolvePublicOrigin(request: NextRequest): string {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim() ?? ''
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin
    } catch {
      // Ignore malformed NEXTAUTH_URL and derive from request headers.
    }
  }

  const forwardedHost = sanitizeHost(request.headers.get('x-forwarded-host'))
  const forwardedProto = sanitizeProto(request.headers.get('x-forwarded-proto'))
  if (forwardedHost && !isInvalidPublicHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = sanitizeHost(request.headers.get('host'))
  const proto = sanitizeProto(request.headers.get('x-forwarded-proto'))
  if (host) {
    return `${proto}://${host}`
  }

  return request.nextUrl.origin
}

/**
 * Entra redirects here (registered redirect URI).
 * Forward query params to the client callback page where MSAL handles the code exchange.
 */
export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/auth/callback', resolvePublicOrigin(request))
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })
  return NextResponse.redirect(redirectUrl)
}
