'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { markContactado, markNoQuiere, reopenPair, updateNotes } from '@/actions/recontacto'
import type { RecontactRow } from '@/actions/recontacto'
import type { CascadeResult } from '@/lib/recontact-cascade'
import { Check, X, Pencil, MessageCircle, RotateCcw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type StatusFilter = 'activos' | 'todos' | 'no_quiere'
type SortField = 'productName' | 'lastSaleDate' | 'dueDate' | 'estado'

function SortHead({ field, sortField, sortDir, onSort, children, className }: {
  field: SortField
  sortField: SortField
  sortDir: 'asc' | 'desc'
  onSort: (field: SortField) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sortField === field
  return (
    <TableHead className={cn('cursor-pointer select-none hover:text-foreground', className)} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {active
          ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  )
}

function cascadeBadge(cascade: CascadeResult) {
  switch (cascade.kind) {
    case 'escribirle_ya':
      return <Badge variant="destructive">{cascade.label}</Badge>
    case 'esta_semana':
      return <Badge variant="default">{cascade.label}</Badge>
    case 'en_n_dias':
      return <Badge variant="outline">{cascade.label}</Badge>
    case 'seguirlo':
      return <Badge variant="destructive">{cascade.label}</Badge>
    case 'esperando':
      return <Badge variant="secondary">{cascade.label}</Badge>
    case 'closed':
      return <Badge variant="outline" className="text-muted-foreground">{cascade.label}</Badge>
  }
}

export function RecontactTable({ rows }: { rows: RecontactRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('activos')
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const rowsFiltered = rows.filter(r => {
      if (statusFilter === 'activos' && r.cascade.kind === 'closed') return false
      if (statusFilter === 'no_quiere' && r.cascade.kind !== 'closed') return false
      if (!q) return true
      return r.clientName.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q)
    })
    rowsFiltered.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'productName': av = a.productName; bv = b.productName; break
        case 'lastSaleDate': av = a.lastSaleDate.getTime(); bv = b.lastSaleDate.getTime(); break
        case 'dueDate': av = a.dueDate.getTime(); bv = b.dueDate.getTime(); break
        case 'estado': av = a.cascade.kind; bv = b.cascade.kind; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rowsFiltered
  }, [rows, search, statusFilter, sortField, sortDir])

  function key(r: RecontactRow) {
    return `${r.clientId}-${r.productId}`
  }

  async function handleMarkContactado(r: RecontactRow) {
    setLoadingKey(key(r))
    try {
      await markContactado(r.saleId, r.clientId, r.productId)
      toast.success(`${r.clientName} marcado como contactado`)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoadingKey(null)
    }
  }

  async function handleMarkNoQuiere(r: RecontactRow) {
    if (!confirm(`¿Marcar a ${r.clientName} como "No quiere" para ${r.productName}?`)) return
    setLoadingKey(key(r))
    try {
      await markNoQuiere(r.saleId, r.clientId, r.productId)
      toast.success('Actualizado')
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoadingKey(null)
    }
  }

  async function handleReopen(r: RecontactRow) {
    if (!confirm(`¿Reabrir a ${r.clientName} para ${r.productName}?`)) return
    setLoadingKey(key(r))
    try {
      await reopenPair(r.saleId, r.clientId, r.productId)
      toast.success('Reabierto')
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoadingKey(null)
    }
  }

  function startEditNotes(r: RecontactRow) {
    setEditingKey(key(r))
    setNotesDraft(r.notes ?? '')
  }

  async function saveNotes(r: RecontactRow) {
    setLoadingKey(key(r))
    try {
      await updateNotes(r.saleId, r.clientId, r.productId, notesDraft || null)
      toast.success('Notas actualizadas')
      setEditingKey(null)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Buscar por cliente o producto..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Select
          value={statusFilter}
          onValueChange={v => setStatusFilter((v as StatusFilter) ?? 'activos')}
          items={[
            { value: 'activos', label: 'Activos' },
            { value: 'no_quiere', label: 'No quiere' },
            { value: 'todos', label: 'Todos' },
          ]}
        >
          <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="no_quiere">No quiere</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <SortHead field="productName" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Producto</SortHead>
              <SortHead field="lastSaleDate" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Última venta</SortHead>
              <SortHead field="dueDate" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Vence</SortHead>
              <SortHead field="estado" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Estado</SortHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin recontactos pendientes</TableCell>
              </TableRow>
            )}
            {filtered.map(r => {
              const k = key(r)
              const isLoading = loadingKey === k
              const isEditingNotes = editingKey === k
              return (
                <TableRow key={k}>
                  <TableCell className="font-medium">
                    <div>{r.clientName}</div>
                    {r.clientPhone && <div className="text-xs text-muted-foreground">{r.clientPhone}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.productName}
                    {r.purchaseCount > 1 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">({r.purchaseCount}x)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.lastSaleDate.toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.dueDate.toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>{cascadeBadge(r.cascade)}</TableCell>
                  <TableCell className="min-w-48">
                    {isEditingNotes ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={notesDraft}
                          onChange={e => setNotesDraft(e.target.value)}
                          className="h-7 text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveNotes(r)} disabled={isLoading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingKey(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="text-sm text-muted-foreground truncate">{r.notes ?? '—'}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => startEditNotes(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.cascade.kind !== 'closed' ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-600"
                          disabled={isLoading}
                          onClick={() => handleMarkContactado(r)}
                          title="Marcar contactado"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isLoading}
                          onClick={() => handleMarkNoQuiere(r)}
                          title="No quiere"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={isLoading}
                          onClick={() => handleReopen(r)}
                          title="Reabrir"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
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
