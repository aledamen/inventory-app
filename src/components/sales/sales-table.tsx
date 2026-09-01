'use client'

import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SaleEditDialog } from './sale-edit-dialog'
import { SaleDetailSheet } from './sale-detail-sheet'
import { deleteSale, toggleSalePaid } from '@/actions/sales'
import type { ProductWithRelations, SaleWithProduct } from '@/types'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SortField = 'saleNumber' | 'date' | 'productName' | 'quantity' | 'effectivePrice' | 'totalSale' | 'netProfit' | 'paymentMethod'

type Client = { id: number; name: string; phone: string | null }

type Props = {
  sales: SaleWithProduct[]
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  clients?: Client[]
}

export function SalesTable({ sales, products, lookups, clients = [] }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<SaleWithProduct | null>(null)

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
        case 'saleNumber':    av = a.saleNumber;                    bv = b.saleNumber;                    break
        case 'date':          av = new Date(a.date).getTime();      bv = new Date(b.date).getTime();      break
        case 'productName':   av = a.productName ?? '';             bv = b.productName ?? '';             break
        case 'quantity':      av = a.quantity;                      bv = b.quantity;                      break
        case 'effectivePrice':av = Number(a.effectivePrice ?? 0);   bv = Number(b.effectivePrice ?? 0);   break
        case 'totalSale':     av = Number(a.saleValue ?? 0);        bv = Number(b.saleValue ?? 0);        break
        case 'netProfit':     av = Number(a.netProfit ?? 0);        bv = Number(b.netProfit ?? 0);        break
        case 'paymentMethod': av = a.paymentMethod ?? '';           bv = b.paymentMethod ?? '';           break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [sales, search, sortField, sortDir])

  // Group by saleNumber maintaining sort order
  const grouped = useMemo(() => {
    const map = new Map<number, SaleWithProduct[]>()
    for (const row of filtered) {
      const g = map.get(row.saleNumber)
      if (g) g.push(row)
      else map.set(row.saleNumber, [row])
    }
    return Array.from(map.values())
  }, [filtered])

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

  async function handleTogglePaid(id: number, paid: boolean) {
    try {
      await toggleSalePaid(id, paid)
      router.refresh()
    } catch {
      toast.error('Error al actualizar el estado de pago')
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
    <>
      <div className="space-y-4">
        <Input
          placeholder="Buscar por producto, SKU o método de pago..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
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
                <TableHead>Pagado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No hay ventas
                  </TableCell>
                </TableRow>
              )}
              {grouped.map(group => {
                const isMulti = group.length > 1
                const groupTotal = group.reduce((s, r) => s + Number(r.saleValue ?? 0), 0)
                const groupProfit = group.reduce((s, r) => s + Number(r.netProfit ?? 0), 0)
                const groupQty = group.reduce((s, r) => s + r.quantity, 0)

                return (
                  <Fragment key={group[0].saleNumber}>
                    {group.map((s, i) => (
                      <TableRow
                        key={s.id}
                        className={cn('cursor-pointer', isMulti && 'border-b-0')}
                        onClick={() => setSelected(s)}
                      >
                        <TableCell className="text-muted-foreground">{i === 0 ? s.saleNumber : ''}</TableCell>
                        <TableCell>{i === 0 ? new Date(s.date).toLocaleDateString('es-AR') : ''}</TableCell>
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
                          {s.saleValue ? `$${Number(s.saleValue).toLocaleString('es-AR')}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.netProfit ? (
                            <Badge variant={Number(s.netProfit) >= 0 ? 'secondary' : 'destructive'} className={Number(s.netProfit) >= 0 ? 'text-green-700' : ''}>
                              ${Number(s.netProfit).toLocaleString('es-AR')}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{i === 0 ? (s.paymentMethod ?? '—') : ''}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {i === 0 && (
                            <button type="button" onClick={() => handleTogglePaid(s.id, !s.paid)}>
                              <Badge
                                variant={s.paid ? 'secondary' : 'destructive'}
                                className={cn('cursor-pointer', s.paid && 'text-green-700')}
                              >
                                {s.paid ? 'Pagado' : 'Pendiente'}
                              </Badge>
                            </button>
                          )}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <SaleEditDialog sale={s} products={products} lookups={lookups} clients={clients} />
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
                    {isMulti && (
                      <TableRow className="bg-muted/40 border-b-2">
                        <TableCell />
                        <TableCell colSpan={3} className="text-xs text-muted-foreground font-medium py-1.5">
                          Total venta #{group[0].saleNumber}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums py-1.5">{groupQty}</TableCell>
                        <TableCell />
                        <TableCell className="text-right font-semibold tabular-nums py-1.5">
                          ${groupTotal.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-green-700 py-1.5">
                          ${groupProfit.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
              {filtered.length > 0 && (() => {
                const totalQty = filtered.reduce((a, s) => a + s.quantity, 0)
                const totalRev = filtered.reduce((a, s) => a + Number(s.saleValue ?? 0), 0)
                const totalProfit = filtered.reduce((a, s) => a + Number(s.netProfit ?? 0), 0)
                const uniqueSales = new Set(filtered.map(s => s.saleNumber)).size
                return (
                  <TableRow className="border-t-2 font-semibold bg-muted/40">
                    <TableCell colSpan={2} className="text-muted-foreground text-xs">
                      {filtered.length} filas · {uniqueSales} ventas
                    </TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right tabular-nums">{totalQty}</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">${totalRev.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-700">${totalProfit.toLocaleString('es-AR')}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )
              })()}
            </TableBody>
          </Table>
        </div>
      </div>

      <SaleDetailSheet sale={selected} onOpenChange={(o) => { if (!o) setSelected(null) }} />
    </>
  )
}
