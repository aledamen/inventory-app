'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SummaryTab } from './summary-tab'
import { RankingsTab } from './rankings-tab'
import { PeriodTab } from './period-tab'
import { InventoryTab } from './inventory-tab'
import { StockHistoryTab } from './stock-history-tab'
import type {
  getAnalyticsSummary,
  getSalesRanking,
  getSalesByPeriod,
  getStockInventoryValue,
  getStockHistory,
  getExpensesByType,
} from '@/actions/analytics'

type Props = {
  from?: string
  to?: string
  summary: Awaited<ReturnType<typeof getAnalyticsSummary>>
  ranking: Awaited<ReturnType<typeof getSalesRanking>>
  byDay: Awaited<ReturnType<typeof getSalesByPeriod>>
  byWeek: Awaited<ReturnType<typeof getSalesByPeriod>>
  byMonth: Awaited<ReturnType<typeof getSalesByPeriod>>
  byYear: Awaited<ReturnType<typeof getSalesByPeriod>>
  inventory: Awaited<ReturnType<typeof getStockInventoryValue>>
  stockHistory: Awaited<ReturnType<typeof getStockHistory>>
  expensesByType: Awaited<ReturnType<typeof getExpensesByType>>
}

const PRESETS = [
  { label: 'Esta semana', key: 'week' },
  { label: 'Este mes', key: 'month' },
  { label: 'Últimos 3 meses', key: '3months' },
  { label: 'Este año', key: 'year' },
  { label: 'Todo', key: 'all' },
] as const

type PresetKey = typeof PRESETS[number]['key']

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0]
}

function getPresetRange(key: PresetKey): { from: string; to: string } | null {
  const now = new Date()
  const to = toDateInput(now)
  if (key === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return { from: toDateInput(d), to }
  }
  if (key === 'month') return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to }
  if (key === '3months') return { from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to }
  if (key === 'year') return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to }
  return null
}

export function AnalyticsClient({ from, to, summary, ranking, byDay, byWeek, byMonth, byYear, inventory, stockHistory, expensesByType }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function applyRange(newFrom?: string, newTo?: string) {
    const p = new URLSearchParams()
    if (newFrom) p.set('from', newFrom)
    if (newTo) p.set('to', newTo)
    router.push(`${pathname}?${p.toString()}`)
  }

  function applyPreset(key: PresetKey) {
    if (key === 'all') { router.push(pathname); return }
    const range = getPresetRange(key)
    if (range) applyRange(range.from, range.to)
  }

  const activePreset = (() => {
    if (!from && !to) return 'all'
    for (const p of PRESETS) {
      if (p.key === 'all') continue
      const range = getPresetRange(p.key)
      if (range && range.from === from && range.to === to) return p.key
    }
    return null
  })()

  return (
    <div className="space-y-5">
      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <Button
            key={p.key}
            variant={activePreset === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="date"
            className="h-8 flex-1 sm:w-36 sm:flex-none text-sm"
            value={from ?? ''}
            onChange={e => applyRange(e.target.value || undefined, to)}
          />
          <span className="text-muted-foreground text-sm shrink-0">→</span>
          <Input
            type="date"
            className="h-8 flex-1 sm:w-36 sm:flex-none text-sm"
            value={to ?? ''}
            onChange={e => applyRange(from, e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="period">Por período</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="stock">Entradas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="mt-5">
          <SummaryTab summary={summary} expensesByType={expensesByType} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-5">
          <RankingsTab ranking={ranking} />
        </TabsContent>

        <TabsContent value="period" className="mt-5">
          <PeriodTab byDay={byDay} byWeek={byWeek} byMonth={byMonth} byYear={byYear} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-5">
          <InventoryTab inventory={inventory} />
        </TabsContent>

        <TabsContent value="stock" className="mt-5">
          <StockHistoryTab movements={stockHistory} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
