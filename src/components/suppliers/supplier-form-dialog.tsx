'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSupplier, updateSupplier } from '@/actions/suppliers'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'

type Supplier = {
  id: number; name: string; phone: string | null; email: string | null
  address: string | null; contactName: string | null; notes: string | null
}

type Props = | { mode: 'create'; supplier?: never } | { mode: 'edit'; supplier: Supplier }

export function SupplierFormDialog({ mode, supplier }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    contactName: supplier?.contactName ?? '',
    notes: supplier?.notes ?? '',
  })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

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
        contactName: form.contactName || undefined,
        notes: form.notes || undefined,
      }
      if (mode === 'edit') { await updateSupplier(supplier.id, data); toast.success('Proveedor actualizado') }
      else { await createSupplier(data); toast.success('Proveedor creado'); setForm({ name: '', phone: '', email: '', address: '', contactName: '', notes: '' }) }
      setOpen(false); router.refresh()
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        mode === 'create'
          ? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo proveedor</Button>
          : <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
      } />
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'create' ? 'Nuevo proveedor' : 'Editar proveedor'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div className="space-y-1"><Label>Persona de contacto</Label><Input value={form.contactName} onChange={e => set('contactName', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Dirección</Label><Input value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
