'use client'

interface UpdateDetailsTabProps {
  editForm: any
  setEditForm: (val: any) => void
  isPending: boolean
  onSave: () => void
  onCancel: () => void
  isTerminated: boolean
}

export function UpdateDetailsTab({ 
  editForm, 
  setEditForm, 
  isPending, 
  onSave, 
  onCancel,
  isTerminated 
}: UpdateDetailsTabProps) {
  return (
    <div className="max-w-2xl space-y-10">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-sm text-blue-800 shadow-sm shadow-blue-50">
        <span className="text-xl">ℹ️</span>
        <p>
          Identity fields are managed in <strong>Azure Entra ID</strong>.
          Changes made here only affect internal LMS attributes like emergency contacts and employment status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <div className="space-y-6">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Emergency Contact Info</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField 
              placeholder="Contact Name" 
              value={editForm.emergencyName} 
              onChange={(val) => setEditForm({ ...editForm, emergencyName: val })} 
            />
            <InputField 
              placeholder="Relation" 
              value={editForm.emergencyRelation} 
              onChange={(val) => setEditForm({ ...editForm, emergencyRelation: val })} 
            />
            <InputField 
              placeholder="Phone Number" 
              value={editForm.emergencyPhone} 
              onChange={(val) => setEditForm({ ...editForm, emergencyPhone: val })} 
            />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Settings</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Notification Email</label>
              <InputField 
                type="email"
                value={editForm.notificationEmail} 
                onChange={(val) => setEditForm({ ...editForm, notificationEmail: val })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Employment Status</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none bg-white transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
                value={editForm.employmentStatus}
                disabled={isTerminated}
                onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">TimeZone</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none bg-white transition-all shadow-sm"
                value={editForm.timeZone}
                onChange={(e) => setEditForm({ ...editForm, timeZone: e.target.value })}
              >
                <option value="UTC">UTC (GMT+0)</option>
                <option value="Asia/Kolkata">IST (GMT+5:30)</option>
                <option value="America/New_York">EST (GMT-5)</option>
                <option value="Europe/London">GMT (GMT+0/1)</option>
                <option value="Asia/Dubai">GST (GMT+4)</option>
                <option value="Asia/Singapore">SGT (GMT+8)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={isPending}
          className="bg-purple-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-50 active:scale-[0.98]"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function InputField({ placeholder, value, onChange, type = 'text' }: { placeholder?: string, value: string, onChange: (v: string) => void, type?: string }) {
  return (
    <input
      type={type}
      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none transition-all shadow-sm"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
