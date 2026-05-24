'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { SaleWithProduct } from '@/types'

type Props = { sales: SaleWithProduct[] }

export function SalesTable({ sales }: Props) {
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
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Ganancia neta</TableHead>
            <TableHead>Método pago</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No hay ventas
              </TableCell>
            </TableRow>
          )}
          {sales.map(s => (
            <TableRow key={s.id}>
              <TableCell className="text-muted-foreground">{s.saleNumber}</TableCell>
              <TableCell>{new Date(s.date).toLocaleDateString('es-AR')}</TableCell>
              <TableCell className="font-mono text-xs">{s.productSku}</TableCell>
              <TableCell>
                {s.productName}
                {s.productFlavor && <span className="text-muted-foreground"> · {s.productFlavor}</span>}
              </TableCell>
              <TableCell className="text-right">{s.quantity}</TableCell>
              <TableCell className="text-right">
                {s.effectivePrice ? `$${Number(s.effectivePrice).toLocaleString('es-AR')}` : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {s.totalSale ? `$${Number(s.totalSale).toLocaleString('es-AR')}` : '—'}
              </TableCell>
              <TableCell className="text-right">
                {s.netProfit ? (
                  <Badge variant={Number(s.netProfit) >= 0 ? 'secondary' : 'destructive'} className={Number(s.netProfit) >= 0 ? 'text-green-700' : ''}>
                    ${Number(s.netProfit).toLocaleString('es-AR')}
                  </Badge>
                ) : '—'}
              </TableCell>
              <TableCell>{s.paymentMethod ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
