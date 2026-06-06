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
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type StockItem = {
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

function newItem(): StockItem {
  return { key: Math.random().toString(36).slice(2), productId: '', quantity: 1, unitCost: 0 }
}

export function StockFormDialog({ products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<StockItem[]>([newItem()])
  const [supplierId, setSupplierId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [shippingCost, setShippingCost] = useState(0)

  const itemsSubtotal = useMemo(
    () => items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
    [items]
  )
  const purchaseTotal = itemsSubtotal + shippingCost

  function updateItem(key: string, patch: Partial<StockItem>) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function handleProductSelect(key: string, productId: string) {
    const p = products.find(p => String(p.id) === productId)
    updateItem(key, {
      productId,
      unitCost: p?.cost ? Number(p.cost) : 0,
    })
  }

  function reset() {
    setItems([newItem()])
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
        items: validItems.map(i => ({
          productId: Number(i.productId),
          quantity: i.quantity,
          unitCost: i.unitCost || undefined,
        })),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar entrada de stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Productos */}
          <div className="space-y-2">
            <Label>Productos *</Label>
            {items.map((item, idx) => (
              <div key={item.key} className="grid grid-cols-[1fr_80px_110px_36px] gap-2 items-end">
                <div className="space-y-1">
                  {idx === 0 && <p className="text-xs text-muted-foreground">Producto</p>}
                  <Select
                    value={item.productId}
                    onValueChange={v => handleProductSelect(item.key, v ?? '')}
                    items={products.map(p => ({ value: String(p.id), label: `${p.name}${p.flavor ? ` · ${p.flavor}` : ''} (${p.sku})` }))}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}{p.flavor ? ` · ${p.flavor}` : ''} <span className="text-muted-foreground ml-1">({p.sku})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {idx === 0 && <p className="text-xs text-muted-foreground">Cantidad</p>}
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(item.key, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && <p className="text-xs text-muted-foreground">Costo unitario</p>}
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitCost || ''}
                    onChange={e => updateItem(item.key, { unitCost: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.key)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems(prev => [...prev, newItem()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Agregar producto
            </Button>
          </div>

          {/* Total */}
          {purchaseTotal > 0 && (
            <div className="rounded-lg bg-muted/40 px-4 py-2 space-y-1 text-sm">
              {shippingCost > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal productos</span>
                  <span>${itemsSubtotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Costo de envío</span>
                  <span>${shippingCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total compra</span>
                <span>${purchaseTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

          {/* Campos compartidos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select value={supplierId} onValueChange={v => setSupplierId(v ?? '')} items={suppliers.map(s => ({ value: String(s.id), label: s.name }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentMethodId} onValueChange={v => setPaymentMethodId(v ?? '')} items={lookups.paymentMethods.map(p => ({ value: String(p.id), label: p.name }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.paymentMethods.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shippingCost">Costo de envío</Label>
              <Input
                id="shippingCost"
                type="number"
                step="0.01"
                placeholder="0"
                value={shippingCost || ''}
                onChange={e => setShippingCost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Nota</Label>
              <Textarea id="note" name="note" rows={1} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
