'use client'

import React from 'react'
import { format } from 'date-fns'
import { Megaphone, Pencil, Trash2, Plus } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import type { Announcement } from '@/types/announcement'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

interface AnnouncementListProps {
  announcements: Announcement[]
  limit?: number
  onEdit?: (announcement: Announcement) => void
  onDelete?: (id: string) => void
  onCreate?: () => void
  isManaging?: boolean
}

export function AnnouncementList({ 
  announcements, 
  limit = 5, 
  onEdit, 
  onDelete, 
  onCreate,
  isManaging 
}: AnnouncementListProps) {
  const displayed = announcements.slice(0, limit)

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
            <Megaphone size={18} />
          </div>
          <div>
            <h3 className={HEADING_STYLES.cardHeader}>
              Latest Announcements
            </h3>
            <p className={HEADING_STYLES.cardSubtitle + " mt-1"}>
              Stay updated with team news
            </p>
          </div>
        </div>
        
        {onCreate && (
          <button 
            onClick={onCreate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <Plus size={14} />
            <span>POST</span>
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-200 border-dashed">
            <Megaphone size={24} className="text-slate-300" />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">
            No announcements yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((a) => (
            <div 
              key={a.id} 
              className={cn(
                "p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all relative group h-full flex flex-col",
                isManaging && "hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors">{a.title}</h4>
                {isManaging && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(a)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(a.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-6 flex-1">
                {a.content}
              </p>
              
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-4 border-t border-slate-200/60 mt-auto">
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[9px] text-slate-600 shadow-sm">
                    {a.poster?.displayName?.charAt(0)}
                  </div>
                  <span className="uppercase tracking-tighter">{a.poster?.displayName}</span>
                </span>
                <span className="bg-slate-100 px-2 py-1 rounded-md">{format(new Date(a.createdAt), 'dd MMM yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
