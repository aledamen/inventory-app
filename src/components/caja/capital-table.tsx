'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteCapitalMovement } from '@/actions/capital'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CapitalMovement } from '@/actions/capital'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export function CapitalTable({ movements }: { movements: CapitalMovement[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<number | null>(null)

  const sorted = useMemo(
    () => [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [movements]
  )

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este movimiento?')) return
    setDeleting(id)
    try {
      await deleteCapitalMovement(id)
      toast.success('Movimiento eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Sin movimientos registrados
              </TableCell>
            </TableRow>
          )}
          {sorted.map(m => (
            <TableRow key={m.id}>
              <TableCell>
                <Badge variant={m.type === 'aporte' ? 'default' : 'secondary'}>
                  {m.type === 'aporte' ? 'Aporte' : 'Retiro'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{m.notes ?? '—'}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                <span className={m.type === 'aporte' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {m.type === 'retiro' ? '−' : '+'}{$(Number(m.amount))}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(m.date).toLocaleDateString('es-AR')}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={deleting === m.id}
                  onClick={() => handleDelete(m.id)}
                >
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
