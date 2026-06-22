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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { createInfluencer, updateInfluencer, deleteInfluencer } from '@/actions/influencers'
import type { Influencer } from '@/actions/influencers'
import type { SocialNetwork } from '@/actions/social-networks'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  influencers: Influencer[]
  socialNetworks: SocialNetwork[]
}

function InfluencerDialog({
  influencer,
  socialNetworks,
  mode = 'create',
}: {
  influencer?: Influencer
  socialNetworks: SocialNetwork[]
  mode?: 'create' | 'edit'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get('name') as string,
      socialNetworkId: fd.get('socialNetworkId') ? Number(fd.get('socialNetworkId')) : null,
      socialUsername: (fd.get('socialUsername') as string) || null,
      notes: (fd.get('notes') as string) || null,
      active: fd.get('active') === 'on',
    }
    try {
      if (mode === 'edit' && influencer) {
        await updateInfluencer(influencer.id, data)
      } else {
        await createInfluencer(data)
      }
      toast.success(mode === 'edit' ? 'Influencer actualizado' : 'Influencer creado')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const activeNetworks = socialNetworks.filter(n => n.active)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={mode === 'create'
        ? <Button><Plus className="h-4 w-4 mr-2" />Nuevo influencer</Button>
        : <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar influencer' : 'Nuevo influencer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={influencer?.name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Red social</Label>
              <Select
                name="socialNetworkId"
                defaultValue={influencer?.socialNetworkId ? String(influencer.socialNetworkId) : ''}
                items={[
                  { value: '', label: 'Sin red social' },
                  ...activeNetworks.map(n => ({ value: String(n.id), label: n.name })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin red social</SelectItem>
                  {activeNetworks.map(n => (
                    <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="socialUsername">Usuario</Label>
              <Input
                id="socialUsername"
                name="socialUsername"
                placeholder="@usuario"
                defaultValue={influencer?.socialUsername ?? ''}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={influencer?.notes ?? ''} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" name="active" defaultChecked={influencer?.active ?? true} className="h-4 w-4" />
            <Label htmlFor="active">Activo</Label>
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

export function InfluencersClient({ influencers, socialNetworks }: Props) {
  const router = useRouter()

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return
    try {
      await deleteInfluencer(id)
      toast.success('Influencer eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">{influencers.length} influencers registrados</p>
        <InfluencerDialog mode="create" socialNetworks={socialNetworks} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Red social</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {influencers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay influencers cargados
                </TableCell>
              </TableRow>
            )}
            {influencers.map(inf => (
              <TableRow key={inf.id}>
                <TableCell className="font-medium">{inf.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{inf.socialNetworkName ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{inf.socialUsername ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={inf.active ? 'default' : 'secondary'}>
                    {inf.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/dashboard/influencers/${inf.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />Ver perfil
                    </Link>
                    <InfluencerDialog influencer={inf} socialNetworks={socialNetworks} mode="edit" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(inf.id, inf.name)}
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
