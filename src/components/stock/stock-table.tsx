'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StockEditGroupDialog } from './stock-edit-group-dialog'
import { deleteStockMovement } from '@/actions/stock'
import type { ProductWithRelations, StockMovementWithProduct } from '@/types'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

type SortField = 'movementNumber' | 'date' | 'productName' | 'quantity' | 'unitCost' | 'total' | 'paymentMethod' | 'supplierName'

type Props = {
  movements: StockMovementWithProduct[]
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  suppliers: { id: number; name: string }[]
}

export function StockTable({ movements, products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<StockMovementWithProduct | null>(null)

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
          m.supplierName?.toLowerCase().includes(q) ||
          m.note?.toLowerCase().includes(q)
        )
      : [...movements]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'movementNumber': av = a.movementNumber;               bv = b.movementNumber;               break
        case 'date':           av = new Date(a.date).getTime() * 10000 + a.movementNumber; bv = new Date(b.date).getTime() * 10000 + b.movementNumber; break
        case 'productName':    av = a.productName ?? '';            bv = b.productName ?? '';            break
        case 'quantity':       av = a.quantity;                     bv = b.quantity;                     break
        case 'unitCost':       av = Number(a.unitCost ?? 0);        bv = Number(b.unitCost ?? 0);        break
        case 'total':          av = Number(a.total ?? 0);           bv = Number(b.total ?? 0);           break
        case 'paymentMethod':  av = a.paymentMethod ?? '';          bv = b.paymentMethod ?? '';          break
        case 'supplierName':   av = a.supplierName ?? '';           bv = b.supplierName ?? '';           break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [movements, search, sortField, sortDir])

  const grouped = useMemo(() => {
    const map = new Map<number, StockMovementWithProduct[]>()
    for (const m of filtered) {
      map.set(m.movementNumber, [...(map.get(m.movementNumber) ?? []), m])
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([num, rows]) => ({
        movementNumber: num,
        rows,
        groupTotal: rows.reduce((s, m) => s + Number(m.total ?? 0), 0),
        shippingCost: Number(rows[0]?.shippingCost ?? 0),
      }))
  }, [filtered])

  const totals = useMemo(() => ({
    quantity: filtered.reduce((s, m) => s + m.quantity, 0),
    total: filtered.reduce((s, m) => s + Number(m.total ?? 0), 0),
  }), [filtered])

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
    <>
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
                <SortHead field="supplierName">Proveedor</SortHead>
                <SortHead field="paymentMethod">Método pago</SortHead>
                <TableHead>Nota</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No hay movimientos
                  </TableCell>
                </TableRow>
              )}
              {grouped.map((group) => (
                <>
                  {group.rows.map((m, rowIdx) => (
                    <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                      {rowIdx === 0 && (
                        <TableCell className="text-muted-foreground font-mono" rowSpan={group.rows.length}>
                          {m.movementNumber}
                        </TableCell>
                      )}
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
                      <TableCell>{m.supplierName ?? '—'}</TableCell>
                      <TableCell>{m.paymentMethod ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[12rem] truncate">{m.note ?? '—'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(m.id, m.movementNumber)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 border-b-2">
                    <TableCell colSpan={6} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 pl-8">
                      Total compra #{group.movementNumber}
                      {group.shippingCost > 0 && (
                        <span className="ml-2 font-normal normal-case">(incl. envío ${group.shippingCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm py-1.5">
                      {group.groupTotal > 0 ? `$${group.groupTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—'}
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell className="py-1.5" onClick={e => e.stopPropagation()}>
                      <StockEditGroupDialog
                        movementNumber={group.movementNumber}
                        rows={group.rows}
                        products={products}
                        lookups={lookups}
                        suppliers={suppliers}
                      />
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                    Total ({filtered.length} entradas)
                  </TableCell>
                  <TableCell className="text-right font-semibold">{totals.quantity}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold">
                    ${totals.total.toLocaleString('es-AR')}
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      <Sheet open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        <SheetContent className="sm:max-w-md flex flex-col gap-0 p-0">
          {selected && (
            <>
              <SheetHeader className="p-6 pb-4 border-b">
                <SheetTitle>Entrada #{selected.movementNumber}</SheetTitle>
                <SheetDescription>{new Date(selected.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground">Producto</p>
                  <p className="text-sm font-medium mt-0.5">
                    {selected.productName}
                    {selected.productFlavor && <span className="text-muted-foreground"> · {selected.productFlavor}</span>}
                  </p>
                  {selected.productSku && <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.productSku}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cantidad</p>
                    <p className="text-sm font-medium mt-0.5">{selected.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Costo unitario</p>
                    <p className="text-sm font-medium mt-0.5">
                      {selected.unitCost ? `$${Number(selected.unitCost).toLocaleString('es-AR')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {selected.total ? `$${Number(selected.total).toLocaleString('es-AR')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Método de pago</p>
                    <p className="text-sm font-medium mt-0.5">{selected.paymentMethod ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Proveedor</p>
                    <p className="text-sm font-medium mt-0.5">{selected.supplierName ?? '—'}</p>
                  </div>
                </div>

                {selected.note && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nota</p>
                    <p className="text-sm">{selected.note}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
