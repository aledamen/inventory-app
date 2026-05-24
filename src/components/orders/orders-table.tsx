'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteOrder, updateOrderStatus } from '@/actions/orders'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

type Order = {
  id: number; orderNumber: number; date: Date; status: string
  totalAmount: string | null; notes: string | null
  clientName: string | null; clientPhone: string | null; paymentMethod: string | null
  itemCount: number
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  entregado: 'bg-blue-100 text-blue-800 border-blue-200',
  cobrado: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
}

const STATUSES = ['pendiente', 'entregado', 'cobrado', 'cancelado']

const $ = (n: string | null) => n ? `$${Math.round(Number(n)).toLocaleString('es-AR')}` : '—'

export function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()

  async function handleStatusChange(id: number, status: string | null) {
    if (!status) return
    try {
      await updateOrderStatus(id, status)
      toast.success(`Estado actualizado: ${status}`)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  async function handleDelete(id: number, num: number) {
    if (!confirm(`¿Eliminar pedido #${num}?`)) return
    try {
      await deleteOrder(id)
      toast.success('Pedido eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay pedidos registrados</TableCell>
            </TableRow>
          )}
          {orders.map(o => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-muted-foreground text-xs">{o.orderNumber}</TableCell>
              <TableCell>{new Date(o.date).toLocaleDateString('es-AR')}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{o.clientName ?? <span className="text-muted-foreground">Sin cliente</span>}</p>
                  {o.clientPhone && <p className="text-xs text-muted-foreground">{o.clientPhone}</p>}
                </div>
              </TableCell>
              <TableCell className="text-right"><Badge variant="secondary">{Number(o.itemCount)}</Badge></TableCell>
              <TableCell className="text-right font-medium tabular-nums">{$(o.totalAmount)}</TableCell>
              <TableCell className="text-muted-foreground">{o.paymentMethod ?? '—'}</TableCell>
              <TableCell>
                <Select value={o.status} onValueChange={v => handleStatusChange(o.id, v)}>
                  <SelectTrigger className={`h-7 w-28 text-xs border rounded-md px-2 ${STATUS_COLORS[o.status] ?? ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(o.id, o.orderNumber)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
