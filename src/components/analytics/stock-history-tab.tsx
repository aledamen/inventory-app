'use client'

import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import type { getStockHistory } from '@/actions/analytics'

type Row = Awaited<ReturnType<typeof getStockHistory>>[number]

const $ = (n: string | null) => n ? `$${Number(n).toLocaleString('es-AR')}` : '—'

export function StockHistoryTab({ movements }: { movements: Row[] }) {
  const [search, setSearch] = useState('')

  const filtered = movements.filter(m =>
    !search ||
    m.productName?.toLowerCase().includes(search.toLowerCase()) ||
    m.productSku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvested = movements.reduce((a, m) => a + Number(m.total ?? 0), 0)
  const totalUnits = movements.reduce((a, m) => a + m.quantity, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar por producto o SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>{movements.length} entradas · <span className="font-medium text-foreground">{totalUnits} unidades</span></span>
          <span>Total invertido: <span className="font-medium text-foreground">${Math.round(totalInvested).toLocaleString('es-AR')}</span></span>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Sin entradas de stock para el período
                </TableCell>
              </TableRow>
            )}
            {filtered.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">{m.movementNumber}</TableCell>
                <TableCell>{new Date(m.date).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="font-mono text-xs">{m.productSku ?? '—'}</TableCell>
                <TableCell>
                  {m.productName}
                  {m.productFlavor && <span className="text-muted-foreground"> · {m.productFlavor}</span>}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{m.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{$(m.unitCost)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{$(m.total)}</TableCell>
                <TableCell className="text-muted-foreground">{m.paymentMethod ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{m.note ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
