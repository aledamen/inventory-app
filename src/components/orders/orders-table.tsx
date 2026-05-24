'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteOrder, updateOrderStatus } from '@/actions/orders'
import { toast } from 'sonner'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Order = {
  id: number; orderNumber: number; date: Date; status: string
  totalAmount: string | null; notes: string | null
  clientName: string | null; clientPhone: string | null; paymentMethod: string | null
  itemCount: number
}

type SortField = 'orderNumber' | 'date' | 'clientName' | 'totalAmount' | 'status' | 'itemCount'

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
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = q
      ? orders.filter(o =>
          o.clientName?.toLowerCase().includes(q) ||
          o.clientPhone?.includes(q) ||
          o.status.includes(q) ||
          String(o.orderNumber).includes(q)
        )
      : [...orders]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'orderNumber': av = a.orderNumber;                   bv = b.orderNumber;                   break
        case 'date':        av = new Date(a.date).getTime();      bv = new Date(b.date).getTime();      break
        case 'clientName':  av = a.clientName ?? '';              bv = b.clientName ?? '';              break
        case 'totalAmount': av = Number(a.totalAmount ?? 0);      bv = Number(b.totalAmount ?? 0);      break
        case 'status':      av = a.status;                        bv = b.status;                        break
        case 'itemCount':   av = a.itemCount;                     bv = b.itemCount;                     break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [orders, search, sortField, sortDir])

  async function handleStatusChange(id: number, status: string | null) {
    if (!status) return
    try {
      await updateOrderStatus(id, status)
      toast.success(`Estado: ${status}`)
      router.refresh()
    } catch { toast.error('Error al actualizar') }
  }

  async function handleDelete(id: number, num: number) {
    if (!confirm(`¿Eliminar pedido #${num}?`)) return
    try {
      await deleteOrder(id)
      toast.success('Pedido eliminado')
      router.refresh()
    } catch { toast.error('Error al eliminar') }
  }

  function SortHead({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortField === field
    return (
      <TableHead className={cn('cursor-pointer select-none hover:text-foreground', className)} onClick={() => handleSort(field)}>
        <div className="flex items-center gap-1">
          {children}
          {active
            ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
        </div>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por cliente, número o estado..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="orderNumber" className="w-16">#</SortHead>
              <SortHead field="date">Fecha</SortHead>
              <SortHead field="clientName">Cliente</SortHead>
              <SortHead field="itemCount" className="text-right">Items</SortHead>
              <SortHead field="totalAmount" className="text-right">Total</SortHead>
              <TableHead>Pago</TableHead>
              <SortHead field="status">Estado</SortHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay pedidos registrados</TableCell>
              </TableRow>
            )}
            {filtered.map(o => (
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
    </div>
  )
}
