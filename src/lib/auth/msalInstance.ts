'use client'

import { PublicClientApplication } from '@azure/msal-browser'
import { getMsalConfiguration } from './msalConfig'

// Singleton MSAL instance for client-side use
let msalInstance: PublicClientApplication | null = null

export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(getMsalConfiguration())
  }
  return msalInstance
}

export default getMsalInstance
