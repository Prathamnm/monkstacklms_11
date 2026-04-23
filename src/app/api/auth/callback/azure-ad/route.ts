import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Entra redirects here (registered redirect URI).
 * Forward query params to the client callback page where MSAL handles the code exchange.
 */
export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/auth/callback', request.url)
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })
  return NextResponse.redirect(redirectUrl)
}

