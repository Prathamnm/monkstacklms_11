import type { Configuration, RedirectRequest } from '@azure/msal-browser'

type MsalRuntimeEnv = {
  clientId?: string
  tenantId?: string
}

function normalizeEnv(value: string | undefined): string {
  const normalized = value?.trim() ?? ''
  if (!normalized || normalized.toLowerCase() === 'undefined') {
    return ''
  }
  return normalized
}

function resolveClientId(runtimeEnv?: MsalRuntimeEnv): string {
  return normalizeEnv(runtimeEnv?.clientId) || normalizeEnv(process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID)
}

function resolveTenantId(runtimeEnv?: MsalRuntimeEnv): string {
  return normalizeEnv(runtimeEnv?.tenantId) || normalizeEnv(process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID)
}

/**
 * OAuth redirect must land on a URL that runs `handleRedirectPromise()` (see /auth/callback).
 * Bare origins (e.g. http://localhost:3000) are normalized to /auth/callback so the auth
 * response is not lost and middleware does not strip the flow.
 */
export function resolveRedirectUri(): string {
  const raw = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI?.trim() ?? ''
  if (raw) {
    try {
      const url = new URL(raw)
      if (url.pathname === '/' || url.pathname === '') {
        return `${url.origin}/auth/callback`
      }
      return raw.replace(/\/$/, '')
    } catch {
      return raw
    }
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return 'http://localhost:3000/auth/callback'
}

export function resolvePostLogoutRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`
  }
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return `${origin}/login`
}

export function getMsalConfiguration(runtimeEnv?: MsalRuntimeEnv): Configuration {
  const clientId = resolveClientId(runtimeEnv)
  const tenantId = resolveTenantId(runtimeEnv)
  if (!clientId || !tenantId) {
    throw new Error('Missing Azure AD configuration. Set AZURE_AD_CLIENT_ID and AZURE_AD_TENANT_ID.')
  }

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: resolveRedirectUri(),
      postLogoutRedirectUri: resolvePostLogoutRedirectUri(),
      // Redirect URI (/auth/callback) differs from the page that starts login (/login). Leaving this
      // true makes MSAL navigate after the code exchange and can trigger AADSTS900561 / broken flows in SPAs.
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true,  // Required for redirect flow in Safari/Firefox private mode
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return
          if (process.env.NODE_ENV === 'development') {
            console.log(`[MSAL] ${message}`)
          }
        },
      },
    },
  }
}

// Keep scopes minimal for sign-in. Group-based roles are resolved on the server with app-only Graph.
export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'offline_access'],
}

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphGroupsEndpoint: 'https://graph.microsoft.com/v1.0/me/memberOf',
}
