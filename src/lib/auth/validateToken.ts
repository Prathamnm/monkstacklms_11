import { decodeJwt, jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'
import type { TokenPayload } from '@/types/auth'
import { prisma } from '@/lib/db/prisma'
import { removeEmployeeAndDependencies, userExistsInAzureTenant } from '@/lib/auth/azureTenantSync'

/** Server-side app id (must match the SPA registration). */
function resolveClientId(): string {
  const id = process.env.AZURE_AD_CLIENT_ID?.trim()
  if (!id) {
    console.error(
      '[auth] Missing AZURE_AD_CLIENT_ID. Add the Entra application (client) ID to .env.local.'
    )
    throw new Error('UNAUTHORIZED')
  }
  return id
}

function resolveFallbackTenantId(): string | null {
  return process.env.AZURE_AD_TENANT_ID?.trim() || null
}

function resolveAllowedTenantId(): string {
  const tenantId = resolveFallbackTenantId()
  if (!tenantId) {
    console.error('[auth] Missing allowed tenant ID (AZURE_AD_TENANT_ID).')
    throw new Error('UNAUTHORIZED')
  }
  return tenantId
}

const jwksByTenant = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function jwksForTenant(tenantId: string) {
  let jwks = jwksByTenant.get(tenantId)
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`)
    )
    jwksByTenant.set(tenantId, jwks)
  }
  return jwks
}

function isTrustedMicrosoftIssuer(iss: string, tenantId: string): boolean {
  try {
    const u = new URL(iss)
    if (u.hostname === 'login.microsoftonline.com') {
      const p = u.pathname.replace(/\/$/, '')
      return p === `/${tenantId}/v2.0`
    }
    if (u.hostname === 'sts.windows.net') {
      const p = u.pathname.replace(/\/$/, '')
      return p === `/${tenantId}`
    }
    return false
  } catch {
    return false
  }
}

/** Delegated Graph access token audiences (not the SPA client id). */
const GRAPH_ACCESS_TOKEN_AUDIENCES = [
  'https://graph.microsoft.com',
  'https://graph.microsoft.com/',
  '00000003-0000-0000-c000-000000000000',
] as const

const CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad'

function enforceTenantAndIdentityType(payload: JWTPayload, allowedTenantId: string): void {
  const tokenTid = typeof payload.tid === 'string' ? payload.tid : ''
  const idp = typeof payload.idp === 'string' ? payload.idp.toLowerCase() : ''
  const iss = typeof payload.iss === 'string' ? payload.iss.toLowerCase() : ''

  if (!tokenTid) {
    console.error('[auth] decision=rejected reason=missing_tid', {
      tokenTid,
      expectedTenantId: allowedTenantId,
      tokenIss: iss,
    })
    throw new Error('UNAUTHORIZED')
  }

  if (tokenTid !== allowedTenantId) {
    console.error('[auth] decision=rejected reason=tenant_mismatch', {
      tokenTid,
      expectedTenantId: allowedTenantId,
      tokenIss: iss,
    })
    throw new Error('UNAUTHORIZED')
  }

  const isMicrosoftAccount =
    tokenTid === CONSUMER_TENANT_ID ||
    idp.includes('live.com') ||
    iss.includes('/consumers/')

  if (isMicrosoftAccount) {
    console.error('[auth] decision=rejected reason=microsoft_account', {
      tokenTid,
      expectedTenantId: allowedTenantId,
      idp,
      iss,
    })
    throw new Error('UNAUTHORIZED')
  }

  console.log('[auth] decision=allowed reason=tenant_and_identity_verified', {
    tokenTid,
    expectedTenantId: allowedTenantId,
    tokenIss: iss,
    tokenIdp: idp || 'n/a',
  })
}

/**
 * Verify Entra-issued JWT using signing keys for the token's tenant (`tid`).
 * Accepts ID tokens (aud = client id) and Graph access tokens (aud = Graph).
 */
export async function verifyMicrosoftJwt(token: string): Promise<JWTPayload> {
  let decoded: JWTPayload
  try {
    decoded = decodeJwt(token)
  } catch (err) {
    console.error('[auth] JWT decode failed:', err)
    throw new Error('UNAUTHORIZED')
  }

  const iss = decoded.iss
  const tid = (decoded.tid as string) || resolveFallbackTenantId()
  const allowedTenantId = resolveAllowedTenantId()

  if (!iss || typeof iss !== 'string' || !tid) {
    console.error('[auth] Missing issuer or tenant ID in token. iss:', iss, 'tid:', tid)
    throw new Error('UNAUTHORIZED')
  }

  if (!isTrustedMicrosoftIssuer(iss, tid)) {
    console.error(
      '[auth] Rejected issuer. issuer from token:',
      iss,
      'tenant ID:',
      tid,
      '| Expected issuer format: https://login.microsoftonline.com/[tenantId]/v2.0'
    )
    throw new Error('UNAUTHORIZED')
  }

  const clientId = resolveClientId()
  const jwks = jwksForTenant(tid)

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: [iss, iss.replace(/\/$/, '')], // Accept with/without trailing slash
      audience: [clientId, `api://${clientId}`, ...GRAPH_ACCESS_TOKEN_AUDIENCES],
      clockTolerance: 120,
    })

    enforceTenantAndIdentityType(payload, allowedTenantId)

    return payload
  } catch (verifyErr) {
    console.error('[auth] JWT verification (JWKS signature check) failed:', {
      error: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
      issuer: iss,
      tenantId: tid,
      clientId,
      audience: [clientId, `api://${clientId}`, ...GRAPH_ACCESS_TOKEN_AUDIENCES],
      tokenKid: (decoded as any).header?.kid || 'no kid in header',
    })
    if (process.env.NODE_ENV === 'development') {
      console.error('[auth] Full verification error:', verifyErr)
    }
    throw new Error('UNAUTHORIZED')
  }
}

