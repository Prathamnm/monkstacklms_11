'use client'

import { useMemo, useState, useEffect } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  eachDayOfInterval,
  format,
  isSameDay,
  isWeekend,
  parseISO,
} from 'date-fns'
import type { PublicHoliday } from '@/types/holiday'
import type { LeaveRequest, DayOverride } from '@/types/leave'

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

  // Clear day overrides ONLY when the range start changes (new selection)
  useEffect(() => {
    onDayOverrideChange?.([])
  }, [selected?.from, onDayOverrideChange])

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

  const handleDayToggle = (date: Date) => {
    if (isWeekend(date)) return
    const dateStr = format(date, 'yyyy-MM-dd')
    const isSelected = (selected?.from && selected?.to && date >= selected.from && date <= selected.to) ||
      (selected?.from && isSameDay(date, selected.from))

    if (!isSelected) return

    const newOverrides = [...dayOverrides]
    const existingIndex = newOverrides.findIndex((o) => o.date === dateStr)

    if (existingIndex >= 0) {
      newOverrides.splice(existingIndex, 1)
    } else {
      newOverrides.push({ date: dateStr, type: 'half' })
    }
    onDayOverrideChange?.(newOverrides)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    let dateStr = target.getAttribute('data-date') || target.closest('[data-date]')?.getAttribute('data-date')
    
    // If we clicked the button but not the inner span, look downwards
    if (!dateStr && target.querySelector) {
      dateStr = target.querySelector('[data-date]')?.getAttribute('data-date')
    }

    if (dateStr) {
      e.preventDefault()
      handleDayToggle(parseISO(dateStr))
    }
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
    if (originalCount === 0 || !selected?.from) return 0

    const startStr = format(selected.from, 'yyyy-MM-dd')
    const endStr = selected.to ? format(selected.to, 'yyyy-MM-dd') : startStr

    const halfDayDates = new Set<string>()
    if (startHalfDay === 'HALF_DAY') halfDayDates.add(startStr)
    if (endHalfDay === 'HALF_DAY' && selected.to && !isSameDay(selected.from, selected.to)) halfDayDates.add(endStr)
    dayOverrides.forEach(o => {
      if (o.type === 'half') halfDayDates.add(o.date)
    })

    const halfDayCount = Array.from(halfDayDates).filter(dStr => {
      const d = parseISO(dStr)
      const isInRange = d >= selected.from! && d <= (selected.to || selected.from!)
      return isInRange && !isWeekend(d)
    }).length

    const total = originalCount - (halfDayCount * 0.5)
    return Math.max(0.5, total)
  }, [originalCount, startHalfDay, endHalfDay, dayOverrides, selected])

  return (
    <div
      className="leave-calendar-picker relative"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '16px', 
        background: 'var(--color-card-bg)', 
        borderRadius: 12, 
        border: '1px solid var(--color-card-border)',
        width: '100%'
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="flex justify-center w-full">
        <DayPicker
          style={{ margin: '0 auto' }}
          mode="range"
          selected={selected}
          onSelect={onSelect}
          month={month}
          onMonthChange={onMonthChange}
          disabled={disabled}
          formatters={{
            formatWeekdayName: (date) => format(date, 'EEE'),
          }}
          showOutsideDays={showOutsideDays}
          numberOfMonths={numberOfMonths}
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
          components={{
            DayContent: ({ date }) => (
              <span 
                data-date={format(date, 'yyyy-MM-dd')} 
                className="w-full h-full flex items-center justify-center"
              >
                {date.getDate()}
              </span>
            )
          }}
          modifiers={{
            publicHoliday: publicHolidays,
            floaterHoliday: floaterHolidays,
            pendingLeave: pendingLeaveDays,
            approvedLeave: approvedLeaveDays,
            halfDay: (day) => {
              if (!selected?.from) return false
              const dStr = format(day, 'yyyy-MM-dd')
              if (dayOverrides.some(o => o.date === dStr && o.type === 'half')) return true
              const startStr = format(selected.from, 'yyyy-MM-dd')
              const endStr = selected.to ? format(selected.to, 'yyyy-MM-dd') : startStr
              if (dStr === startStr) return startHalfDay === 'HALF_DAY'
              if (selected.to && dStr === endStr) return endHalfDay === 'HALF_DAY'
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
            selected: {
              backgroundColor: '#2563eb',
              color: 'white',
            },
            range_start: {
              backgroundColor: '#2563eb',
              color: 'white',
            },
            range_end: {
              backgroundColor: '#2563eb',
              color: 'white',
            },
            halfDay: {
              background: 'linear-gradient(90deg, #3b82f6 50%, #ffffff 50%)',
              backgroundSize: '100% 100%',
              color: '#1d4ed8',
              border: '2px solid #3b82f6',
              borderRadius: '50%',
            },
            weekend: {
              opacity: 0.35,
            }
          }}
          classNames={{
            months: 'flex justify-center w-full',
            day_selected: '!rounded-full',
            day_range_middle: '!bg-blue-50 !text-blue-700',
            day_range_start: '!rounded-l-full',
            day_range_end: '!rounded-r-full',
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
                    Tip: Right-click any weekday within the range to toggle it as half-day
                  </p>
                )}
              </div>
            )
          }
        />
      </div>

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
          justifyContent: 'center',
          gap: 12,
          marginTop: 12,
          fontSize: 11,
          color: 'var(--color-muted)',
          width: '100%',
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
