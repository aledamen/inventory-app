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
import { createCombo, updateCombo, deleteCombo, toggleComboVisible } from '@/actions/combos'
import type { ComboFull } from '@/actions/combos'
import type { ProductWithRelations } from '@/types'
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'

type Banner = { id: number; name: string; color: string }

type Props = {
  combos: ComboFull[]
  products: ProductWithRelations[]
  banners: Banner[]
}

type ItemRow = {
  productId: number
  quantity: number
}

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive">Sin stock</Badge>
  return <Badge variant="secondary" className="text-green-700">{stock}</Badge>
}

function ComboFormDialog({
  products,
  banners,
  combo,
  mode = 'create',
}: {
  products: ProductWithRelations[]
  banners: Banner[]
  combo?: ComboFull
  mode?: 'create' | 'edit'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ItemRow[]>(
    combo?.items.map(i => ({ productId: i.productId, quantity: i.quantity })) ?? []
  )
  const [bannerId, setBannerId] = useState<string>(combo?.bannerId ? String(combo.bannerId) : '')

  function resetForm() {
    setItems(combo?.items.map(i => ({ productId: i.productId, quantity: i.quantity })) ?? [])
    setBannerId(combo?.bannerId ? String(combo.bannerId) : '')
  }

  function addItem() {
    setItems(prev => [...prev, { productId: products[0]?.id ?? 0, quantity: 1 }])
  }

  function updateItem(idx: number, field: keyof ItemRow, value: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('El combo debe tener al menos un producto')
      return
    }
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      sku: fd.get('sku') as string,
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      badge: (fd.get('badge') as string) || undefined,
      featured: fd.get('featured') === 'on',
      priceEffective: Number(fd.get('priceEffective')),
      priceTransfer: fd.get('priceTransfer') ? Number(fd.get('priceTransfer')) : undefined,
      priceList: fd.get('priceList') ? Number(fd.get('priceList')) : undefined,
      notes: (fd.get('notes') as string) || undefined,
      bannerId: bannerId ? Number(bannerId) : null,
      items,
    }
    try {
      if (mode === 'edit' && combo) {
        await updateCombo(combo.id, data)
        toast.success('Combo actualizado')
      } else {
        await createCombo(data)
        toast.success('Combo creado')
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
        : <DialogTrigger render={<Button />}><Plus className="h-4 w-4 mr-2" />Nuevo combo</DialogTrigger>
      }
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar combo' : 'Nuevo combo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" name="sku" required defaultValue={combo?.sku} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" required defaultValue={combo?.name} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={combo?.description ?? ''} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="badge">Badge</Label>
              <Input id="badge" name="badge" placeholder="Promo, Limitado..." defaultValue={combo?.badge ?? ''} />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="featured" defaultChecked={combo?.featured ?? false} className="h-4 w-4" />
                Destacado en catálogo
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Banner</Label>
            <Select value={bannerId} onValueChange={v => setBannerId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Sin banner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin banner</SelectItem>
                {banners.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    <span className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: b.color }}
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                      />
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="priceEffective">Precio efectivo *</Label>
              <Input id="priceEffective" name="priceEffective" type="number" step="0.01" required defaultValue={combo?.priceEffective} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceTransfer">Precio transferencia</Label>
              <Input id="priceTransfer" name="priceTransfer" type="number" step="0.01" defaultValue={combo?.priceTransfer ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceList">Precio lista</Label>
              <Input id="priceList" name="priceList" type="number" step="0.01" defaultValue={combo?.priceList ?? ''} />
            </div>
          </div>

          {/* Items section */}
          <div className="space-y-2">
            <Label>Productos del combo *</Label>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">Agregá al menos un producto.</p>
            )}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={item.productId}
                    onChange={e => updateItem(idx, 'productId', Number(e.target.value))}
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.flavor ? ' · ' + p.flavor : ''} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive shrink-0" onClick={() => removeItem(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />Agregar producto
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={combo?.notes ?? ''} />
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

export function CombosClient({ combos, products, banners }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return combos
    return combos.filter(c =>
      c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q)
    )
  }, [combos, search])

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar el combo "${name}"?`)) return
    try {
      await deleteCombo(id)
      toast.success('Combo eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleToggleVisible(id: number, current: boolean) {
    try {
      await toggleComboVisible(id, !current)
      toast.success(!current ? 'Visible en catálogo' : 'Oculto del catálogo')
      router.refresh()
    } catch {
      toast.error('Error al cambiar visibilidad')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <ComboFormDialog products={products} banners={banners} mode="create" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">Stock disponible</TableHead>
              <TableHead className="text-right">Precio efectivo</TableHead>
              <TableHead className="text-center">Visible</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay combos
                </TableCell>
              </TableRow>
            )}
            {filtered.map(combo => (
              <TableRow key={combo.id}>
                <TableCell className="font-mono text-xs">{combo.sku}</TableCell>
                <TableCell className="font-medium">
                  {combo.name}
                  {combo.badge && (
                    <Badge variant="outline" className="ml-2 text-xs">{combo.badge}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-muted-foreground">{combo.items.length}</span>
                </TableCell>
                <TableCell className="text-center">
                  {stockBadge(combo.availableStock)}
                </TableCell>
                <TableCell className="text-right">
                  ${Number(combo.priceEffective).toLocaleString('es-AR')}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${combo.visible ? 'text-green-600' : 'text-muted-foreground'}`}
                    onClick={() => handleToggleVisible(combo.id, combo.visible)}
                    title={combo.visible ? 'Visible — clic para ocultar' : 'Oculto — clic para publicar'}
                  >
                    {combo.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <ComboFormDialog products={products} banners={banners} combo={combo} mode="edit" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(combo.id, combo.name)}
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
