'use client'

import type { IPublicClientApplication } from '@azure/msal-browser'
import { InteractionRequiredAuthError } from '@azure/msal-browser'

export async function getGraphCalendarToken(
  instance: IPublicClientApplication
): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return null

  const accounts = instance.getAllAccounts()
  if (accounts.length === 0) return null

  try {
    const result = await instance.acquireTokenSilent({
      scopes: ['Calendars.Read'],
      account: accounts[0],
    })
    return result.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Calendars.Read was not consented during login — fallback gracefully
      console.warn('[calendar] Calendars.Read not consented — Outlook events will not show')
    }
    return null
  }
}
