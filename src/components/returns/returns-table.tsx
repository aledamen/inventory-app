'use client'

import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { deleteReturn } from '@/actions/returns'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

type Return = {
  id: number
  date: Date
  saleId: number | null
  quantity: number
  reason: string | null
  refundAmount: string | null
  productName: string | null
  productFlavor: string | null
  clientName: string | null
}

export function ReturnsTable({ returns: data }: { returns: Return[] }) {
  const router = useRouter()

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta devolución? El stock NO se revertirá.')) return
    try {
      await deleteReturn(id)
      toast.success('Devolución eliminada')
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
            <TableHead>Fecha</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Reembolso</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Venta #</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No hay devoluciones registradas
              </TableCell>
            </TableRow>
          )}
          {data.map(r => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.date).toLocaleDateString('es-AR')}</TableCell>
              <TableCell className="font-medium">
                {r.productName}
                {r.productFlavor && <span className="text-muted-foreground"> · {r.productFlavor}</span>}
              </TableCell>
              <TableCell>{r.clientName ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.refundAmount ? `$${Number(r.refundAmount).toLocaleString('es-AR')}` : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{r.reason ?? '—'}</TableCell>
              <TableCell className="text-right text-muted-foreground">{r.saleId ?? '—'}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
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
