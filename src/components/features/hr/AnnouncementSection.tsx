'use client'

import { useState } from 'react'
import { Pencil, Trash2, Megaphone, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAnnouncements } from '@/hooks/useHRDashboardData'
import { Card } from '@/components/shared/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import { HEADING_STYLES } from '@/constants/tailwind'

export function AnnouncementSection() {
  const { announcements, postAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements()
  const [announcementForm, setAnnouncementForm] = useState({ open: false, title: '', content: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '' })

  const handlePost = () => {
    if (!announcementForm.title || !announcementForm.content) return
    postAnnouncement.mutate(
      { title: announcementForm.title, content: announcementForm.content },
      { onSuccess: () => setAnnouncementForm({ open: false, title: '', content: '' }) }
    )
  }

  const handleUpdate = (id: string) => {
    updateAnnouncement.mutate(
      { id, title: editForm.title, content: editForm.content },
      { onSuccess: () => setEditingId(null) }
    )
  }

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
            <Megaphone size={18} />
          </div>
          <div>
            <h3 className={HEADING_STYLES.cardHeader}>
              Announcements
            </h3>
            <p className={HEADING_STYLES.cardSubtitle + " mt-1"}>
              Manage company-wide updates
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setAnnouncementForm({ ...announcementForm, open: !announcementForm.open })}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95",
            announcementForm.open 
              ? "bg-slate-100 text-slate-600 border border-slate-200" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {announcementForm.open ? 'Cancel' : <><Plus size={14} /> Post</>}
        </button>
      </div>

      {announcementForm.open && (
        <div className="mb-6 space-y-4 p-5 rounded-2xl border border-blue-100 bg-blue-50/30">
          <input 
            value={announcementForm.title} 
            onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
            placeholder="Announcement title" 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all shadow-inner"
          />
          <textarea 
            value={announcementForm.content} 
            onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
            rows={4} 
            placeholder="What would you like to share?" 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all resize-none shadow-inner"
          />
          <div className="flex justify-end">
            <button 
              onClick={handlePost} 
              disabled={postAnnouncement.isPending || !announcementForm.title || !announcementForm.content}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
            >
              {postAnnouncement.isPending ? 'Posting...' : 'Publish Announcement'}
            </button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon="📢" title="No announcements" description="Start by posting an update for the team." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {announcements.slice(0, 5).map((a) => (
            <div key={a.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all group">
              {editingId === a.id ? (
                <div className="space-y-4">
                  <input
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <textarea
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 resize-none"
                    rows={4}
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleUpdate(a.id)}
                      disabled={updateAnnouncement.isPending}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
                    >
                      {updateAnnouncement.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <p className="text-[14px] font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{a.title}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(a.id)
                          setEditForm({ title: a.title, content: a.content })
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this announcement?')) deleteAnnouncement.mutate(a.id)
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{a.content}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[9px] text-slate-600">
                        {a.poster?.displayName?.charAt(0)}
                      </div>
                      <span className="uppercase tracking-tighter">{a.poster?.displayName}</span>
                    </div>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{format(new Date(a.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
