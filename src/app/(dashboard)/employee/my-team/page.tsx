'use client'

import { motion } from 'framer-motion'
import { Users, CalendarOff, UserPlus } from 'lucide-react'
import { PageSkeleton, TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatCard } from '@/components/shared/StatCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory'
import { EmployeeTable } from '@/components/features/employee/EmployeeTable'

export default function TeamMonkstackPage() {
  const { 
    filteredEmployees, 
    stats, 
    isLoading, 
    isError, 
    isFetching, 
    search, 
    setSearch, 
    retry 
  } = useEmployeeDirectory()

  if (isLoading) return <PageSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="p-6 md:p-8 bg-[var(--color-page-bg)] min-h-screen flex flex-col gap-6"
    >
      <header className="space-y-6">
        <PageHeader 
          title="Team Monkstack" 
          description="Directory of all team members and their current status"
        />

        <SearchInput 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role..."
          aria-label="Search team members"
        />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard 
          label="Total members"
          value={stats.total}
          icon={<Users size={18} className="text-blue-600" />}
          color="bg-blue-500"
        />
        <StatCard 
          label="On leave today"
          value={stats.onLeaveToday}
          icon={<CalendarOff size={18} className="text-red-600" />}
          color="bg-red-500"
        />
        <StatCard 
          label="Available Today"
          value={stats.availableToday}
          icon={<UserPlus size={18} className="text-green-600" />}
          color="bg-green-500"
        />
      </section>

      <main>
        {isError ? (
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-16 text-center">
            <p className="text-base font-semibold text-[var(--color-heading)] mb-2">Could not load team</p>
            <p className="text-sm text-[var(--color-muted)] mb-6">Directory query failed</p>
            <button
              type="button"
              disabled={isFetching}
              onClick={retry}
              className="px-6 py-2 border border-[var(--color-card-border)] rounded-lg text-sm font-medium text-[var(--color-heading)] hover:bg-[var(--color-page-bg)] disabled:opacity-50 transition-all"
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl p-12 text-center">
            <p className="text-base font-medium text-[var(--color-heading)]">
              {search ? 'No matches found' : 'No employees found'}
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-2">
              {search ? 'Try a different search term.' : 'The directory is empty.'}
            </p>
          </div>
        ) : (
          <EmployeeTable employees={filteredEmployees} />
        )}
      </main>
    </motion.div>
  )
}
