'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import type { CurrentUser } from '@/types/auth'

interface DashboardLayoutProps {
  user: CurrentUser
  children: React.ReactNode
  pendingCount?: number
}

export function DashboardLayout({ user, children, pendingCount = 0 }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingCount={pendingCount}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopHeader
          user={user}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          collapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
