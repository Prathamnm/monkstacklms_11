'use client'

import { useEffect, Suspense } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from '@/lib/auth/msalConfig'
import { clearClientAuthState } from '@/lib/auth/clientSession'
import toast from 'react-hot-toast'
import Lottie from 'lottie-react'
import animationData from '../../../public/animations/Log-White.json'

function LoginContent() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    // Avoid bouncing authenticated users back into callback when they landed here
    // due to sync/backend failure reasons from the callback page.
    if (isAuthenticated && !reason) {
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
    <div className="flex flex-col md:flex-row min-h-screen bg-black overflow-hidden">

      {/* LEFT SIDE — Lottie Animation + Tagline */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center gap-6 py-12">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: 350, height: 350 }}
        />
        <p className="text-white text-3xl tracking-tight">
          Imagination <span className="font-bold text-white">Engineered</span>
        </p>
      </div>

      {/* RIGHT SIDE — Login Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden ring-1 ring-white/10 w-full max-w-md">

          {/* Card Header */}
          <div className="px-8 pt-10 pb-2">
            <div className="mb-8">
              <Image
                src="/monkstack-logo.png"
                alt="Monkstack"
                width={196}
                height={56}
                priority
                className="h-14 w-auto object-contain object-left [filter:invert(1)] mix-blend-multiply"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome!</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sign in with your Microsoft work account to continue to Monkstack HRM.
            </p>
          </div>

          {/* Card Body */}
          <div className="px-8 pb-10 pt-4">
            <button
              type="button"
              onClick={handleLogin}
              className="group flex w-full items-center justify-center gap-3 rounded-lg bg-black py-3.5 pl-5 pr-5 text-base font-semibold text-white shadow-md ring-1 ring-black/80 transition-colors duration-200 hover:bg-zinc-900 hover:ring-zinc-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 21 21" fill="none" aria-hidden>
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Sign in with Microsoft
            </button>

            <p className="mt-6 text-center text-xs text-slate-500">
              Secured by Microsoft Entra ID
            </p>
          </div>

          {/* Card Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-8 py-3 text-center text-[11px] leading-snug text-slate-500">
            Need help? Contact Monkstack IT Service Desk.
          </div>

        </div>
      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="h-9 w-9 rounded-full border-2 border-zinc-700 border-t-zinc-200 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
