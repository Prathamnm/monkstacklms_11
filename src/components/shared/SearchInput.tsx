'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 w-full max-w-md bg-white border border-slate-200 rounded-2xl px-5 py-3 transition-all focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-300 shadow-sm group",
      containerClassName
    )}>
      <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors shrink-0" aria-hidden />
      <input
        {...props}
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400",
          className
        )}
      />
    </div>
  )
}
