'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { getDashboardPath } from '@/lib/utils/roleUtils'
import { clearClientAuthState } from '@/lib/auth/clientSession'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const { instance, inProgress } = useMsal()
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    // Wait for MSAL to finish initializing before processing redirect
    if (inProgress !== InteractionStatus.None && inProgress !== InteractionStatus.HandleRedirect) {
      return
    }

    if (handled.current) return
    handled.current = true

    async function handleCallback() {
      try {
        // handleRedirectPromise() processes the auth code from the URL hash/query
        // Returns the AuthenticationResult if a redirect just occurred, or null otherwise
        const response = await instance.handleRedirectPromise()

        if (!response) {
          // No redirect to handle — user navigated here directly or MSAL already processed it
          // Check if they're already authenticated
          const accounts = instance.getAllAccounts()
          if (accounts.length > 0) {
            // Already authenticated — go to root to resolve dashboard
            router.replace('/')
          } else {
            router.replace('/login')
          }
          return
        }

        // Use the ID token for verification (contains user identity claims)
        // Access tokens may not have all identity claims and will fail verification
        const idTokenForVerification = response.idToken
        if (!idTokenForVerification) {
          throw new Error('No ID token in auth response')
        }

        const tokenClaims = (response.idTokenClaims as Record<string, unknown> | undefined) ?? {}
        const tokenTenantId = (typeof tokenClaims.tid === 'string' ? tokenClaims.tid : '').trim()
        const tokenIdp = (typeof tokenClaims.idp === 'string' ? tokenClaims.idp : '').toLowerCase()
        const authority = instance.getConfiguration().auth.authority ?? ''
        const allowedTenantId = (
          authority.match(/login\.microsoftonline\.com\/([^/]+)/i)?.[1] ?? ''
        ).trim()
        const isMicrosoftAccount =
          tokenTenantId === '9188040d-6c67-4c5b-b112-36a304b66dad' || tokenIdp.includes('live.com')

        if (!tokenTenantId || !allowedTenantId || tokenTenantId !== allowedTenantId || isMicrosoftAccount) {
          throw new Error('Unauthorized tenant or account type')
        }

        // Use oid claim from ID token as the authoritative Entra Object ID
        const entraObjectId =
          (response.idTokenClaims as Record<string, string> | undefined)?.oid ??
          response.account?.localAccountId ??
          ''

        const email = response.account?.username ?? ''
        const displayName = response.account?.name ?? email
        const nameParts = displayName.split(' ')
        const firstName = nameParts[0] ?? ''
        const lastName = nameParts.slice(1).join(' ') ?? ''

        if (!entraObjectId || !email) {
          throw new Error('Missing required identity fields from Entra response')
        }

        // Sync user to DB — upserts employee record and resolves role from Entra groups
        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idTokenForVerification}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            entraObjectId,
            email,
            displayName,
            firstName,
            lastName,
          }),
        })

        if (!syncRes.ok) {
          const errorBody = await syncRes.json().catch(() => ({}))
          const errorCode = typeof errorBody.code === 'string' ? errorBody.code : `HTTP_${syncRes.status}`
          const errorMessage =
            typeof errorBody.error === 'string' ? errorBody.error : String(syncRes.status)
          throw new Error(`SYNC_FAILED:${syncRes.status}:${errorCode}:${errorMessage}`)
        }

        const { role } = await syncRes.json()

        if (!role) {
          throw new Error('Sync response missing role')
        }

        const dashboardPath = getDashboardPath(role)
        router.replace(dashboardPath)
      } catch (err) {
        console.error('[AuthCallback] Error during auth callback:', err)
        const message = err instanceof Error ? err.message : String(err)
        const isSyncFailed = message.startsWith('SYNC_FAILED:')
        const syncParts = isSyncFailed ? message.split(':') : []
        const syncStatus = isSyncFailed ? Number(syncParts[1] ?? '0') : 0
        const syncCode = isSyncFailed ? (syncParts[2] ?? '') : ''
        const shouldForceLogout =
          message.includes('Unauthorized tenant or account type') ||
          message.includes('SYNC_FAILED:UNAUTHORIZED') ||
          message.includes('SYNC_FAILED:USER_REMOVED_FROM_TENANT')
        const isBackendUnavailable =
          (isSyncFailed && syncStatus === 503) ||
          syncCode === 'DB_INIT_ERROR' ||
          syncCode === 'DB_UNREACHABLE' ||
          syncCode === 'DB_UNKNOWN_ERROR'

        if (shouldForceLogout) {
          // Ensure no stale MSAL session remains after tenant/account rejection.
          clearClientAuthState()
          // Do not await this redirect; when it fails it can keep this page in a spinner state.
          instance.logoutRedirect().catch(() => undefined)
          toast.error('Authentication failed. Please sign in with an authorized account.')
        } else if (isBackendUnavailable) {
          // Prevent redirect loops when sign-in succeeded but DB sync cannot complete.
          clearClientAuthState()
          instance.logoutRedirect().catch(() => undefined)
          toast.error('Sign-in succeeded, but the server database is unavailable. Please try again shortly.')
        } else if (message.startsWith('SYNC_FAILED:')) {
          toast.error('Sign-in completed, but server sync failed. Please check database connection and retry.')
        } else {
          toast.error('Authentication failed. Please try signing in again.')
        }
        router.replace('/login')
      }
    }

    handleCallback()
  }, [instance, inProgress, router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-2">Signing you in...</h2>
        <p className="text-slate-400 text-sm">Setting up your workspace</p>
      </div>
    </div>
  )
}
