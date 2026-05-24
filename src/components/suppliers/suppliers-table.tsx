'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SupplierFormDialog } from './supplier-form-dialog'
import { deleteSupplier } from '@/actions/suppliers'
import { toast } from 'sonner'
import { Trash2, Phone, Mail, User, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  contactName: string | null
  notes: string | null
  createdAt: Date | null
  totalOrders: number
  totalInvested: string
  lastOrder: Date | null
}

type SortField = 'name' | 'totalOrders' | 'totalInvested' | 'lastOrder'

const $ = (n: string | number) => `$${Math.round(Number(n)).toLocaleString('es-AR')}`

export function SuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
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
      ? suppliers.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.contactName?.toLowerCase().includes(q) ||
          s.phone?.includes(q)
        )
      : [...suppliers]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'name':          av = a.name;                   bv = b.name;                   break
        case 'totalOrders':   av = a.totalOrders;            bv = b.totalOrders;            break
        case 'totalInvested': av = Number(a.totalInvested);  bv = Number(b.totalInvested);  break
        case 'lastOrder':
          av = a.lastOrder ? new Date(a.lastOrder).getTime() : 0
          bv = b.lastOrder ? new Date(b.lastOrder).getTime() : 0
          break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [suppliers, search, sortField, sortDir])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar proveedor "${name}"?`)) return
    try {
      await deleteSupplier(id)
      toast.success('Proveedor eliminado')
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
        placeholder="Buscar proveedor..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="name">Proveedor</SortHead>
              <TableHead>Contacto</TableHead>
              <SortHead field="totalOrders" className="text-right">Pedidos</SortHead>
              <SortHead field="totalInvested" className="text-right">Total invertido</SortHead>
              <SortHead field="lastOrder">Último pedido</SortHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay proveedores registrados</TableCell>
              </TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {s.contactName && <div className="flex items-center gap-1 text-sm"><User className="w-3 h-3 text-muted-foreground" /><span>{s.contactName}</span></div>}
                    {s.phone && <div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" /><span>{s.phone}</span></div>}
                    {s.email && <div className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="w-3 h-3" /><span>{s.email}</span></div>}
                    {!s.contactName && !s.phone && !s.email && <span className="text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{Number(s.totalOrders)}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {Number(s.totalInvested) > 0 ? $(s.totalInvested) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.lastOrder ? new Date(s.lastOrder).toLocaleDateString('es-AR') : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <SupplierFormDialog mode="edit" supplier={s} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id, s.name)}>
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
