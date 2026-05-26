'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { getSalesRanking } from '@/actions/analytics'

type Row = Awaited<ReturnType<typeof getSalesRanking>>[number]
type SortKey = 'totalRevenue' | 'totalUnits' | 'totalProfit' | 'avgMargin' | 'txCount'

const $ = (n: string | number | null) => n ? `$${Math.round(Number(n)).toLocaleString('es-AR')}` : '—'
const pct = (n: string | null) => n ? `${(Number(n) * 100).toFixed(1)}%` : '—'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'totalRevenue', label: 'Ingresos' },
  { key: 'totalUnits', label: 'Unidades' },
  { key: 'totalProfit', label: 'Ganancia' },
  { key: 'avgMargin', label: 'Margen' },
  { key: 'txCount', label: 'Ventas' },
]

export function RankingsTab({ ranking }: { ranking: Row[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('totalRevenue')

  const sorted = [...ranking].sort((a, b) => Number(b[sortBy]) - Number(a[sortBy]))
  const maxRevenue = sorted.length ? Number(sorted[0].totalRevenue) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ordenar por:</span>
        {SORTS.map(s => (
          <Button
            key={s.key}
            variant={sortBy === s.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Sin datos para el período seleccionado
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row, i) => {
              const share = maxRevenue > 0 ? Number(row.totalRevenue) / maxRevenue : 0
              return (
                <TableRow key={row.productId}>
                  <TableCell className="text-muted-foreground font-mono text-xs">{i + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {row.productName}
                        {row.productFlavor && <span className="text-muted-foreground"> · {row.productFlavor}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{row.productSku}</span>
                        <div className="flex-1 max-w-24 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${share * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{(share * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{$(row.totalRevenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(row.totalUnits)}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-700">{$(row.totalProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary">{pct(row.avgMargin)}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{Number(row.txCount)}</TableCell>
                </TableRow>
              )
            })}
            {sorted.length > 0 && (() => {
              const totRev = sorted.reduce((a, r) => a + Number(r.totalRevenue), 0)
              const totUnits = sorted.reduce((a, r) => a + Number(r.totalUnits), 0)
              const totProfit = sorted.reduce((a, r) => a + Number(r.totalProfit), 0)
              const totSales = sorted.reduce((a, r) => a + Number(r.txCount), 0)
              const avgM = totRev > 0 ? totProfit / totRev : 0
              return (
                <TableRow className="border-t-2 font-semibold bg-muted/40">
                  <TableCell colSpan={2} className="text-muted-foreground text-xs">{sorted.length} productos</TableCell>
                  <TableCell className="text-right tabular-nums">{$(totRev)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totUnits}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-700">{$(totProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant="secondary">{(avgM * 100).toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{totSales}</TableCell>
                </TableRow>
              )
            })()}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
