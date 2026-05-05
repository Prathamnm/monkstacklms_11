'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerMyLeavesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/manager/leave?tab=requests')
  }, [router])
  
  return null
}
