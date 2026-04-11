import type { HalfDayType } from '@/types/leave'

interface HalfDaySelectorProps {
  startHalfDay: HalfDayType
  endHalfDay: HalfDayType
  onStartHalfDayChange: (value: HalfDayType) => void
  onEndHalfDayChange: (value: HalfDayType) => void
  isSingleDay: boolean
}

export function HalfDaySelector({
  startHalfDay,
  endHalfDay,
  onStartHalfDayChange,
  onEndHalfDayChange,
  isSingleDay,
}: HalfDaySelectorProps) {
  if (isSingleDay) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Half Day Option</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="singleHalfDay"
              checked={startHalfDay === 'NONE'}
              onChange={() => {
                onStartHalfDayChange('NONE')
                onEndHalfDayChange('NONE')
              }}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Full Day</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="singleHalfDay"
              checked={startHalfDay === 'FIRST_HALF'}
              onChange={() => {
                onStartHalfDayChange('FIRST_HALF')
                onEndHalfDayChange('NONE')
              }}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Morning (AM)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="singleHalfDay"
              checked={startHalfDay === 'SECOND_HALF'}
              onChange={() => {
                onStartHalfDayChange('SECOND_HALF')
                onEndHalfDayChange('NONE')
              }}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Afternoon (PM)</span>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Start Date</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="startHalfDay"
              checked={startHalfDay === 'NONE'}
              onChange={() => onStartHalfDayChange('NONE')}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Full Day</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="startHalfDay"
              checked={startHalfDay === 'SECOND_HALF'}
              onChange={() => onStartHalfDayChange('SECOND_HALF')}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Afternoon only</span>
          </label>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">End Date</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="endHalfDay"
              checked={endHalfDay === 'NONE'}
              onChange={() => onEndHalfDayChange('NONE')}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Full Day</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="endHalfDay"
              checked={endHalfDay === 'FIRST_HALF'}
              onChange={() => onEndHalfDayChange('FIRST_HALF')}
              className="accent-blue-600"
            />
            <span className="text-sm text-slate-600">Morning only</span>
          </label>
        </div>
      </div>
    </div>
  )
}
