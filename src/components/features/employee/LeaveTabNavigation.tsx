'use client'

import { cn } from '@/lib/utils/cn'

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: 'apply' | 'requests') => void
  pendingCount: number
}

export function LeaveTabNavigation({ activeTab, onTabChange, pendingCount }: TabNavigationProps) {
  const tabs = [
    { id: 'apply', label: 'Apply for Leave' },
    { id: 'requests', label: 'My Requests' }
  ]

  return (
    <div className="flex gap-4 mb-2 border-b border-[var(--color-card-border)] pb-4 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border",
              isActive 
                ? "bg-slate-800 text-white shadow-lg shadow-slate-200 border-slate-700" 
                : "bg-white text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {tab.id === 'requests' && pendingCount > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold",
                isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
              )}>
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
