'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createOrder } from '@/actions/orders'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import type { ProductWithRelations } from '@/types'

type Client = { id: number; name: string }
type OrderItem = { productId: string; quantity: string; unitPrice: string }

type Props = {
  products: ProductWithRelations[]
  clients: { id: number; name: string; totalSales: number; totalSpent: string; lastPurchase: Date | null }[]
}

export function OrderFormDialog({ products, clients }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<OrderItem[]>([{ productId: '', quantity: '1', unitPrice: '' }])

  function addItem() { setItems(i => [...i, { productId: '', quantity: '1', unitPrice: '' }]) }
  function removeItem(idx: number) { setItems(i => i.filter((_, j) => j !== idx)) }
  function setItem(idx: number, k: keyof OrderItem, v: string) {
    setItems(i => i.map((item, j) => j === idx ? { ...item, [k]: v } : item))
  }

  function handleProductChange(idx: number, productId: string | null) {
    const id = productId ?? ''
    const p = products.find(p => String(p.id) === id)
    setItems(i => i.map((item, j) => j === idx ? { ...item, productId: id, unitPrice: p?.cost ?? '' } : item))
  }

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter(i => i.productId && i.quantity)
    if (!validItems.length) return toast.error('Agregá al menos un producto')
    setLoading(true)
    try {
      await createOrder({
        clientId: clientId ? Number(clientId) : undefined,
        notes: notes || undefined,
        date: new Date(date),
        items: validItems.map(i => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice) || 0,
        })),
      })
      toast.success('Pedido creado')
      setOpen(false)
      setItems([{ productId: '', quantity: '1', unitPrice: '' }])
      setClientId(null); setNotes(''); setDate(new Date().toISOString().split('T')[0])
      router.refresh()
    } catch {
      toast.error('Error al crear pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo pedido</Button>} />
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuevo pedido</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select value={item.productId} onValueChange={v => handleProductChange(idx, v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.flavor ? ` · ${p.flavor}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min="1" className="w-20" placeholder="Cant." value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                <Input type="number" min="0" className="w-28" placeholder="Precio" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total estimado</span>
            <span className="font-semibold">${Math.round(total).toLocaleString('es-AR')}</span>
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Crear pedido</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
