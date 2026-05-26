'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { getStockInventoryValue } from '@/actions/analytics'

type Row = Awaited<ReturnType<typeof getStockInventoryValue>>[number]

const $ = (n: string | number | null) => n !== null ? `$${Math.round(Number(n)).toLocaleString('es-AR')}` : '—'

export function InventoryTab({ inventory }: { inventory: Row[] }) {
  const totalAtCost = inventory.reduce((a, r) => a + Number(r.valueAtCost), 0)
  const totalAtCash = inventory.reduce((a, r) => a + Number(r.valueAtCash), 0)
  const totalPotential = inventory.reduce((a, r) => a + Number(r.potentialProfit), 0)
  const totalUnits = inventory.reduce((a, r) => a + r.stock, 0)
  // margen = ganancia potencial / costo (markup sobre costo, como en la planilla)
  const markup = totalAtCost > 0 ? totalPotential / totalAtCost : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Unidades en stock', value: totalUnits.toLocaleString('es-AR') },
          { label: 'Total al costo', value: $(totalAtCost) },
          { label: 'Total al precio', value: $(totalAtCash) },
          { label: 'Ganancia potencial', value: `${$(totalPotential)} (${(markup * 100).toFixed(1)}%)`, color: 'text-green-700' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-semibold tabular-nums mt-1 ${k.color ?? ''}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Costo unitario</TableHead>
              <TableHead className="text-right">Valor al costo</TableHead>
              <TableHead className="text-right">Precio efectivo</TableHead>
              <TableHead className="text-right">Valor al precio</TableHead>
              <TableHead className="text-right">Ganancia potencial</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Sin productos en stock
                </TableCell>
              </TableRow>
            )}
            {inventory.map(row => (
              <TableRow key={row.productId}>
                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                <TableCell>
                  <div>
                    <span className="font-medium">{row.name}</span>
                    {row.flavor && <span className="text-muted-foreground"> · {row.flavor}</span>}
                    {row.brand && <span className="text-xs text-muted-foreground block">{row.brand}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant="secondary">{row.stock}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{$(row.totalCost)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{$(row.valueAtCost)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{row.priceCashRounded ? `$${row.priceCashRounded.toLocaleString('es-AR')}` : '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{$(row.valueAtCash)}</TableCell>
                <TableCell className="text-right tabular-nums text-green-700">{$(row.potentialProfit)}</TableCell>
              </TableRow>
            ))}
            {inventory.length > 1 && (
              <TableRow className="border-t-2 font-semibold bg-muted/40">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{totalUnits}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{$(totalAtCost)}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{$(totalAtCash)}</TableCell>
                <TableCell className="text-right tabular-nums text-green-700">
                  {$(totalPotential)}{' '}
                  <span className="text-xs font-normal">({(markup * 100).toFixed(1)}%)</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
