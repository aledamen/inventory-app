import { cn } from '@/lib/utils'

type Props = {
  title: string
  value: string
  sub?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'blue'
  icon?: React.ReactNode
}

const variantStyles = {
  default: { card: 'border-border', value: 'text-foreground', dot: 'bg-border' },
  blue: { card: 'border-primary/20 bg-primary/5', value: 'text-primary', dot: 'bg-primary' },
  success: { card: 'border-emerald-200 bg-emerald-50/60', value: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { card: 'border-amber-200 bg-amber-50/60', value: 'text-amber-700', dot: 'bg-amber-500' },
  danger: { card: 'border-red-200 bg-red-50/60', value: 'text-red-600', dot: 'bg-red-500' },
}

export function KpiCard({ title, value, sub, variant = 'default', icon }: Props) {
  const s = variantStyles[variant]
  return (
    <div className={cn('rounded-xl border bg-card px-5 py-4 space-y-3', s.card)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div>
        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', s.value)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  )
}
