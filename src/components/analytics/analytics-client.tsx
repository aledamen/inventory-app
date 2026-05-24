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
  { label: 'Esta semana', days: 7 },
  { label: 'Este mes', days: 30 },
  { label: 'Últimos 3 meses', days: 90 },
  { label: 'Este año', days: 365 },
  { label: 'Todo', days: 0 },
]

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0]
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

  function applyPreset(days: number) {
    if (days === 0) {
      router.push(pathname)
      return
    }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    applyRange(toDateInput(start), toDateInput(end))
  }

  const activePreset = (() => {
    if (!from && !to) return 'Todo'
    const diff = from ? Math.round((Date.now() - new Date(from).getTime()) / 86400000) : 0
    const found = PRESETS.find(p => p.days === diff)
    return found?.label ?? null
  })()

  return (
    <div className="space-y-5">
      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <Button
            key={p.label}
            variant={activePreset === p.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={from ?? ''}
            onChange={e => applyRange(e.target.value || undefined, to)}
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={to ?? ''}
            onChange={e => applyRange(from, e.target.value || undefined)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="ranking">Ranking productos</TabsTrigger>
          <TabsTrigger value="period">Ventas por período</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="stock">Entradas de stock</TabsTrigger>
        </TabsList>

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
