'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { motion } from 'framer-motion'
import { loginRequest } from '@/lib/auth/msalConfig'
import { clearClientAuthState } from '@/lib/auth/clientSession'
import toast from 'react-hot-toast'

function LoginContent() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    if (isAuthenticated && reason !== 'unauthorized') {
      router.replace('/auth/callback')
    }
  }, [isAuthenticated, router, reason])

  async function handleLogin() {
    try {
      clearClientAuthState()
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined
      await instance.loginRedirect({
        ...loginRequest,
        redirectUri,
      })
    } catch (err) {
      console.error('[Login] Error:', err)
      toast.error('Failed to initiate sign-in. Please try again.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060b14]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#060b14]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1228] via-transparent to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-tl from-fuchsia-950/20 via-slate-950 to-blue-950/30" />

        <motion.div
          className="absolute -right-[10%] top-[10%] h-[60%] w-[80%] rounded-[100%] bg-gradient-to-r from-blue-600/20 via-violet-500/15 to-transparent blur-3xl"
          animate={{ opacity: [0.5, 0.8, 0.5], x: [0, 20, 0], y: [0, 10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -left-[5%] bottom-[5%] h-[60%] w-[80%] rotate-[-8deg] rounded-[100%] bg-gradient-to-r from-transparent via-purple-500/20 to-cyan-400/15 blur-3xl"
          animate={{ opacity: [0.4, 0.7, 0.4], y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-[10%] top-[25%] h-32 w-[80%] rotate-[12deg] rounded-full bg-gradient-to-r from-blue-400/25 via-fuchsia-500/20 to-indigo-600/15 blur-2xl"
          animate={{ scaleX: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.45) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl px-8 py-12 text-center"
      >
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Welcome to Monkstack
        </h1>
        <p className="mt-6 text-base leading-relaxed text-slate-400 sm:text-lg">
          Sign in with your Microsoft work account to open{' '}
          <span className="text-sky-400/90 font-medium">Monkstack LMS</span>
        </p>

        <div className="mt-12">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            className="group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-full py-5 pl-10 pr-10 text-lg font-semibold text-white shadow-[0_0_50px_-10px_rgba(124,58,237,0.6)] transition-shadow duration-300 hover:shadow-[0_0_60px_-8px_rgba(59,130,246,0.5)]"
          >
            <span
              className="absolute inset-0 bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#2563eb]"
              aria-hidden
            />
            <span
              className="absolute inset-0 bg-gradient-to-r from-[#6d28d9] via-[#8b5cf6] to-[#3b82f6] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <span className="relative flex items-center gap-4">
              <svg className="h-7 w-7 shrink-0" viewBox="0 0 21 21" fill="none" aria-hidden>
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Sign in with Microsoft
            </span>
          </motion.button>
        </div>

        <p className="mt-12 text-sm leading-relaxed text-slate-600">
          Secured by Microsoft Entra ID · Monkstack HRM v1.0.0
        </p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060b14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
