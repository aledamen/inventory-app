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
import { createCapitalMovement } from '@/actions/capital'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type PaymentMethod = { id: number; name: string }

export function CapitalFormDialog({ paymentMethods = [] }: { paymentMethods?: PaymentMethod[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'aporte' | 'retiro' | 'traspaso'>('aporte')

  const paymentMethodLabel = type === 'traspaso' ? 'Va hacia *' : 'Método de pago *'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await createCapitalMovement({
        type,
        amount: Number(fd.get('amount')),
        paymentMethodId: Number(fd.get('paymentMethodId')),
        notes: (fd.get('notes') as string) || undefined,
        date: fd.get('date') ? new Date(`${fd.get('date') as string}T00:00:00`) : new Date(),
      })
      toast.success(
        type === 'aporte' ? 'Aporte registrado' : type === 'retiro' ? 'Retiro registrado' : 'Traspaso registrado'
      )
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nuevo movimiento
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar movimiento de caja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={v => setType(v as 'aporte' | 'retiro' | 'traspaso')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aporte">Aporte propio</SelectItem>
                <SelectItem value="retiro">Retiro</SelectItem>
                <SelectItem value="traspaso">Traspaso (efectivo ↔ banco)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto *</Label>
              <Input id="amount" name="amount" type="number" step="1" min="1" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{paymentMethodLabel}</Label>
            <Select name="paymentMethodId" required items={paymentMethods.map(pm => ({ value: String(pm.id), label: pm.name }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(pm => (
                  <SelectItem key={pm.id} value={String(pm.id)}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type === 'traspaso' && (
              <p className="text-xs text-muted-foreground">
                Elegí a dónde va la plata (ej: sacaste efectivo y lo transferiste al banco → elegí &quot;transferencia&quot;).
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Opcional..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
