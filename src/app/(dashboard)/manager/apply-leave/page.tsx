'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerApplyLeaveRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/manager/leave')
  }, [router])
  
  return null
}
