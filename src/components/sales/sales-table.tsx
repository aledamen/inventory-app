'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SaleEditDialog } from './sale-edit-dialog'
import { deleteSale } from '@/actions/sales'
import type { ProductWithRelations, SaleWithProduct } from '@/types'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SortField = 'saleNumber' | 'date' | 'productName' | 'quantity' | 'effectivePrice' | 'totalSale' | 'netProfit' | 'paymentMethod'

type Props = {
  sales: SaleWithProduct[]
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
}

export function SalesTable({ sales, products, lookups }: Props) {
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
      ? sales.filter(s =>
          s.productName?.toLowerCase().includes(q) ||
          s.productSku?.toLowerCase().includes(q) ||
          s.paymentMethod?.toLowerCase().includes(q) ||
          s.notes?.toLowerCase().includes(q)
        )
      : [...sales]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'saleNumber':   av = a.saleNumber;                    bv = b.saleNumber;                    break
        case 'date':         av = new Date(a.date).getTime();      bv = new Date(b.date).getTime();      break
        case 'productName':  av = a.productName ?? '';             bv = b.productName ?? '';             break
        case 'quantity':     av = a.quantity;                      bv = b.quantity;                      break
        case 'effectivePrice': av = Number(a.effectivePrice ?? 0); bv = Number(b.effectivePrice ?? 0);  break
        case 'totalSale':    av = Number(a.totalSale ?? 0);        bv = Number(b.totalSale ?? 0);        break
        case 'netProfit':    av = Number(a.netProfit ?? 0);        bv = Number(b.netProfit ?? 0);        break
        case 'paymentMethod': av = a.paymentMethod ?? '';          bv = b.paymentMethod ?? '';           break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [sales, search, sortField, sortDir])

  async function handleDelete(id: number, num: number) {
    if (!confirm(`¿Eliminar venta #${num}? Se restaurará el stock.`)) return
    try {
      await deleteSale(id)
      toast.success('Venta eliminada')
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
        placeholder="Buscar por producto, SKU o método de pago..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="saleNumber" className="w-16">#</SortHead>
              <SortHead field="date">Fecha</SortHead>
              <TableHead>SKU</TableHead>
              <SortHead field="productName">Producto</SortHead>
              <SortHead field="quantity" className="text-right">Cant.</SortHead>
              <SortHead field="effectivePrice" className="text-right">Precio</SortHead>
              <SortHead field="totalSale" className="text-right">Total</SortHead>
              <SortHead field="netProfit" className="text-right">Ganancia neta</SortHead>
              <SortHead field="paymentMethod">Método pago</SortHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No hay ventas
                </TableCell>
              </TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground">{s.saleNumber}</TableCell>
                <TableCell>{new Date(s.date).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="font-mono text-xs">{s.productSku}</TableCell>
                <TableCell>
                  {s.productName}
                  {s.productFlavor && <span className="text-muted-foreground"> · {s.productFlavor}</span>}
                </TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right">
                  {s.effectivePrice ? `$${Number(s.effectivePrice).toLocaleString('es-AR')}` : '—'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {s.totalSale ? `$${Number(s.totalSale).toLocaleString('es-AR')}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {s.netProfit ? (
                    <Badge variant={Number(s.netProfit) >= 0 ? 'secondary' : 'destructive'} className={Number(s.netProfit) >= 0 ? 'text-green-700' : ''}>
                      ${Number(s.netProfit).toLocaleString('es-AR')}
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>{s.paymentMethod ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <SaleEditDialog sale={s} products={products} lookups={lookups} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id, s.saleNumber)}
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
