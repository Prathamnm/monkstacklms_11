'use client'

import type { IPublicClientApplication } from '@azure/msal-browser'
import { InteractionRequiredAuthError, BrowserAuthError } from '@azure/msal-browser'
import { loginRequest } from './msalConfig'

type GetAccessTokenOptions = {
  /** Use when retrying after a 401 / stale session to obtain a fresh ID token. */
  forceRefresh?: boolean
}

export async function getAccessToken(
  instance: IPublicClientApplication,
  options?: GetAccessTokenOptions
): Promise<string | null> {
  const redirectUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined

  const accounts = instance.getAllAccounts()
  if (accounts.length === 0) {
    console.warn('[MSAL] No accounts found - user not authenticated')
    return null
  }

  try {
    // Attempt silent token acquisition first (uses refresh token / cache)
    const result = await instance.acquireTokenSilent({
      ...loginRequest,
      redirectUri,
      account: accounts[0],
      forceRefresh: Boolean(options?.forceRefresh),
    })
    // Our API routes use validateToken() with audience = Entra app client ID. That matches the
    // ID token, not the Microsoft Graph access token (aud = Graph resource).
    if (result.idToken) {
      return result.idToken
    }
    return result.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Silent acquisition failed because user interaction is required
      // (e.g. token expired, MFA required, consent needed)
      // Trigger redirect - this navigates the browser away, returns void
      try {
        await instance.acquireTokenRedirect({
          ...loginRequest,
          redirectUri,
          account: accounts[0],
        })
        // Code after this line will not execute - browser is redirecting
        return null
      } catch (redirectErr) {
        // interaction_in_progress: another redirect is already happening - do nothing
        if (
          redirectErr instanceof BrowserAuthError &&
          redirectErr.errorCode === 'interaction_in_progress'
        ) {
          console.warn('[MSAL] Interaction already in progress, skipping token redirect')
          return null
        }
        console.error('[MSAL] Failed to trigger token redirect:', redirectErr)
        return null
      }
    }

    console.error('[MSAL] Unexpected error acquiring token silently:', err)
    return null
  }
}
