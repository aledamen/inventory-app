'use client'

import { useState, useMemo } from 'react'
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
import {
  createCuratedPick, updateCuratedPick, deleteCuratedPick, reorderCuratedPicks,
} from '@/actions/curated-picks'
import type { CuratedPick } from '@/actions/curated-picks'
import type { ComboFull } from '@/actions/combos'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  picks: CuratedPick[]
  combos: ComboFull[]
}

function CuratedPickFormDialog({
  combos,
  pick,
  nextPosition,
  mode = 'create',
}: {
  combos: ComboFull[]
  pick?: CuratedPick
  nextPosition: number
  mode?: 'create' | 'edit'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comboSku, setComboSku] = useState(pick?.comboSku ?? '')

  function resetForm() {
    setComboSku(pick?.comboSku ?? '')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!comboSku) {
      toast.error('Elegí un combo')
      return
    }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      position: mode === 'edit' && pick ? pick.position : nextPosition,
      headline: fd.get('headline') as string,
      description: (fd.get('description') as string) || null,
      comboSku,
    }
    try {
      if (mode === 'edit' && pick) {
        await updateCuratedPick(pick.id, data)
        toast.success('Pick actualizado')
      } else {
        await createCuratedPick(data)
        toast.success('Pick creado')
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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm() }}>
      {mode === 'edit'
        ? <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}><Pencil className="h-3.5 w-3.5" /></DialogTrigger>
        : <DialogTrigger render={<Button />}><Plus className="h-4 w-4 mr-2" />Nuevo pick</DialogTrigger>
      }
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar pick' : 'Nuevo pick'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="headline">Título *</Label>
            <Input id="headline" name="headline" required defaultValue={pick?.headline} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={pick?.description ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label>Combo *</Label>
            <Select value={comboSku} onValueChange={v => setComboSku(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Elegí un combo" /></SelectTrigger>
              <SelectContent>
                {combos.map(c => (
                  <SelectItem key={c.sku} value={c.sku}>{c.name} ({c.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : mode === 'edit' ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CuratedPicksClient({ picks, combos }: Props) {
  const router = useRouter()
  const sorted = useMemo(() => [...picks].sort((a, b) => a.position - b.position || a.id - b.id), [picks])
  const nextPosition = (sorted.at(-1)?.position ?? 0) + 1

  async function handleDelete(id: number, headline: string) {
    if (!confirm(`¿Eliminar el pick "${headline}"?`)) return
    try {
      await deleteCuratedPick(id)
      toast.success('Pick eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= sorted.length) return
    const a = sorted[index]
    const b = sorted[target]
    try {
      await reorderCuratedPicks([
        { id: a.id, position: b.position },
        { id: b.id, position: a.position },
      ])
      router.refresh()
    } catch {
      toast.error('Error al reordenar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'pick' : 'picks'} configurados{sorted.length !== 3 ? ' — se recomiendan 3' : ''}
        </p>
        <CuratedPickFormDialog combos={combos} nextPosition={nextPosition} mode="create" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Orden</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Combo</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay picks curados
                </TableCell>
              </TableRow>
            )}
            {sorted.map((pick, idx) => (
              <TableRow key={pick.id}>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => handleMove(idx, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === sorted.length - 1} onClick={() => handleMove(idx, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {pick.headline}
                  {pick.description && <p className="text-xs text-muted-foreground font-normal">{pick.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">{pick.comboSku}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <CuratedPickFormDialog combos={combos} pick={pick} nextPosition={nextPosition} mode="edit" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(pick.id, pick.headline)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