function extractIdentity(payload: JWTPayload): {
  entraObjectId: string
  email: string | undefined
} {
  const entraObjectId = (payload.oid ?? payload.sub) as string | undefined
  const email = (payload.preferred_username ??
    payload.upn ??
    payload.email ??
    payload.unique_name) as string | undefined
  return { entraObjectId: entraObjectId ?? '', email }
}

export type SyncIdTokenClaims = {
  entraObjectId: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  jobTitle?: string
}

function payloadToSyncClaims(payload: JWTPayload): SyncIdTokenClaims {
  const { entraObjectId, email } = extractIdentity(payload)
  if (!entraObjectId || !email) {
    throw new Error('UNAUTHORIZED')
  }
  
  const displayName = (payload.name as string) ?? email.split('@')[0]
  
  // Robust first/last name extraction
  let firstName = payload.given_name as string | undefined
  let lastName = payload.family_name as string | undefined
  
  if (!firstName || firstName.toLowerCase().startsWith('hr') || firstName.toLowerCase().startsWith('manager')) {
    // If first name is missing or looks like a placeholder, extract from displayName
    const parts = displayName.trim().split(/\s+/)
    firstName = parts[0] ? parts[0] : email.split('@')[0]
    lastName = parts.slice(1).join(' ') || ''
  }

  const jobTitle = payload.job_title as string | undefined
  return { 
    entraObjectId, 
    email, 
    displayName, 
    firstName: firstName || 'User', 
    lastName: lastName || '', 
    jobTitle 
  }
}

/** Used by /api/auth/sync — accepts verified ID or Graph delegated token. */
export async function verifyIdTokenFromRequest(req: NextRequest): Promise<SyncIdTokenClaims> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[auth] Missing or invalid Authorization header')
    throw new Error('UNAUTHORIZED')
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await verifyMicrosoftJwt(token)
    const claims = payloadToSyncClaims(payload)
    console.log(
      '[auth] verifyIdTokenFromRequest SUCCESS: user',
      claims.email,
      'oid:',
      claims.entraObjectId
    )
    return claims
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      console.error('[auth] verifyIdTokenFromRequest: JWT verification failed for Bearer token')
      throw err
    }
    console.error('[auth] verifyIdTokenFromRequest: Unexpected error converting token claims:', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error('UNAUTHORIZED')
  }
}

export async function validateToken(req: NextRequest): Promise<TokenPayload> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED')
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await verifyMicrosoftJwt(token)
    const { entraObjectId, email } = extractIdentity(payload)

    if (!entraObjectId) {
      throw new Error('UNAUTHORIZED')
    }

    const normalizedEmail = email?.trim().toLowerCase()
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { entraObjectId },
          ...(normalizedEmail ? [{ workEmail: { equals: normalizedEmail } }] : []),
        ],
      },
      select: { id: true, role: true, workEmail: true, entraObjectId: true },
    })

    if (!employee) {
      throw new Error('USER_NOT_SYNCED')
    }

    const existsInAzure = await userExistsInAzureTenant({
      entraObjectId: employee.entraObjectId,
      email: employee.workEmail,
    })
    if (!existsInAzure) {
      await removeEmployeeAndDependencies(employee.id)
      throw new Error('USER_REMOVED_FROM_TENANT')
    }

    return {
      userId: employee.id,
      role: employee.role as TokenPayload['role'],
      email: employee.workEmail || '',
      entraObjectId: employee.entraObjectId,
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === 'UNAUTHORIZED' ||
        err.message === 'USER_NOT_SYNCED' ||
        err.message === 'USER_REMOVED_FROM_TENANT')
    ) {
      throw err
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn('[auth] validateToken failed:', err)
    }
    throw new Error('UNAUTHORIZED')
  }
}

export function requireRole(
  tokenPayload: TokenPayload,
  allowedRoles: TokenPayload['role'][]
): void {
  if (!allowedRoles.includes(tokenPayload.role)) {
    throw new Error('FORBIDDEN')
  }
}
