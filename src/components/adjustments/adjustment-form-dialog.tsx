'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAdjustment } from '@/actions/adjustments'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { ProductWithRelations } from '@/types'

const REASONS = ['Pérdida/deterioro', 'Muestra/regalo', 'Error de conteo', 'Vencimiento', 'Robo', 'Corrección de inventario', 'Otro']

export function AdjustmentFormDialog({ products }: { products: ProductWithRelations[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    productId: '', quantity: '', reason: '',
    date: new Date().toISOString().split('T')[0],
  })

  const set = (k: keyof typeof form, v: string | null) => setForm(f => ({ ...f, [k]: v ?? '' }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.productId || !form.quantity || !form.reason) return
    setLoading(true)
    try {
      await createAdjustment({
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        reason: form.reason,
        date: new Date(form.date),
      })
      toast.success('Ajuste registrado')
      setOpen(false)
      setForm({ productId: '', quantity: '', reason: '', date: new Date().toISOString().split('T')[0] })
      router.refresh()
    } catch {
      toast.error('Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo ajuste</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Ajuste de inventario</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Usá positivo para sumar stock, negativo para restar.</p>
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
              <Label>Cantidad (+ o −) *</Label>
              <Input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="-3 o +5" required />
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Motivo *</Label>
            <Select value={form.reason} onValueChange={v => set('reason', v)} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Registrar ajuste</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
