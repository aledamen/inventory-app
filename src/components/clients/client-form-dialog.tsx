'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient, updateClient } from '@/actions/clients'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'

type Client = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}

type Props =
  | { mode: 'create'; client?: never }
  | { mode: 'edit'; client: Client }

export function ClientFormDialog({ mode, client }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    address: client?.address ?? '',
    notes: client?.notes ?? '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const data = {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      }
      if (mode === 'edit') {
        await updateClient(client.id, data)
        toast.success('Cliente actualizado')
      } else {
        await createClient(data)
        toast.success('Cliente creado')
        setForm({ name: '', phone: '', email: '', address: '', notes: '' })
      }
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
      <DialogTrigger render={
        mode === 'create'
          ? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo cliente</Button>
          : <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="11 1234-5678" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
