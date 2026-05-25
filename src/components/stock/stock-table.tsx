'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StockEditDialog } from './stock-edit-dialog'
import { deleteStockMovement } from '@/actions/stock'
import type { ProductWithRelations, StockMovementWithProduct } from '@/types'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SortField = 'movementNumber' | 'date' | 'productName' | 'quantity' | 'unitCost' | 'total' | 'paymentMethod'

type Props = {
  movements: StockMovementWithProduct[]
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
}

export function StockTable({ movements, products, lookups }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = q
      ? movements.filter(m =>
          m.productName?.toLowerCase().includes(q) ||
          m.productSku?.toLowerCase().includes(q) ||
          m.paymentMethod?.toLowerCase().includes(q) ||
          m.note?.toLowerCase().includes(q)
        )
      : [...movements]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'movementNumber': av = a.movementNumber;                  bv = b.movementNumber;                  break
        case 'date':           av = new Date(a.date).getTime();        bv = new Date(b.date).getTime();        break
        case 'productName':    av = a.productName ?? '';               bv = b.productName ?? '';               break
        case 'quantity':       av = a.quantity;                        bv = b.quantity;                        break
        case 'unitCost':       av = Number(a.unitCost ?? 0);           bv = Number(b.unitCost ?? 0);           break
        case 'total':          av = Number(a.total ?? 0);              bv = Number(b.total ?? 0);              break
        case 'paymentMethod':  av = a.paymentMethod ?? '';             bv = b.paymentMethod ?? '';             break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [movements, search, sortField, sortDir])

  async function handleDelete(id: number, num: number) {
    if (!confirm(`¿Eliminar entrada #${num}? Se ajustará el stock.`)) return
    try {
      await deleteStockMovement(id)
      toast.success('Entrada eliminada')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  function SortHead({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortField === field
    return (
      <TableHead
        className={cn('cursor-pointer select-none hover:text-foreground', className)}
        onClick={() => handleSort(field)}
      >
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
        placeholder="Buscar por producto, SKU, método de pago o nota..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="movementNumber" className="w-16">#</SortHead>
              <SortHead field="date">Fecha</SortHead>
              <TableHead>SKU</TableHead>
              <SortHead field="productName">Producto</SortHead>
              <SortHead field="quantity" className="text-right">Cant.</SortHead>
              <SortHead field="unitCost" className="text-right">Costo unit.</SortHead>
              <SortHead field="total" className="text-right">Total</SortHead>
              <SortHead field="paymentMethod">Método pago</SortHead>
              <TableHead>Nota</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No hay movimientos
                </TableCell>
              </TableRow>
            )}
            {filtered.map(m => (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground">{m.movementNumber}</TableCell>
                <TableCell>{new Date(m.date).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="font-mono text-xs">{m.productSku}</TableCell>
                <TableCell>
                  {m.productName}
                  {m.productFlavor && <span className="text-muted-foreground"> · {m.productFlavor}</span>}
                </TableCell>
                <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                <TableCell className="text-right">
                  {m.unitCost ? `$${Number(m.unitCost).toLocaleString('es-AR')}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {m.total ? `$${Number(m.total).toLocaleString('es-AR')}` : '—'}
                </TableCell>
                <TableCell>{m.paymentMethod ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[12rem] truncate">{m.note ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <StockEditDialog movement={m} products={products} lookups={lookups} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(m.id, m.movementNumber)}
                    >
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
