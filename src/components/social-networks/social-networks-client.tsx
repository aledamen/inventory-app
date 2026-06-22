'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  createSocialNetwork, updateSocialNetwork, deleteSocialNetwork,
} from '@/actions/social-networks'
import type { SocialNetwork } from '@/actions/social-networks'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = { networks: SocialNetwork[] }

function NetworkDialog({ network, mode = 'create' }: { network?: SocialNetwork; mode?: 'create' | 'edit' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const active = fd.get('active') === 'on'
    try {
      if (mode === 'edit' && network) {
        await updateSocialNetwork(network.id, { name, active })
      } else {
        await createSocialNetwork(name)
      }
      toast.success(mode === 'edit' ? 'Red social actualizada' : 'Red social creada')
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
      <DialogTrigger render={mode === 'create'
        ? <Button><Plus className="h-4 w-4 mr-2" />Nueva red social</Button>
        : <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar red social' : 'Nueva red social'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={network?.name} placeholder="ej: Instagram" />
          </div>
          {mode === 'edit' && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" name="active" defaultChecked={network?.active ?? true} className="h-4 w-4" />
              <Label htmlFor="active">Activa</Label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SocialNetworksClient({ networks }: Props) {
  const router = useRouter()

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar ${name}? Los influencers asociados quedarán sin red social.`)) return
    try {
      await deleteSocialNetwork(id)
      toast.success('Red social eliminada')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">{networks.length} redes sociales</p>
        <NetworkDialog mode="create" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {networks.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No hay redes sociales cargadas
                </TableCell>
              </TableRow>
            )}
            {networks.map(n => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.name}</TableCell>
                <TableCell>
                  <Badge variant={n.active ? 'default' : 'secondary'}>
                    {n.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <NetworkDialog network={n} mode="edit" />
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDelete(n.id, n.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
