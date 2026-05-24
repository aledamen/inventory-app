'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createReturn } from '@/actions/returns'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { ProductWithRelations } from '@/types'

type Client = { id: number; name: string }

type Props = {
  products: ProductWithRelations[]
  clients: { id: number; name: string; totalSales: number; totalSpent: string; lastPurchase: Date | null }[]
}

export function ReturnFormDialog({ products, clients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    clientId: '',
    saleId: '',
    quantity: '1',
    reason: '',
    refundAmount: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (k: keyof typeof form, v: string | null) => setForm(f => ({ ...f, [k]: v ?? '' }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productId || !form.quantity) return
    setLoading(true)
    try {
      await createReturn({
        productId: Number(form.productId),
        clientId: form.clientId ? Number(form.clientId) : undefined,
        saleId: form.saleId ? Number(form.saleId) : undefined,
        quantity: Number(form.quantity),
        reason: form.reason || undefined,
        refundAmount: form.refundAmount ? Number(form.refundAmount) : undefined,
        date: new Date(form.date),
      })
      toast.success('Devolución registrada — stock restaurado')
      setOpen(false)
      setForm({ productId: '', clientId: '', saleId: '', quantity: '1', reason: '', refundAmount: '', date: new Date().toISOString().split('T')[0] })
      router.refresh()
    } catch {
      toast.error('Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva devolución</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar devolución</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Producto *</Label>
            <Select value={form.productId} onValueChange={v => set('productId', v)} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}{p.flavor ? ` · ${p.flavor}` : ''} — stock: {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cantidad *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={form.clientId} onValueChange={v => set('clientId', v)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reembolso $</Label>
              <Input type="number" min="0" value={form.refundAmount} onChange={e => set('refundAmount', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>N° de venta original</Label>
            <Input type="number" value={form.saleId} onChange={e => set('saleId', e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Defecto, cambio de opinión..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Registrar devolución</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
