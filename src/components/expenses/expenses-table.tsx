'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/actions/expenses'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Expense = {
  id: number
  type: string
  total: string
  date: Date | null
}

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()

  async function handleDelete(id: number, type: string) {
    if (!confirm(`¿Eliminar gasto "${type}"?`)) return
    try {
      await deleteExpense(id)
      toast.success('Gasto eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No hay gastos registrados
              </TableCell>
            </TableRow>
          )}
          {expenses.map(e => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.type}</TableCell>
              <TableCell className="text-right">${Number(e.total).toLocaleString('es-AR')}</TableCell>
              <TableCell className="text-muted-foreground">
                {e.date ? new Date(e.date).toLocaleDateString('es-AR') : '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(e.id, e.type)}
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
