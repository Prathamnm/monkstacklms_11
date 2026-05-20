'use client'

import { useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
} from 'date-fns'
import type { PublicHoliday } from '@/types/holiday'
import type { LeaveRequest, DayOverride } from '@/types/leave'

interface LeaveCalendarPickerProps {
  selected?: Date[]
  onSelect?: (dates: Date[]) => void
  month?: Date
  onMonthChange?: (date: Date) => void
  holidays: PublicHoliday[]
  existingLeaves: LeaveRequest[]
  dayOverrides: DayOverride[]
  onDayOverrideChange: (overrides: DayOverride[]) => void

  disabled?: [{ dayOfWeek: [0, 6] }]
  showOutsideDays?: boolean
  numberOfMonths?: number
  className?: string
}

export function LeaveCalendarPicker({
  selected = [],
  onSelect,
  month,
  onMonthChange,
  holidays,
  existingLeaves,
  dayOverrides = [],
  onDayOverrideChange,
  disabled = [{ dayOfWeek: [0, 6] }],

  showOutsideDays = true,
  numberOfMonths = 1,
  className = '',
}: LeaveCalendarPickerProps) {
  const [hoveredDayInfo, setHoveredDayInfo] = useState<string | null>(null)

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

  const handleDaySelect = (dates: Date[] | undefined) => {
    if (!dates) {
      onSelect?.([])
      onDayOverrideChange([])
      return
    }

    onSelect?.(dates)
    
    // Sync dayOverrides: remove overrides for deselected dates, add full for new ones
    const dateStrs = dates.map(d => format(d, 'yyyy-MM-dd'))
    const newOverrides = dayOverrides.filter(o => dateStrs.includes(o.date))
    
    dateStrs.forEach(dStr => {
      if (!newOverrides.some(o => o.date === dStr)) {
        newOverrides.push({ date: dStr, type: 'full' })
      }
    })
    
    onDayOverrideChange(newOverrides)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const target = e.target as HTMLElement
    const dateStr = target.getAttribute('data-date') || target.closest('[data-date]')?.getAttribute('data-date')
    
    if (dateStr) {
      const newOverrides = [...dayOverrides]
      const idx = newOverrides.findIndex(o => o.date === dateStr)
      if (idx >= 0) {
        // Toggle between full and half
        newOverrides[idx] = { 
          ...newOverrides[idx], 
          type: newOverrides[idx].type === 'full' ? 'half' : 'full' 
        }
        onDayOverrideChange(newOverrides)
      }
    }
  }

  const totalDays = useMemo(() => {
    return dayOverrides.reduce((sum, o) => sum + (o.type === 'half' ? 0.5 : 1.0), 0)
  }, [dayOverrides])

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
          mode="multiple"
          selected={selected}
          onSelect={handleDaySelect}
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
              const dStr = format(day, 'yyyy-MM-dd')
              return dayOverrides.some(o => o.date === dStr && o.type === 'half')
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
              backgroundColor: '#1e293b',
              color: 'white',
              borderRadius: '50%',
            },
            halfDay: {
              background: 'linear-gradient(90deg, #64748b 50%, #f8fafc 50%)',
              backgroundSize: '100% 100%',
              color: '#1e293b',
              border: '2px solid #64748b',
              borderRadius: '50%',
            },
            weekend: {
              opacity: 0.35,
            }
          }}
          classNames={{
            months: 'flex justify-center w-full',
            day_selected: '!bg-slate-800 !text-white !rounded-full',
            day_today: '!font-bold !text-slate-800',
            day_disabled: '!text-slate-300 !cursor-not-allowed',
          }}
          footer={
            dayOverrides.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-700 text-sm font-bold text-center">
                  Total Duration: {totalDays} day{totalDays !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {dayOverrides.map(o => (
                    <span key={o.date} className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.type === 'half' ? 'bg-slate-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {format(parseISO(o.date), 'd MMM')}{o.type === 'half' ? ' (Half)' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-slate-400 text-[10px] text-center mt-3 italic">
                  Tip: Right-click on a selected date to toggle it as half-day
                </p>
              </div>
            )
          }
        />
      </div>

      {hoveredDayInfo && (
        <div className="mt-3 w-full">
          <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
            {hoveredDayInfo}
          </p>
        </div>
      )}
    </div>
  )
}
