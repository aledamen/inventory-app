'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { getSalesByPeriod } from '@/actions/analytics'

type Row = Awaited<ReturnType<typeof getSalesByPeriod>>[number]
type Granularity = 'day' | 'week' | 'month' | 'year'

const $ = (n: string | number | null) => `$${Math.round(Number(n)).toLocaleString('es-AR')}`
const pct = (n: string | null) => n ? `${(Number(n) * 100).toFixed(1)}%` : '—'

function formatPeriod(period: string | null, g: Granularity) {
  if (!period) return '—'
  const d = new Date(period)
  if (g === 'day') return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  if (g === 'week') return `Sem ${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`
  if (g === 'month') return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  return d.getFullYear().toString()
}

type Props = {
  byDay: Row[]
  byWeek: Row[]
  byMonth: Row[]
  byYear: Row[]
}

const chartConfig = {
  revenue: { label: 'Ingresos', color: 'var(--primary)' },
  profit: { label: 'Ganancia', color: 'oklch(0.55 0.15 145)' },
}

export function PeriodTab({ byDay, byWeek, byMonth, byYear }: Props) {
  const [g, setG] = useState<Granularity>('month')

  const data = { day: byDay, week: byWeek, month: byMonth, year: byYear }[g]

  const chartData = data.map(row => ({
    period: formatPeriod(row.period as unknown as string, g),
    revenue: Math.round(Number(row.revenue)),
    profit: Math.round(Number(row.profit)),
  }))

  const totals = data.reduce((acc, r) => ({
    revenue: acc.revenue + Number(r.revenue),
    profit: acc.profit + Number(r.profit),
    units: acc.units + Number(r.units),
    txCount: acc.txCount + Number(r.txCount),
  }), { revenue: 0, profit: 0, units: 0, txCount: 0 })

  const GRANULARITIES: { key: Granularity; label: string }[] = [
    { key: 'day', label: 'Por día' },
    { key: 'week', label: 'Por semana' },
    { key: 'month', label: 'Por mes' },
    { key: 'year', label: 'Por año' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {GRANULARITIES.map(gr => (
          <Button
            key={gr.key}
            variant={g === gr.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setG(gr.key)}
          >
            {gr.label}
          </Button>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `$${Number(v).toLocaleString('es-AR')}`} />} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[3, 3, 0, 0]} name="revenue" />
              <Bar dataKey="profit" fill="oklch(0.55 0.15 145)" radius={[3, 3, 0, 0]} name="profit" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Transacciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin datos para el período seleccionado
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{formatPeriod(row.period as unknown as string, g)}</TableCell>
                <TableCell className="text-right tabular-nums">{$(row.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums text-green-700">{$(row.profit)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{pct(row.avgMargin)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(row.units)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{Number(row.txCount)}</TableCell>
              </TableRow>
            ))}
            {data.length > 1 && (
              <TableRow className="border-t-2 font-semibold bg-muted/40">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{$(totals.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums text-green-700">{$(totals.profit)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totals.revenue > 0 ? pct(String(totals.profit / totals.revenue)) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{totals.units}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{totals.txCount}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
