'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { getDashboardPath } from '@/lib/utils/roleUtils'

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { inProgress } = useMsal()
  const router = useRouter()
  const pathname = usePathname()
  const { data, isLoading, isError } = useCurrentUser()

  useEffect(() => {
    // Wait for MSAL to finish any in-progress interaction before redirecting
    if (inProgress !== InteractionStatus.None) return

    if (isLoading) return

    if (isError || !data?.user) {
      router.replace('/login')
      return
    }

    // Role-based access enforcement:
    // If the user navigates directly to a URL that doesn't match their role,
    // redirect them to their correct dashboard
    const role = data.user.role
    const correctDashboard = getDashboardPath(role)

    const rolePrefixMap: Record<string, string[]> = {
      EMPLOYEE: ['/employee', '/profile'],
      MANAGER: ['/manager', '/profile'],
      HR: ['/hr', '/profile'],
      ADMIN: ['/admin', '/hr', '/manager', '/employee', '/profile'], // Admin can access all
    }

    const allowedPrefixes = rolePrefixMap[role] ?? []
    const isOnAllowedPath = allowedPrefixes.some((prefix) => pathname.startsWith(prefix))

    if (!isOnAllowedPath) {
      router.replace(correctDashboard)
    }
  }, [inProgress, isLoading, data, isError, router, pathname])

  // Show loading while MSAL is initializing or user data is being fetched
  if (inProgress !== InteractionStatus.None || isLoading) {
    return <PageSkeleton />
  }

  if (isError || !data?.user) {
    return <PageSkeleton /> // useEffect will redirect; show skeleton while it does
  }

  return (
    <DashboardLayout user={data.user}>
      {children}
    </DashboardLayout>
  )
}
