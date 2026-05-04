'use client'

import { useMemo, useState, useEffect } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import {
  eachDayOfInterval,
  format,
  isSameDay,
  isWeekend,
  parseISO,
} from 'date-fns'
import type { PublicHoliday } from '@/types/holiday'
import type { LeaveRequest } from '@/types/leave'

interface DayOverride {
  date: string
  type: 'full' | 'half'
}

interface LeaveCalendarPickerProps {
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  month?: Date
  onMonthChange?: (date: Date) => void
  holidays: PublicHoliday[]
  existingLeaves: LeaveRequest[]
  dayOverrides?: DayOverride[]
  onDayOverrideChange?: (overrides: DayOverride[]) => void
  startHalfDay?: 'NONE' | 'HALF_DAY'
  endHalfDay?: 'NONE' | 'HALF_DAY'

  disabled?: [{ dayOfWeek: [0, 6] }]
  showOutsideDays?: boolean
  numberOfMonths?: number
  className?: string
}

export function LeaveCalendarPicker({
  selected,
  onSelect,
  month,
  onMonthChange,
  holidays,
  existingLeaves,
  dayOverrides = [],
  onDayOverrideChange,
  startHalfDay = 'NONE',
  endHalfDay = 'NONE',
  disabled = [{ dayOfWeek: [0, 6] }],

  showOutsideDays = true,
  numberOfMonths = 1,
  className = '',
}: LeaveCalendarPickerProps) {
  const [hoveredDayInfo, setHoveredDayInfo] = useState<string | null>(null)
  // Flag to prevent onSelect from changing range when toggling half-day
  const [isTogglingHalfDay, setIsTogglingHalfDay] = useState(false)

  // Clear day overrides when date range actually changes (not on every click)
  const [lastRangeKey, setLastRangeKey] = useState<string>('')
  
  useEffect(() => {
    const currentKey = `${selected?.from?.toISOString() || ''}-${selected?.to?.toISOString() || ''}`
    if (currentKey !== lastRangeKey && (selected?.from || selected?.to)) {
      setLastRangeKey(currentKey)
      onDayOverrideChange?.([])
    }
  }, [selected?.from, selected?.to, onDayOverrideChange, lastRangeKey])

  const publicHolidays = useMemo(
    () => holidays.filter((h) => h.type === 'PUBLIC').map((h) => parseISO(h.date)),
    [holidays]
  )
  
  const floaterHolidays = useMemo(
    () => holidays.filter((h) => h.type === 'FLOATER').map((h) => parseISO(h.date)),
    [holidays]
  )

  const pendingLeaveDays = useMemo(
    () =>
      existingLeaves
        .filter((l) => l.status === 'PENDING')
        .flatMap((l) =>
          eachDayOfInterval({ start: parseISO(l.startDate), end: parseISO(l.endDate) })
        ),
    [existingLeaves]
  )

  const approvedLeaveDays = useMemo(
    () =>
      existingLeaves
        .filter((l) => l.status === 'APPROVED')
        .flatMap((l) =>
          eachDayOfInterval({ start: parseISO(l.startDate), end: parseISO(l.endDate) })
        ),
    [existingLeaves]
  )

  const isDayHalfDay = (day: Date): boolean => {
    const dayStr = format(day, 'yyyy-MM-dd')
    if (dayOverrides.some((override) => override.date === dayStr && override.type === 'half')) return true
    if (startHalfDay === 'HALF_DAY' && selected?.from && isSameDay(day, selected.from)) return true
    if (endHalfDay === 'HALF_DAY' && selected?.to && isSameDay(day, selected.to)) return true
    return false
  }


  const handleDayClick = (date: Date, modifiers: any, e?: React.MouseEvent) => {
    if (modifiers.disabled || modifiers.outside) return

    const dow = date.getDay()
    if (dow === 0 || dow === 6) return // weekend — unchanged

    const dateStr = format(date, 'yyyy-MM-dd')

    if (selected?.from && selected?.to) {
      // Use string format for comparison — prevents timezone off-by-one bugs
      const s = format(
        selected.from <= selected.to ? selected.from : selected.to,
        'yyyy-MM-dd'
      )
      const e_fmt = format(
        selected.from <= selected.to ? selected.to : selected.from,
        'yyyy-MM-dd'
      )

      if (dateStr >= s && dateStr <= e_fmt) {
        // INSIDE range — toggle half day only, prevent DayPicker from changing range
        e?.preventDefault()
        e?.stopPropagation()
        
        // Set flag to prevent onSelect from changing the range
        setIsTogglingHalfDay(true)
        
        const newOverrides = [...dayOverrides]
        const existingIndex = newOverrides.findIndex((o) => o.date === dateStr)

        if (existingIndex >= 0) {
          newOverrides.splice(existingIndex, 1)
          console.log('removed half day:', dateStr)
        } else {
          newOverrides.push({ date: dateStr, type: 'half' })
          console.log('added half day:', dateStr)
        }

        onDayOverrideChange?.(newOverrides)
        return // ← MUST return to stop further processing
      }
    }

    // Outside range or no range — start new selection, clear overrides
    console.log('outside range, clearing overrides')
    onDayOverrideChange?.([])
  }

  // Calculate original business days count
  const originalCount = useMemo(() => {
    if (!selected?.from) return 0
    const end = selected.to || selected.from
    const days = eachDayOfInterval({ start: selected.from, end })
    return days.filter((day) => !isWeekend(day)).length
  }, [selected])

  // Calculate final totalDays with half-day adjustments
  const totalDays = useMemo(() => {
    if (originalCount === 0) return 0
    
    // Start/End half days (from props)
    const startAdjust = startHalfDay === 'HALF_DAY' ? 0.5 : 0
    const endAdjust = (!selected?.to || isSameDay(selected.from!, selected.to)) ? 0 : (endHalfDay === 'HALF_DAY' ? 0.5 : 0)
    
    // Inner half days (from overrides)
    const innerHalfCount = dayOverrides.filter(o => {
      const dStr = o.date
      const startStr = selected?.from ? format(selected.from, 'yyyy-MM-dd') : ''
      const endStr = selected?.to ? format(selected.to, 'yyyy-MM-dd') : ''
      return dStr !== startStr && dStr !== endStr && o.type === 'half'
    }).length

    const total = originalCount - startAdjust - endAdjust - (innerHalfCount * 0.5)
    return Math.max(0.5, total)
  }, [originalCount, startHalfDay, endHalfDay, dayOverrides, selected])

  // Wrapper for onSelect to prevent range changes when toggling half-day
  const handleSelect = (range: DateRange | undefined) => {
    if (isTogglingHalfDay) {
      // Reset flag and don't change range - half-day was toggled instead
      console.log('handleSelect: blocking range change due to half-day toggle')
      setIsTogglingHalfDay(false)
      return
    }
    console.log('handleSelect: allowing range change', range)
    onSelect?.(range)
  }

  return (
    <div className="leave-calendar-picker relative">
      <DayPicker
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        month={month}
        onMonthChange={onMonthChange}
        disabled={disabled}
        formatters={{
          formatWeekdayName: (date) => format(date, 'EEE'),
        }}
        showOutsideDays={showOutsideDays}
        numberOfMonths={numberOfMonths}
        onDayClick={handleDayClick}
        onDayMouseEnter={(day) => {
          const holiday = holidays.find((h) => isSameDay(parseISO(h.date), day))
          if (holiday) {
            setHoveredDayInfo(
              `${holiday.name} (${holiday.type === 'PUBLIC' ? 'Public Holiday' : 'Floater'})`
            )
            return
          }
          const pending = existingLeaves.find(
            (l) =>
              l.status === 'PENDING' &&
              day >= parseISO(l.startDate) &&
              day <= parseISO(l.endDate)
          )
          if (pending) {
            setHoveredDayInfo(`Pending: ${pending.title || 'Leave Request'}`)
            return
          }
          const approved = existingLeaves.find(
            (l) =>
              l.status === 'APPROVED' &&
              day >= parseISO(l.startDate) &&
              day <= parseISO(l.endDate)
          )
          if (approved) {
            setHoveredDayInfo(`Approved: ${approved.title || 'Leave Request'}`)
            return
          }
          setHoveredDayInfo(null)
        }}
        onDayMouseLeave={() => setHoveredDayInfo(null)}
        className={`!font-sans ${className}`}
        modifiers={{
          publicHoliday: publicHolidays,
          floaterHoliday: floaterHolidays,
          pendingLeave: pendingLeaveDays,
          approvedLeave: approvedLeaveDays,
          halfDay: (day) => {
            if (!selected?.from || !selected?.to) return false
            const dStr = format(day, 'yyyy-MM-dd')
            // Check overrides first (click-based, works for all dates including start/end)
            if (dayOverrides.some(o => o.date === dStr && o.type === 'half')) return true
            // Fallback to prop-based (from the sidebar radio buttons)
            const startStr = format(selected.from, 'yyyy-MM-dd')
            const endStr = format(selected.to, 'yyyy-MM-dd')
            if (dStr === startStr) return startHalfDay === 'HALF_DAY'
            if (dStr === endStr) return endHalfDay === 'HALF_DAY'
            return false
          },
          weekend: (day) => day.getDay() === 0 || day.getDay() === 6,
        }}
        modifiersStyles={{
          publicHoliday: {
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '50%',
            fontWeight: 700,
          },
          floaterHoliday: {
            backgroundColor: '#FEF9C3',
            color: '#854D0E',
            borderRadius: '50%',
            fontWeight: 700,
          },
          pendingLeave: {
            backgroundColor: '#FED7AA',
            color: '#9A3412',
            borderRadius: '50%',
          },
          approvedLeave: {
            backgroundColor: '#BBF7D0',
            color: '#15803D',
            borderRadius: '50%',
          },
          halfDay: {
            background: 'linear-gradient(90deg, #3b82f6 50%, #eff6ff 50%)',
            border: '1.5px solid #3b82f6',
            borderRadius: '50%',
            color: '#1d4ed8',
            position: 'relative',
            zIndex: 1,
          },
          weekend: {
            opacity: 0.35,
          }
        }}
        classNames={{
          day_selected: '!bg-blue-600 !text-white !rounded-full',
          day_range_middle: '!bg-blue-50 !text-blue-700',
          day_range_start: '!bg-blue-600 !text-white !rounded-l-full',
          day_range_end: '!bg-blue-600 !text-white !rounded-r-full',
          day_today: '!font-bold !text-blue-600',
          day_disabled: '!text-slate-300 !cursor-not-allowed',
        }}
        footer={
          selected?.from && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-slate-700 text-sm font-medium text-center">
                {selected.to && !isSameDay(selected.from, selected.to)
                  ? `${format(selected.from, 'MMM d')} – ${format(selected.to, 'MMM d, yyyy')} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`
                  : `${format(selected.from, 'MMMM d, yyyy')} · ${totalDays} day${totalDays !== 1 ? 's' : ''}`}
              </p>
              {dayOverrides.length > 0 && (
                <p className="text-blue-600 text-[11px] text-center mt-1">
                  Half days: {dayOverrides.map(d => format(parseISO(d.date), 'd MMM')).join(', ')}
                </p>
              )}
              {selected.to && !isSameDay(selected.from, selected.to) && (
                <p className="text-slate-400 text-[10px] text-center mt-2 italic">
                  Tip: Click any weekday within the range to toggle it as half-day
                </p>
              )}
            </div>
          )
        }
      />

      {hoveredDayInfo && (
        <div
          style={{
            background: '#1E293B',
            color: '#F8FAFC',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {hoveredDayInfo}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 12,
          fontSize: 11,
          color: 'var(--color-muted)',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#FEE2E2',
              marginRight: 4,
            }}
          />
          Public Holiday
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#FEF9C3',
              marginRight: 4,
            }}
          />
          Floater
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#BFDBFE',
              marginRight: 4,
            }}
          />
          Selected
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'linear-gradient(90deg, #378ADD 50%, #E6F1FB 50%)',
              border: '1.5px solid #378ADD',
              marginRight: 4,
            }}
          />
          Half Day
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#FED7AA',
              marginRight: 4,
            }}
          />
          Pending
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#BBF7D0',
              marginRight: 4,
            }}
          />
          Approved
        </span>
      </div>
    </div>
  )
}
