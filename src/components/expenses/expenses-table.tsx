'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateExpense, deleteExpense } from '@/actions/expenses'
import { Trash2, Pencil, Check, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Expense = { id: number; type: string; total: string; date: Date | null }
type EditState = { type: string; total: string; date: string }
type SortField = 'type' | 'total' | 'date'

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(false)

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = q ? expenses.filter(e => e.type.toLowerCase().includes(q)) : [...expenses]
    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'type':  av = a.type;             bv = b.type;             break
        case 'total': av = Number(a.total);    bv = Number(b.total);    break
        case 'date':
          av = a.date ? new Date(a.date).getTime() : 0
          bv = b.date ? new Date(b.date).getTime() : 0
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [expenses, search, sortField, sortDir])

  function startEdit(e: Expense) {
    setEditingId(e.id)
    setEditState({
      type: e.type,
      total: String(Number(e.total)),
      date: e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
  }

  async function saveEdit(id: number) {
    if (!editState) return
    setLoading(true)
    try {
      await updateExpense(id, { type: editState.type, total: Number(editState.total), date: new Date(editState.date) })
      toast.success('Gasto actualizado')
      setEditingId(null)
      router.refresh()
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number, type: string) {
    if (!confirm(`¿Eliminar gasto "${type}"?`)) return
    try {
      await deleteExpense(id)
      toast.success('Gasto eliminado')
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
      <Input placeholder="Buscar por tipo..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="type">Tipo</SortHead>
              <SortHead field="total" className="text-right">Total</SortHead>
              <SortHead field="date">Fecha</SortHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay gastos registrados</TableCell>
              </TableRow>
            )}
            {filtered.map(e => {
              const isEditing = editingId === e.id
              return (
                <TableRow key={e.id}>
                  {isEditing && editState ? (
                    <>
                      <TableCell>
                        <Input value={editState.type} onChange={ev => setEditState(s => s ? { ...s, type: ev.target.value } : s)} className="h-7 text-sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input value={editState.total} onChange={ev => setEditState(s => s ? { ...s, total: ev.target.value } : s)} type="number" className="h-7 text-sm w-28 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Input value={editState.date} onChange={ev => setEditState(s => s ? { ...s, date: ev.target.value } : s)} type="date" className="h-7 text-sm w-36" />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{e.type}</TableCell>
                      <TableCell className="text-right">${Number(e.total).toLocaleString('es-AR')}</TableCell>
                      <TableCell className="text-muted-foreground">{e.date ? new Date(e.date).toLocaleDateString('es-AR') : '—'}</TableCell>
                    </>
                  )}
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(e.id)} disabled={loading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(e.id, e.type)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
