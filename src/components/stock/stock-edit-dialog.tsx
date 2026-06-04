'use client'

import { useState } from 'react'
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
import { updateStockMovement } from '@/actions/stock'
import type { ProductWithRelations, StockMovementWithProduct } from '@/types'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  movement: StockMovementWithProduct
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
  suppliers: { id: number; name: string }[]
}

export function StockEditDialog({ movement, products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState(String(movement.productId))
  const [paymentMethodId, setPaymentMethodId] = useState(
    movement.paymentMethodId ? String(movement.paymentMethodId) : ''
  )
  const [supplierId, setSupplierId] = useState(
    movement.supplierId ? String(movement.supplierId) : ''
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await updateStockMovement(movement.id, {
        movementNumber: Number(fd.get('movementNumber')),
        productId: Number(productId),
        quantity: Number(fd.get('quantity')),
        unitCost: fd.get('unitCost') ? Number(fd.get('unitCost')) : undefined,
        paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
        supplierId: supplierId ? Number(supplierId) : null,
        note: (fd.get('note') as string) || undefined,
        date: new Date(fd.get('date') as string),
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar entrada #{movement.movementNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-movementNumber">Nº de entrada *</Label>
            <Input
              id="edit-movementNumber"
              name="movementNumber"
              type="number"
              min="1"
              defaultValue={movement.movementNumber}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select value={productId} onValueChange={v => setProductId(v ?? productId)} required items={products.map(p => ({ value: String(p.id), label: `${p.name}${p.flavor ? ` · ${p.flavor}` : ''}` }))}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-qty">Cantidad *</Label>
              <Input
                id="edit-qty"
                name="quantity"
                type="number"
                min="1"
                defaultValue={movement.quantity}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cost">Costo unitario</Label>
              <Input
                id="edit-cost"
                name="unitCost"
                type="number"
                step="0.01"
                defaultValue={movement.unitCost ? Number(movement.unitCost) : ''}
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={new Date(movement.date).toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-note">Nota</Label>
            <Textarea id="edit-note" name="note" rows={2} defaultValue={movement.note ?? ''} />
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
