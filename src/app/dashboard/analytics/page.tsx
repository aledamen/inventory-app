import { getAnalyticsSummary, getSalesRanking, getSalesByPeriod, getStockInventoryValue, getStockHistory, getExpensesByType } from '@/actions/analytics'
import { AnalyticsClient } from '@/components/analytics/analytics-client'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; period?: string }>
}) {
  const params = await searchParams
  const { from, to } = params

  const [summary, ranking, byDay, byWeek, byMonth, byYear, inventory, stockHistory, expensesByType] = await Promise.all([
    getAnalyticsSummary(from, to),
    getSalesRanking(from, to),
    getSalesByPeriod('day', from, to),
    getSalesByPeriod('week', from, to),
    getSalesByPeriod('month', from, to),
    getSalesByPeriod('year', from, to),
    getStockInventoryValue(),
    getStockHistory(from, to),
    getExpensesByType(from, to),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analítica</h1>
        <p className="text-sm text-muted-foreground mt-1">Rendimiento financiero, ranking de ventas e inventario</p>
      </div>

      <AnalyticsClient
        from={from}
        to={to}
        summary={summary}
        ranking={ranking}
        byDay={byDay}
        byWeek={byWeek}
        byMonth={byMonth}
        byYear={byYear}
        inventory={inventory}
        stockHistory={stockHistory}
        expensesByType={expensesByType}
      />
    </div>
  )
}
