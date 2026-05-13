'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMsal } from '@azure/msal-react'
import { getAccessToken } from '@/lib/auth/getAccessToken'
import type { EmployeeWithAvailability } from '@/types/employee'

export function useHREmployees() {
  const { instance } = useMsal()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: employees = [], isLoading } = useQuery<EmployeeWithAvailability[]>({
    queryKey: ['hrEmployees'],
    queryFn: async () => {
      const token = await getAccessToken(instance)
      const res = await fetch('/api/hr/employees', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load employees')
      return res.json()
    },
  })

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const hay = [e.displayName, e.workEmail, e.jobTitle, e.firstName, e.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, search])

  const toggleExpand = (id: string) => {
    setSelectedId(selectedId === id ? null : id)
  }

  return {
    employees,
    filteredEmployees,
    isLoading,
    search,
    setSearch,
    selectedId,
    toggleExpand,
  }
}
