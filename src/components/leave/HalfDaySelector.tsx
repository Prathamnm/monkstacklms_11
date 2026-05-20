import { HalfDayType } from '@/constants'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

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
  
  const ToggleButton = ({ 
    label, 
    isSelected, 
    onClick 
  }: { 
    label: string, 
    isSelected: boolean, 
    onClick: () => void 
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 px-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border",
        isSelected 
          ? "bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-200" 
          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  )

  if (isSingleDay) {
    return (
      <div className="space-y-3">
        <p className={HEADING_STYLES.cardSubtitle + " ml-1"}>
          Duration Option
        </p>
        <div className="flex gap-3 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
          <ToggleButton 
            label="Full Day" 
            isSelected={startHalfDay === 'NONE'} 
            onClick={() => {
              onStartHalfDayChange('NONE')
              onEndHalfDayChange('NONE')
            }} 
          />
          <ToggleButton 
            label="Half Day" 
            isSelected={startHalfDay === 'HALF_DAY'} 
            onClick={() => {
              onStartHalfDayChange('HALF_DAY')
              onEndHalfDayChange('NONE')
            }} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
      <div className="space-y-3">
        <p className={HEADING_STYLES.cardSubtitle + " ml-1"}>
          Start Date Option
        </p>
        <div className="flex gap-2">
          <ToggleButton 
            label="Full" 
            isSelected={startHalfDay === 'NONE'} 
            onClick={() => onStartHalfDayChange('NONE')} 
          />
          <ToggleButton 
            label="Half" 
            isSelected={startHalfDay === 'HALF_DAY'} 
            onClick={() => onStartHalfDayChange('HALF_DAY')} 
          />
        </div>
      </div>
      <div className="space-y-3">
        <p className={HEADING_STYLES.cardSubtitle + " ml-1"}>
          End Date Option
        </p>
        <div className="flex gap-2">
          <ToggleButton 
            label="Full" 
            isSelected={endHalfDay === 'NONE'} 
            onClick={() => onEndHalfDayChange('NONE')} 
          />
          <ToggleButton 
            label="Half" 
            isSelected={endHalfDay === 'HALF_DAY'} 
            onClick={() => onEndHalfDayChange('HALF_DAY')} 
          />
        </div>
      </div>
    </div>
  )
}
