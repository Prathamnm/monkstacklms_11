import { NextResponse } from 'next/server'

function normalizeEnv(value: string | undefined): string {
  const normalized = value?.trim() ?? ''
  if (!normalized || normalized.toLowerCase() === 'undefined') {
    return ''
  }
  return normalized
}

export async function GET() {
  const clientId =
    normalizeEnv(process.env.AZURE_AD_CLIENT_ID) || normalizeEnv(process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID)
  const tenantId =
    normalizeEnv(process.env.AZURE_AD_TENANT_ID) || normalizeEnv(process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID)

  if (!clientId || !tenantId) {
    return NextResponse.json(
      { error: 'Missing Azure AD configuration. Set AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID.' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  }

  return NextResponse.json(
    { clientId, tenantId },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}

