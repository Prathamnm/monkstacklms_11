'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl mb-6">🔒</div>
        <h1 className="text-white text-3xl font-bold mb-3">Access Denied</h1>
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          You don&apos;t have permission to access this page. Please contact your administrator if
          you believe this is an error.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="bg-white/10 text-white border border-white/20 rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-white/20 transition-all"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-all"
          >
            Sign In Again
          </button>
        </div>
      </motion.div>
    </div>
  )
}
