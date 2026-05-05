'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export const ds = {
  card: {
    background: 'var(--color-card-bg)',
    border: '0.5px solid var(--color-card-border)',
    borderRadius: 12,
  } as const,
  accentGreen: { borderLeft: '3px solid var(--accent-border-green)', borderRadius: '0 12px 12px 0' } as const,
  accentBlue: { borderLeft: '3px solid var(--accent-border-blue)', borderRadius: '0 12px 12px 0' } as const,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as const,
  title: { fontSize: 18, fontWeight: 500, color: 'var(--color-heading)' } as const,
  muted: { color: 'var(--color-muted)' } as const,
} as const

export function Card(props: React.HTMLAttributes<HTMLDivElement> & { padding?: number | string }) {
  const { className, style, padding = '16px 18px', ...rest } = props
  return (
    <div
      className={cn(className)}
      style={{
        ...ds.card,
        padding,
        ...style,
      }}
      {...rest}
    />
  )
}

export function AccentCard(
  props: React.HTMLAttributes<HTMLDivElement> & {
    accent: 'green' | 'blue'
    padding?: number | string
  }
) {
  const { accent, className, style, padding = '16px 18px', ...rest } = props
  const accentStyle = accent === 'green' ? ds.accentGreen : ds.accentBlue
  return (
    <Card
      className={cn(className)}
      style={{
        ...accentStyle,
        ...style,
      }}
      padding={padding}
      {...rest}
    />
  )
}

export function IconPill(props: {
  bgVar: string
  strokeVar: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-center', props.className)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: `var(${props.bgVar})`,
        color: `var(${props.strokeVar})`,
      }}
      aria-hidden="true"
    >
      {props.children}
    </div>
  )
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }
) {
  const { className, style, fullWidth, ...rest } = props
  return (
    <button
      className={cn(className)}
      style={{
        background: 'var(--icon-pill-blue-stroke)',
        color: 'var(--icon-pill-blue-bg)',
        border: 'none',
        borderRadius: 9,
        padding: '9px 14px',
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    />
  )
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }
) {
  const { className, style, fullWidth, ...rest } = props
  return (
    <button
      className={cn(className)}
      style={{
        background: 'var(--color-page-bg)',
        color: 'var(--color-heading)',
        border: '0.5px solid var(--color-card-border)',
        borderRadius: 9,
        padding: '9px 14px',
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    />
  )
}

export function DestructiveButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }
) {
  const { className, style, fullWidth, ...rest } = props
  return (
    <button
      className={cn(className)}
      style={{
        background: 'var(--status-rejected-bg)',
        color: 'var(--status-rejected-text)',
        border: '0.5px solid #F7C1C1',
        borderRadius: 8,
        padding: '5px 14px',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    />
  )
}

export const AvatarInitials = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { size?: 'sm' | 'md' | 'lg'; variant?: 0 | 1 | 2 | 3; initials: string }
>(function AvatarInitials({ className, style, size = 'md', variant = 0, initials, ...rest }, ref) {
  const sizePx = size === 'sm' ? 28 : size === 'md' ? 36 : 44
  const fontPx = size === 'sm' ? 10 : size === 'md' ? 12 : 14

  const palette = [
    { bg: 'var(--status-active-bg)', text: 'var(--status-active-text)' },
    { bg: 'var(--status-approved-bg)', text: 'var(--status-approved-text)' },
    { bg: 'var(--status-pending-bg)', text: 'var(--status-pending-text)' },
    { bg: 'var(--announce-purple-bg)', text: 'var(--announce-purple-title)' },
  ] as const
  const p = palette[variant]

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center', className)}
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: '50%',
        fontWeight: 500,
        fontSize: fontPx,
        background: p.bg,
        color: p.text,
        ...style,
      }}
      aria-label="Avatar"
      {...rest}
    >
      {initials}
    </div>
  )
})

