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
import { updateSale } from '@/actions/sales'
import type { ProductWithRelations, SaleWithProduct } from '@/types'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  sale: SaleWithProduct
  products: ProductWithRelations[]
  lookups: { paymentMethods: { id: number; name: string }[] }
}

export function SaleEditDialog({ sale, products, lookups }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productId, setProductId] = useState(String(sale.productId))
  const [paymentMethodId, setPaymentMethodId] = useState(sale.paymentMethodId ? String(sale.paymentMethodId) : '')

  const selectedProduct = products.find(p => p.id === Number(productId))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await updateSale(sale.id, {
        saleNumber: Number(fd.get('saleNumber')),
        productId: Number(productId),
        quantity: Number(fd.get('quantity')),
        effectivePrice: Number(fd.get('effectivePrice')),
        paymentMethodId: paymentMethodId ? Number(paymentMethodId) : null,
        notes: (fd.get('notes') as string) || undefined,
        date: new Date(fd.get('date') as string),
      })
      toast.success('Venta actualizada')
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
          <DialogTitle>Editar venta #{sale.saleNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-saleNumber">Nº de venta *</Label>
            <Input
              id="edit-saleNumber"
              name="saleNumber"
              type="number"
              min="1"
              defaultValue={sale.saleNumber}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select value={productId} onValueChange={v => setProductId(v ?? productId)} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}{p.flavor ? ` · ${p.flavor}` : ''} — stock: {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stock actual: <strong>{selectedProduct.stock}</strong> unidades
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-qty">Cantidad *</Label>
              <Input
                id="edit-qty"
                name="quantity"
                type="number"
                min="1"
                defaultValue={sale.quantity}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">Precio *</Label>
              <Input
                id="edit-price"
                name="effectivePrice"
                type="number"
                step="0.01"
                defaultValue={sale.effectivePrice ? Number(sale.effectivePrice) : ''}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={paymentMethodId} onValueChange={v => setPaymentMethodId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
                defaultValue={new Date(sale.date).toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea id="edit-notes" name="notes" rows={2} defaultValue={sale.notes ?? ''} />
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
