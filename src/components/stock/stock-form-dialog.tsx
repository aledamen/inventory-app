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
import { createStockMovement } from '@/actions/stock'
import type { ProductWithRelations } from '@/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: {id:number,name:string}[] }
  suppliers: { id: number; name: string }[]
}

export function StockFormDialog({ products, lookups, suppliers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supplierId, setSupplierId] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await createStockMovement({
        productId: Number(fd.get('productId')),
        quantity: Number(fd.get('quantity')),
        unitCost: fd.get('unitCost') ? Number(fd.get('unitCost')) : undefined,
        paymentMethodId: fd.get('paymentMethodId') ? Number(fd.get('paymentMethodId')) : undefined,
        supplierId: supplierId ? Number(supplierId) : undefined,
        note: fd.get('note') as string || undefined,
        date: fd.get('date') ? new Date(`${fd.get('date') as string}T00:00:00`) : new Date(),
      })
      toast.success('Entrada registrada')
      setOpen(false)
      setSupplierId('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nueva entrada
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar entrada de stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select name="productId" required items={products.map(p => ({ value: String(p.id), label: `${p.name}${p.flavor ? ` · ${p.flavor}` : ''}` }))}>
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
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input id="quantity" name="quantity" type="number" min="1" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unitCost">Costo unitario</Label>
              <Input id="unitCost" name="unitCost" type="number" step="0.01" />
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
              <Select name="paymentMethodId" items={lookups.paymentMethods.map(p => ({ value: String(p.id), label: p.name }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
            <Label htmlFor="note">Nota</Label>
            <Textarea id="note" name="note" rows={2} />
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
