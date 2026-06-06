'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateMultiStockMovement } from '@/actions/stock'
import type { ProductWithRelations, StockMovementWithProduct } from '@/types'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { type StockItem, newStockItem, StockPurchaseForm } from './stock-form-dialog'

type Props = {
  movementNumber: number
  rows: StockMovementWithProduct[]
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  suppliers: { id: number; name: string }[]
}

export function StockEditGroupDialog({ movementNumber, rows, products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const initialItems: StockItem[] = rows.map(r => ({
    key: String(r.id),
    productId: String(r.productId),
    quantity: r.quantity,
    unitCost: r.unitCost ? Number(r.unitCost) : 0,
  }))

  const firstRow = rows[0]
  const initialShipping = firstRow?.shippingCost ? Number(firstRow.shippingCost) : 0
  const initialSupplierId = firstRow?.supplierId ? String(firstRow.supplierId) : ''
  const initialPaymentId = firstRow?.paymentMethodId ? String(firstRow.paymentMethodId) : ''
  const defaultDate = firstRow ? new Date(firstRow.date).toISOString().split('T')[0] : undefined

  const [items, setItems] = useState<StockItem[]>(initialItems)
  const [supplierId, setSupplierId] = useState(initialSupplierId)
  const [paymentMethodId, setPaymentMethodId] = useState(initialPaymentId)
  const [shippingCost, setShippingCost] = useState(initialShipping)

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
    setItems(initialItems)
    setSupplierId(initialSupplierId)
    setPaymentMethodId(initialPaymentId)
    setShippingCost(initialShipping)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const validItems = items.filter(i => i.productId)
    if (validItems.length === 0) return toast.error('Agregá al menos un producto')
    setLoading(true)
    try {
      await updateMultiStockMovement(movementNumber, {
        items: validItems.map(i => ({ productId: Number(i.productId), quantity: i.quantity, unitCost: i.unitCost || undefined })),
        supplierId: supplierId ? Number(supplierId) : null,
        paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
        shippingCost: shippingCost > 0 ? shippingCost : undefined,
        note: (fd.get('note') as string) || undefined,
        date: fd.get('date') ? new Date(`${fd.get('date') as string}T00:00:00`) : new Date(firstRow.date),
      })
      toast.success('Entrada actualizada')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar compra #{movementNumber}</DialogTitle>
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
          defaultDate={defaultDate}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onProductSelect={handleProductSelect}
          onAddItem={() => setItems(prev => [...prev, newStockItem()])}
          onSupplierChange={setSupplierId}
          onPaymentChange={setPaymentMethodId}
          onShippingChange={setShippingCost}
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
          submitLabel="Actualizar"
        />
      </DialogContent>
    </Dialog>
  )
}
