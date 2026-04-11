interface ProjectTagProps {
  name: string
  code: string
  color?: string
}

export function ProjectTag({ name, code, color = '#6366f1' }: ProjectTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {code}
    </span>
  )
}
