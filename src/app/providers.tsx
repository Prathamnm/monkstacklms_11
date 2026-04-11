'use client'

import { MsalProvider } from '@azure/msal-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { getMsalInstance } from '@/lib/auth/msalInstance'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  // getMsalInstance() returns the singleton — MsalProvider will call initialize() internally
  const msalInstance = getMsalInstance()

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
