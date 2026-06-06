'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateReturn, deleteReturn } from '@/actions/returns'
import { toast } from 'sonner'
import { Trash2, Pencil, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type Product = { id: number; name: string; flavor: string | null; sku: string }
type Client = { id: number; name: string }
type SortField = 'date' | 'productName' | 'clientName' | 'quantity' | 'refundAmount'

type Props = {
  returns: Return[]
  products: Product[]
  clients: Client[]
}

function ReturnEditDialog({ ret, products, clients }: { ret: Return; products: Product[]; clients: Client[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState('')
  const [clientId, setClientId] = useState('')

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) {
      const matchedProduct = products.find(p =>
        `${p.name}${p.flavor ? ` · ${p.flavor}` : ''}` === `${ret.productName}${ret.productFlavor ? ` · ${ret.productFlavor}` : ''}`
      )
      const matchedClient = clients.find(c => c.name === ret.clientName)
      setProductId(matchedProduct ? String(matchedProduct.id) : '')
      setClientId(matchedClient ? String(matchedClient.id) : '')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!productId) { toast.error('Seleccioná un producto'); return }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await updateReturn(ret.id, {
        productId: Number(productId),
        clientId: clientId ? Number(clientId) : null,
        saleId: fd.get('saleId') ? Number(fd.get('saleId')) : null,
        quantity: Number(fd.get('quantity')),
        reason: (fd.get('reason') as string) || undefined,
        refundAmount: fd.get('refundAmount') ? Number(fd.get('refundAmount')) : null,
        date: new Date(`${fd.get('date') as string}T00:00:00`),
      })
      toast.success('Devolución actualizada')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar devolución</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select value={productId} onValueChange={v => setProductId(v ?? '')} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}{p.flavor ? ` · ${p.flavor}` : ''} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cantidad *</Label>
              <Input name="quantity" type="number" min="1" defaultValue={ret.quantity} required />
            </div>
            <div className="space-y-1.5">
              <Label>Reembolso</Label>
              <Input name="refundAmount" type="number" step="0.01" defaultValue={ret.refundAmount ? Number(ret.refundAmount) : ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={v => setClientId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input name="date" type="date" defaultValue={new Date(ret.date).toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Venta #</Label>
              <Input name="saleId" type="number" defaultValue={ret.saleId ?? ''} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea name="reason" rows={2} defaultValue={ret.reason ?? ''} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Actualizar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ReturnsTable({ returns: data, products, clients }: Props) {
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
      ? data.filter(r =>
          r.productName?.toLowerCase().includes(q) ||
          r.clientName?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q)
        )
      : [...data]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'date':         av = new Date(a.date).getTime();      bv = new Date(b.date).getTime();      break
        case 'productName':  av = a.productName ?? '';             bv = b.productName ?? '';             break
        case 'clientName':   av = a.clientName ?? '';              bv = b.clientName ?? '';              break
        case 'quantity':     av = a.quantity;                      bv = b.quantity;                      break
        case 'refundAmount': av = Number(a.refundAmount ?? 0);     bv = Number(b.refundAmount ?? 0);     break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [data, search, sortField, sortDir])

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta devolución? El stock NO se revertirá.')) return
    try {
      await deleteReturn(id)
      toast.success('Devolución eliminada')
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
      <Input placeholder="Buscar por producto, cliente o motivo..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="date">Fecha</SortHead>
              <SortHead field="productName">Producto</SortHead>
              <SortHead field="clientName">Cliente</SortHead>
              <SortHead field="quantity" className="text-right">Cantidad</SortHead>
              <SortHead field="refundAmount" className="text-right">Reembolso</SortHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Venta #</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay devoluciones registradas</TableCell>
              </TableRow>
            )}
            {filtered.map(r => (
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
                  <div className="flex gap-1">
                    <ReturnEditDialog ret={r} products={products} clients={clients} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
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
