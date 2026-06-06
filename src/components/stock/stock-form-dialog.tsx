'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { createMultiStockMovement } from '@/actions/stock'
import type { ProductWithRelations } from '@/types'
import { Plus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

export type StockItem = {
  key: string
  productId: string
  quantity: number
  unitCost: number
}

type Props = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  suppliers: { id: number; name: string }[]
}

export function newStockItem(): StockItem {
  return { key: Math.random().toString(36).slice(2), productId: '', quantity: 1, unitCost: 0 }
}

export function StockFormDialog({ products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<StockItem[]>([newStockItem()])
  const [supplierId, setSupplierId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [shippingCost, setShippingCost] = useState(0)

  const itemsSubtotal = useMemo(() => items.reduce((s, i) => s + i.unitCost * i.quantity, 0), [items])
  const purchaseTotal = itemsSubtotal + shippingCost

  function updateItem(key: string, patch: Partial<StockItem>) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  function removeItem(key: string) {
    if (items.length === 1) return
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function handleProductSelect(key: string, productId: string) {
    const p = products.find(p => String(p.id) === productId)
    updateItem(key, { productId, unitCost: p?.cost ? Number(p.cost) : 0 })
  }

  function reset() {
    setItems([newStockItem()])
    setSupplierId('')
    setPaymentMethodId('')
    setShippingCost(0)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const validItems = items.filter(i => i.productId)
    if (validItems.length === 0) return toast.error('Agregá al menos un producto')
    setLoading(true)
    try {
      await createMultiStockMovement({
        items: validItems.map(i => ({ productId: Number(i.productId), quantity: i.quantity, unitCost: i.unitCost || undefined })),
        supplierId: supplierId ? Number(supplierId) : undefined,
        paymentMethodId: paymentMethodId ? Number(paymentMethodId) : undefined,
        shippingCost: shippingCost > 0 ? shippingCost : undefined,
        note: (fd.get('note') as string) || undefined,
        date: fd.get('date') ? new Date(`${fd.get('date') as string}T00:00:00`) : new Date(),
      })
      toast.success('Entrada registrada')
      setOpen(false)
      reset()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nueva entrada
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva entrada de stock</DialogTitle>
        </DialogHeader>
        <StockPurchaseForm
          products={products}
          lookups={lookups}
          suppliers={suppliers}
          items={items}
          supplierId={supplierId}
          paymentMethodId={paymentMethodId}
          shippingCost={shippingCost}
          itemsSubtotal={itemsSubtotal}
          purchaseTotal={purchaseTotal}
          loading={loading}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onProductSelect={handleProductSelect}
          onAddItem={() => setItems(prev => [...prev, newStockItem()])}
          onSupplierChange={setSupplierId}
          onPaymentChange={setPaymentMethodId}
          onShippingChange={setShippingCost}
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
          submitLabel="Registrar"
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Shared form body ────────────────────────────────────────────────────────

type FormProps = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  suppliers: { id: number; name: string }[]
  items: StockItem[]
  supplierId: string
  paymentMethodId: string
  shippingCost: number
  itemsSubtotal: number
  purchaseTotal: number
  loading: boolean
  defaultDate?: string
  onUpdateItem: (key: string, patch: Partial<StockItem>) => void
  onRemoveItem: (key: string) => void
  onProductSelect: (key: string, productId: string) => void
  onAddItem: () => void
  onSupplierChange: (v: string) => void
  onPaymentChange: (v: string) => void
  onShippingChange: (v: number) => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  submitLabel: string
}

export function StockPurchaseForm({
  products, lookups, suppliers,
  items, supplierId, paymentMethodId, shippingCost,
  itemsSubtotal, purchaseTotal, loading,
  defaultDate,
  onUpdateItem, onRemoveItem, onProductSelect, onAddItem,
  onSupplierChange, onPaymentChange, onShippingChange,
  onCancel, onSubmit, submitLabel,
}: FormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">

      {/* Productos */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Productos</span>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_72px_112px_36px] gap-3 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
            <span>Producto</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Costo unit.</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.key} className="grid grid-cols-[1fr_72px_112px_36px] gap-3 px-3 py-2.5 items-center">
                <Select
                  value={item.productId}
                  onValueChange={v => onProductSelect(item.key, v ?? '')}
                  items={products.map(p => ({ value: String(p.id), label: `${p.name}${p.flavor ? ` · ${p.flavor}` : ''} (${p.sku})` }))}
                >
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.flavor ? ` · ${p.flavor}` : ''} <span className="text-muted-foreground ml-1">({p.sku})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => onUpdateItem(item.key, { quantity: Number(e.target.value) })}
                  className="h-8 text-sm text-center"
                />

                <Input
                  type="number"
                  step="0.01"
                  value={item.unitCost || ''}
                  onChange={e => onUpdateItem(item.key, { unitCost: Number(e.target.value) })}
                  placeholder="0"
                  className="h-8 text-sm text-right"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveItem(item.key)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <div className="px-3 py-2 border-t border-dashed border-border">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onAddItem}>
              <Plus className="h-3 w-3 mr-1" />Agregar producto
            </Button>
          </div>
        </div>
      </div>

      {/* Total */}
      {purchaseTotal > 0 && (
        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 space-y-1.5 text-sm">
          {shippingCost > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${itemsSubtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span>${shippingCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-semibold text-base border-t border-border pt-1.5">
            <span>Total</span>
            <span>${purchaseTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}

      {/* Campos compartidos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Proveedor</Label>
          <Select value={supplierId} onValueChange={v => onSupplierChange(v ?? '')} items={suppliers.map(s => ({ value: String(s.id), label: s.name }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Método de pago</Label>
          <Select value={paymentMethodId} onValueChange={v => onPaymentChange(v ?? '')} items={lookups.paymentMethods.map(p => ({ value: String(p.id), label: p.name }))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {lookups.paymentMethods.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Fecha</Label>
          <Input name="date" type="date" defaultValue={defaultDate ?? new Date().toISOString().split('T')[0]} />
        </div>
        <div className="space-y-1.5">
          <Label>Costo de envío</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0"
            value={shippingCost || ''}
            onChange={e => onShippingChange(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nota</Label>
          <Input name="note" placeholder="Opcional" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : submitLabel}</Button>
      </div>
    </form>
  )
}
