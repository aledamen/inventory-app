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
import { createSale } from '@/actions/sales'
import type { ProductWithRelations } from '@/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: {id:number,name:string}[] }
}

export function SaleFormDialog({ products, lookups }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)

  const availableProducts = products.filter(p => p.stock > 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await createSale({
        productId: Number(fd.get('productId')),
        quantity: Number(fd.get('quantity')),
        effectivePrice: Number(fd.get('effectivePrice')),
        paymentMethodId: fd.get('paymentMethodId') ? Number(fd.get('paymentMethodId')) : undefined,
        notes: fd.get('notes') as string || undefined,
        date: fd.get('date') ? new Date(fd.get('date') as string) : new Date(),
      })
      toast.success('Venta registrada')
      setOpen(false)
      setSelectedProduct(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedProduct(null) }}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nueva venta
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select
              name="productId"
              required
              onValueChange={v => setSelectedProduct(availableProducts.find(p => p.id === Number(v)) ?? null)}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {availableProducts.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}{p.flavor ? ` · ${p.flavor}` : ''} — stock: {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stock disponible: <strong>{selectedProduct.stock}</strong> unidades
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock ?? undefined}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effectivePrice">Precio *</Label>
              <Input id="effectivePrice" name="effectivePrice" type="number" step="0.01" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select name="paymentMethodId">
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.paymentMethods.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} />
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
