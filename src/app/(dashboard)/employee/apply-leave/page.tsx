'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EmployeeApplyLeaveRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/employee/leave')
  }, [router])
  
  return null
}
