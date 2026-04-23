'use client'

import { useEffect, useState } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { getMsalConfiguration } from '@/lib/auth/msalConfig'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function initMsal() {
      try {
        const res = await fetch('/api/auth/msal-config', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const message = typeof data?.error === 'string' ? data.error : 'Missing Azure AD configuration.'
          throw new Error(message)
        }

        const instance = new PublicClientApplication(
          getMsalConfiguration({
            clientId: typeof data?.clientId === 'string' ? data.clientId : undefined,
            tenantId: typeof data?.tenantId === 'string' ? data.tenantId : undefined,
          })
        )

        if (mounted) {
          setMsalInstance(instance)
          setInitError(null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize Microsoft sign-in.'
        console.error('[MSAL] Initialization failed:', err)
        if (mounted) {
          setInitError(message)
        }
      }
    }

    initMsal()
    return () => {
      mounted = false
    }
  }, [])

  if (!msalInstance) {
    return (
      <QueryClientProvider client={queryClient}>
        {initError ? (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
            <div className="max-w-lg rounded-lg border border-red-500/40 bg-slate-800 p-6 text-center">
              <h2 className="text-lg font-semibold text-red-300">Authentication configuration error</h2>
              <p className="mt-2 text-sm text-slate-300">{initError}</p>
              <p className="mt-2 text-xs text-slate-400">
                Set `AZURE_AD_CLIENT_ID` and `AZURE_AD_TENANT_ID`, then redeploy.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </QueryClientProvider>
    )
  }

  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#16A34A', secondary: '#F8FAFC' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#F8FAFC' },
            },
          }}
        />
      </QueryClientProvider>
    </MsalProvider>
  )
}
