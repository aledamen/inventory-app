'use client'

import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteAdjustment } from '@/actions/adjustments'
import { toast } from 'sonner'
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'

type Adjustment = {
  id: number; date: Date; quantity: number; reason: string
  productId: number; productName: string | null; productFlavor: string | null; productSku: string | null
  createdAt: Date | null
}

export function AdjustmentsTable({ adjustments }: { adjustments: Adjustment[] }) {
  const router = useRouter()

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este ajuste? El stock NO se revertirá.')) return
    try {
      await deleteAdjustment(id)
      toast.success('Ajuste eliminado')
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
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Ajuste</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay ajustes registrados</TableCell>
            </TableRow>
          )}
          {adjustments.map(a => (
            <TableRow key={a.id}>
              <TableCell>{new Date(a.date).toLocaleDateString('es-AR')}</TableCell>
              <TableCell className="font-mono text-xs">{a.productSku ?? '—'}</TableCell>
              <TableCell className="font-medium">
                {a.productName}
                {a.productFlavor && <span className="text-muted-foreground"> · {a.productFlavor}</span>}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={a.quantity >= 0 ? 'secondary' : 'destructive'}
                  className={`gap-1 tabular-nums ${a.quantity >= 0 ? 'text-green-700' : ''}`}
                >
                  {a.quantity >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {a.quantity > 0 ? `+${a.quantity}` : a.quantity}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{a.reason}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
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
