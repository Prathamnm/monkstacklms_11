'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HRMyLeavesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/hr/leave?tab=requests')
  }, [router])
  
  return null
}
