'use client'

import { cn } from '@/lib/utils/cn'

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: 'apply' | 'requests') => void
  pendingCount: number
}

export function LeaveTabNavigation({ activeTab, onTabChange, pendingCount }: TabNavigationProps) {
  return (
    <div className="flex gap-4 mb-2 border-b border-[var(--color-card-border)] pb-4 overflow-x-auto no-scrollbar">
      <TabButton 
        active={activeTab === 'apply'} 
        onClick={() => onTabChange('apply')} 
        label="Apply for Leave" 
      />
      <TabButton 
        active={activeTab === 'requests'} 
        onClick={() => onTabChange('requests')} 
        label="My Requests" 
        badge={pendingCount > 0 ? pendingCount : undefined}
      />
    </div>
  )
}

function TabButton({ active, onClick, label, badge }: { active: boolean, onClick: () => void, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
          : "text-[var(--color-muted)] hover:bg-slate-50"
      )}
    >
      {label}
      {badge !== undefined && (
        <span className={cn(
          "px-2 py-0.5 rounded-lg text-[10px] font-bold",
          active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}
