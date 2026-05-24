'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientFormDialog } from './client-form-dialog'
import { deleteClient } from '@/actions/clients'
import { toast } from 'sonner'
import { Trash2, Phone, Mail, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Client = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  createdAt: Date | null
  totalSales: number
  totalSpent: string
  lastPurchase: Date | null
}

type SortField = 'name' | 'totalSales' | 'totalSpent' | 'lastPurchase'

const $ = (n: string | number) => `$${Math.round(Number(n)).toLocaleString('es-AR')}`

export function ClientsTable({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = q
      ? clients.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
        )
      : [...clients]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'name':         av = a.name;                    bv = b.name;                    break
        case 'totalSales':   av = a.totalSales;              bv = b.totalSales;              break
        case 'totalSpent':   av = Number(a.totalSpent);      bv = Number(b.totalSpent);      break
        case 'lastPurchase':
          av = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0
          bv = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [clients, search, sortField, sortDir])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar cliente "${name}"?`)) return
    try {
      await deleteClient(id)
      toast.success('Cliente eliminado')
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
        placeholder="Buscar por nombre, teléfono o email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="name">Cliente</SortHead>
              <TableHead>Contacto</TableHead>
              <SortHead field="totalSales" className="text-right">Compras</SortHead>
              <SortHead field="totalSpent" className="text-right">Total gastado</SortHead>
              <SortHead field="lastPurchase">Última compra</SortHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay clientes registrados</TableCell>
              </TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" /><span>{c.phone}</span></div>}
                    {c.email && <div className="flex items-center gap-1 text-sm"><Mail className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground">{c.email}</span></div>}
                    {!c.phone && !c.email && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{Number(c.totalSales)}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {Number(c.totalSpent) > 0 ? $(c.totalSpent) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString('es-AR') : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <ClientFormDialog mode="edit" client={c} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
