'use client'

import { format, parseISO } from 'date-fns'
import { HEADING_STYLES } from '@/constants/tailwind'

interface PersonalInfoTabProps {
  data: any
}

export function PersonalInfoTab({ data }: PersonalInfoTabProps) {
  return (
    <div className="space-y-10">
      <section>
        <h3 className={HEADING_STYLES.cardSubtitle + " mb-8 flex items-center gap-3 text-slate-500"}>
          <span className="w-8 h-[1px] bg-slate-200" /> Identity & Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <DetailItem label="Full Name" value={data.displayName} />
          <DetailItem label="Work Email" value={data.workEmail} className="text-blue-600" />
          <DetailItem label="Job Title" value={data.jobTitle} />
          <DetailItem label="Phone Number" value={data.phoneNumber} />
          <DetailItem label="Join Date" value={data.joinDate ? format(parseISO(data.joinDate), 'MMM d, yyyy') : null} />
          <DetailItem label="Notification Email" value={data.notificationEmail} />
          <DetailItem label="Entra Object ID" value={data.entraObjectId} className="col-span-full font-mono text-[11px] opacity-60" />
        </div>
      </section>

      <section>
        <h3 className={HEADING_STYLES.cardSubtitle + " mb-6 flex items-center gap-3 text-slate-500"}>
          <span className="w-8 h-[1px] bg-slate-200" /> Emergency Contact
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <DetailItem label="Name" value={data.emergencyName} />
          <DetailItem label="Relation" value={data.emergencyRelation} />
          <DetailItem label="Phone" value={data.emergencyPhone} />
        </div>
      </section>
    </div>
  )
}

function DetailItem({ label, value, className = '' }: { label: string, value: string | null, className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-tight">{label}</p>
      <p className="text-[14px] font-semibold text-slate-900 leading-snug">{value || '—'}</p>
    </div>
  )
}
