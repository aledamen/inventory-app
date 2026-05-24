'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { getAnalyticsSummary, getExpensesByType } from '@/actions/analytics'

const $ = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

type Props = {
  summary: Awaited<ReturnType<typeof getAnalyticsSummary>>
  expensesByType: Awaited<ReturnType<typeof getExpensesByType>>
}

type KPI = { label: string; value: string; sub?: string; color?: string }

function KpiCard({ label, value, sub, color }: KPI) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${color ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function SummaryTab({ summary, expensesByType }: Props) {
  const {
    totalRevenue, totalGrossProfit, totalExpenses, totalNetProfit,
    avgMargin, totalUnits, txCount, totalCost,
  } = summary

  const kpis: KPI[] = [
    { label: 'Ingresos totales', value: $(totalRevenue), sub: `${txCount} ventas · ${totalUnits} unidades` },
    { label: 'Costo total vendido', value: $(totalCost), sub: 'Costo de los productos vendidos' },
    { label: 'Ganancia bruta', value: $(totalGrossProfit), sub: `Margen promedio ${pct(avgMargin)}`, color: 'text-green-700' },
    { label: 'Gastos del período', value: $(totalExpenses), color: 'text-orange-600' },
    { label: 'Ganancia neta', value: $(totalNetProfit), sub: 'Bruta − gastos', color: totalNetProfit >= 0 ? 'text-green-700' : 'text-destructive' },
    { label: 'Margen promedio', value: pct(avgMargin), sub: 'Sobre ingresos' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {expensesByType.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Gastos por tipo</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByType.map(e => (
                  <TableRow key={e.type}>
                    <TableCell className="font-medium">{e.type}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{e.count}</TableCell>
                    <TableCell className="text-right">{$(Number(e.total))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalExpenses > 0 ? pct(Number(e.total) / totalExpenses) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
