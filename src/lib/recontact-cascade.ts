export type CascadeResult =
  | { kind: 'closed'; label: string }
  | { kind: 'seguirlo'; label: string; daysSinceContacted: number }
  | { kind: 'esperando'; label: string; daysSinceContacted: number }
  | { kind: 'escribirle_ya'; label: string; daysUntilDue: number }
  | { kind: 'esta_semana'; label: string; daysUntilDue: number }
  | { kind: 'en_n_dias'; label: string; daysUntilDue: number }

export function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((utcMidnight(a) - utcMidnight(b)) / 86400000)
}

export function addDays(d: Date, days: number): Date {
  return new Date(utcMidnight(d) + days * 86400000)
}

export function computeCascade(row: {
  status: string
  contactedAt: Date | null
  dueDate: Date
}, now: Date): CascadeResult {
  if (row.status === 'no_quiere') {
    return { kind: 'closed', label: 'Cerrado' }
  }

  if (row.status === 'contactado') {
    const daysSinceContacted = row.contactedAt ? daysBetween(now, row.contactedAt) : 0
    if (daysSinceContacted >= 4) {
      return { kind: 'seguirlo', label: 'SEGUIRLO', daysSinceContacted }
    }
    return { kind: 'esperando', label: `Esperando (${daysSinceContacted} de 4 días)`, daysSinceContacted }
  }

  const daysUntilDue = daysBetween(row.dueDate, now)
  if (daysUntilDue <= 0) {
    return { kind: 'escribirle_ya', label: 'ESCRIBIRLE YA', daysUntilDue }
  }
  if (daysUntilDue <= 7) {
    return { kind: 'esta_semana', label: 'Esta semana', daysUntilDue }
  }
  return { kind: 'en_n_dias', label: `En ${daysUntilDue} días`, daysUntilDue }
}
