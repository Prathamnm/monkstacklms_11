'use client'

import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { loadEmployeeDirectory } from '@/lib/api/employeeDirectory'
import { startOfMonth } from 'date-fns'

export interface ApiEmployee {
  id: string
  displayName: string
  email: string
  role: 'EMPLOYEE' | 'MANAGER' | 'HR'
  jobTitle?: string | null
  profilePictureUrl?: string | null
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  availabilityStatus: 'AVAILABLE' | 'ON_LEAVE' | 'HALF_DAY_AM' | 'HALF_DAY_PM'
  createdAt?: string
}

export function useEmployeeDirectory() {
  const { instance } = useMsal()
  const [fetchAttempt, setFetchAttempt] = useState(0)
  const [search, setSearch] = useState('')

  const query = useQuery<ApiEmployee[]>({
    queryKey: ['allEmployees', fetchAttempt],
    queryFn: async () => {
      const rows = await loadEmployeeDirectory(instance, { forceRefresh: fetchAttempt > 0 })
      return rows as ApiEmployee[]
    },
    placeholderData: keepPreviousData,
  })

  const employees = query.data ?? []

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const hay = [e.displayName, e.email, e.jobTitle ?? '', e.role].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search])

  const stats = useMemo(() => {
    const onLeaveCount = employees.filter(
      (e) =>
        e.availabilityStatus === 'ON_LEAVE' ||
        e.availabilityStatus === 'HALF_DAY_AM' ||
        e.availabilityStatus === 'HALF_DAY_PM'
    ).length

    const thisMonthStart = startOfMonth(new Date()).toISOString()
    const joinedThisMonth = employees.filter((e) => e.createdAt && e.createdAt >= thisMonthStart).length
    const availableCount = employees.filter(e => e.availabilityStatus === 'AVAILABLE').length

    return {
      total: employees.length,
      onLeaveToday: onLeaveCount,
      availableToday: availableCount,
      joinedThisMonth,
    }
  }, [employees])

  const retry = () => setFetchAttempt(prev => prev + 1)

  return {
    employees,
    filteredEmployees,
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    search,
    setSearch,
    retry,
  }
}
