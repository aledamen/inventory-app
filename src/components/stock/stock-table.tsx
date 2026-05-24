'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { StockMovementWithProduct } from '@/types'

type Props = { movements: StockMovementWithProduct[] }

export function StockTable({ movements }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Costo unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Método pago</TableHead>
            <TableHead>Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No hay movimientos
              </TableCell>
            </TableRow>
          )}
          {movements.map(m => (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground">{m.movementNumber}</TableCell>
              <TableCell>{new Date(m.date).toLocaleDateString('es-AR')}</TableCell>
              <TableCell className="font-mono text-xs">{m.productSku}</TableCell>
              <TableCell>
                {m.productName}
                {m.productFlavor && <span className="text-muted-foreground"> · {m.productFlavor}</span>}
              </TableCell>
              <TableCell className="text-right font-medium">{m.quantity}</TableCell>
              <TableCell className="text-right">
                {m.unitCost ? `$${Number(m.unitCost).toLocaleString('es-AR')}` : '—'}
              </TableCell>
              <TableCell className="text-right">
                {m.total ? `$${Number(m.total).toLocaleString('es-AR')}` : '—'}
              </TableCell>
              <TableCell>{m.paymentMethod ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{m.note ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
