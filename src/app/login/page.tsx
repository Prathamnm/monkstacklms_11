'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { loginRequest } from '@/lib/auth/msalConfig'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  async function handleLogin() {
    try {
      await instance.loginRedirect(loginRequest)
    } catch (err) {
      console.error('[Login] Error:', err)
      toast.error('Failed to initiate sign-in. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#060b14]">
      {/* Left — form panel */}
      <div className="relative flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-24 lg:w-1/2 lg:max-w-none">
        <div className="absolute inset-0 bg-[#060b14]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1228] via-transparent to-transparent opacity-90" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-md"
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/20 hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Welcome to Monkstack
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-[15px]">
            Sign in with your Microsoft work account to open{' '}
            <span className="text-sky-400/90">Monkstack HRM</span>
          </p>

          <div className="mt-10">
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleLogin}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full py-3.5 pl-8 pr-8 text-[15px] font-semibold text-white shadow-[0_0_40px_-8px_rgba(124,58,237,0.55)] transition-shadow duration-300 hover:shadow-[0_0_48px_-6px_rgba(59,130,246,0.45)]"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#2563eb]"
                aria-hidden
              />
              <span
                className="absolute inset-0 bg-gradient-to-r from-[#6d28d9] via-[#8b5cf6] to-[#3b82f6] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 21 21" fill="none" aria-hidden>
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </span>
            </motion.button>
          </div>

          <p className="mt-10 text-xs leading-relaxed text-slate-600">
            Secured by Microsoft Entra ID · Monkstack HRM v1.0.0
          </p>
        </motion.div>
      </div>

      {/* Right — abstract ribbon art */}
      <div className="relative hidden min-h-[40vh] flex-1 lg:flex lg:min-h-screen">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-gradient-to-tl from-fuchsia-950/30 via-slate-950 to-blue-950/40" />

        <motion.div
          className="absolute -right-[20%] top-[15%] h-[45%] w-[120%] rounded-[100%] bg-gradient-to-r from-blue-600/25 via-violet-500/20 to-transparent blur-3xl"
          animate={{ opacity: [0.7, 1, 0.7], x: [0, 12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -left-[10%] bottom-[10%] h-[50%] w-[110%] rotate-[-8deg] rounded-[100%] bg-gradient-to-r from-transparent via-purple-500/30 to-cyan-400/20 blur-3xl"
          animate={{ opacity: [0.6, 0.95, 0.6], y: [0, -16, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-[5%] top-[35%] h-24 w-[90%] rotate-[12deg] rounded-full bg-gradient-to-r from-blue-400/35 via-fuchsia-500/25 to-indigo-600/20 blur-2xl"
          animate={{ scaleX: [1, 1.05, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.45) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#060b14]/80 lg:to-[#060b14]" />
      </div>
    </div>
  )
}
