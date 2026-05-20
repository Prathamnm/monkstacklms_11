'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const RULES = [
  {
    title: 'Standard Leave',
    body: 'Employees accrue standard leave days based on their tenure. Leave must be applied at least 1 business day in advance.',
  },
  {
    title: 'Emergency Leave',
    body: 'Maximum 2 consecutive days. Must be flagged as emergency at time of application. Deducted from standard balance.',
  },
  {
    title: 'Floater Holidays',
    body: 'Floater holidays are optional company holidays. They must be used within the current calendar year and cannot be carried forward.',
  },
  {
    title: 'Sandwich Leave Rule',
    body: 'You cannot take leave on both sides of a weekend/public holiday block. For example, if Friday is a holiday, you cannot take leave on Thursday AND the following Monday simultaneously.',
  },
  {
    title: 'Half-Day Leaves',
    body: 'Half-day can be applied for the first or last day of your leave range. Half days count as 0.5 leave days.',
  },
  {
    title: 'Cancellation Policy',
    body: 'Only the employee who applied for the leave can cancel it. Approved leaves that are in the past cannot be cancelled.',
  },
  {
    title: 'Overlap Policy',
    body: 'You cannot apply for leave on dates that already have a pending or approved leave request.',
  },
]

export function LeaveRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: '32px 36px',
              maxWidth: 560,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
              Leave Rules & Policies
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {RULES.map((rule, i) => (
                <div key={i} style={{ borderLeft: '3px solid #1e293b', paddingLeft: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{rule.title}</p>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{rule.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
