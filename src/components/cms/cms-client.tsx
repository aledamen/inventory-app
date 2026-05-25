'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  createPromotion, updatePromotion, deletePromotion,
  createBanner, updateBanner, deleteBanner,
} from '@/actions/cms'
import { setSiteConfigBulk } from '@/actions/site-config'
import {
  createCategory, updateCategory, deleteCategory,
  createBrand, updateBrand, deleteBrand,
  createFlavor, updateFlavor, deleteFlavor,
} from '@/actions/lookups'
import { Pencil, Trash2, Check, X, Plus, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductWithRelations } from '@/types'

type Promotion = {
  id: number
  productId: number
  promoPrice: string
  label: string | null
  validFrom: string | null
  validTo: string | null
  active: boolean
  createdAt: Date | null
  productName: string
  productSku: string
  productFlavor: string | null
}

type Lookup = { id: number; name: string }

type Lookups = {
  categories: Lookup[]
  brands: Lookup[]
  flavors: Lookup[]
}

type Banner = { id: number; name: string; color: string; textColor: string; position: string }

type Props = {
  promotions: Promotion[]
  lookups: Lookups
  products: ProductWithRelations[]
  banners: Banner[]
  config: Record<string, string>
}

// ── Generic lookup table ──────────────────────────────────────────────────────

type LookupActions = {
  create: (name: string) => Promise<void>
  update: (id: number, name: string) => Promise<void>
  remove: (id: number) => Promise<void>
}

function LookupTable({ items, actions, label }: { items: Lookup[]; actions: LookupActions; label: string }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      await actions.create(newName.trim())
      toast.success(`${label} creado`)
      setNewName('')
      setAddingNew(false)
      router.refresh()
    } catch { toast.error('Error al crear') }
    finally { setLoading(false) }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return
    setLoading(true)
    try {
      await actions.update(id, editName.trim())
      toast.success(`${label} actualizado`)
      setEditingId(null)
      router.refresh()
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    try {
      await actions.remove(id)
      toast.success(`${label} eliminado`)
      router.refresh()
    } catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setAddingNew(true); setNewName('') }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nuevo {label.toLowerCase()}
        </Button>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addingNew && (
              <TableRow>
                <TableCell>
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAddingNew(false) }}
                    placeholder={`Nombre del ${label.toLowerCase()}...`}
                    className="h-7 text-sm"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate} disabled={loading}>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddingNew(false)}>
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {items.length === 0 && !addingNew && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No hay {label.toLowerCase()}s registrados
                </TableCell>
              </TableRow>
            )}
            {items.map(item => {
              const isEditing = editingId === item.id
              return (
                <TableRow key={item.id}>
                  {isEditing ? (
                    <TableCell>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    </TableCell>
                  ) : (
                    <TableCell className="font-medium">{item.name}</TableCell>
                  )}
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdate(item.id)} disabled={loading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(item.id); setEditName(item.name) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Promotions tab ────────────────────────────────────────────────────────────

type PromoEditState = {
  promoPrice: string
  label: string
  validFrom: string
  validTo: string
}

function PromotionsTab({ promotions, products }: { promotions: Promotion[]; products: ProductWithRelations[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<PromoEditState | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // New promotion form state
  const [newProductId, setNewProductId] = useState<string>('')
  const [newPromoPrice, setNewPromoPrice] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newValidFrom, setNewValidFrom] = useState('')
  const [newValidTo, setNewValidTo] = useState('')

  function startEdit(p: Promotion) {
    setEditingId(p.id)
    setEditState({
      promoPrice: String(Number(p.promoPrice)),
      label: p.label ?? '',
      validFrom: p.validFrom ?? '',
      validTo: p.validTo ?? '',
    })
  }

  async function saveEdit(id: number) {
    if (!editState) return
    setLoading(true)
    try {
      await updatePromotion(id, {
        promoPrice: Number(editState.promoPrice),
        label: editState.label || null,
        validFrom: editState.validFrom || null,
        validTo: editState.validTo || null,
      })
      toast.success('Promoción actualizada')
      setEditingId(null)
      router.refresh()
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  async function handleToggleActive(promo: Promotion) {
    try {
      await updatePromotion(promo.id, { active: !promo.active })
      toast.success(promo.active ? 'Promoción desactivada' : 'Promoción activada')
      router.refresh()
    } catch { toast.error('Error al cambiar estado') }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta promoción?')) return
    try {
      await deletePromotion(id)
      toast.success('Promoción eliminada')
      router.refresh()
    } catch { toast.error('Error al eliminar') }
  }

  async function handleCreate() {
    if (!newProductId || !newPromoPrice) {
      toast.error('Producto y precio son requeridos')
      return
    }
    setLoading(true)
    try {
      await createPromotion({
        productId: Number(newProductId),
        promoPrice: Number(newPromoPrice),
        label: newLabel || undefined,
        validFrom: newValidFrom || undefined,
        validTo: newValidTo || undefined,
      })
      toast.success('Promoción creada')
      setDialogOpen(false)
      setNewProductId('')
      setNewPromoPrice('')
      setNewLabel('')
      setNewValidFrom('')
      setNewValidTo('')
      router.refresh()
    } catch { toast.error('Error al crear') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nueva promoción
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva promoción</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Producto</Label>
                <Select value={newProductId} onValueChange={(v) => setNewProductId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.flavor ? ` — ${p.flavor}` : ''} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-promo-price">Precio promocional</Label>
                <Input
                  id="new-promo-price"
                  type="number"
                  step="0.01"
                  value={newPromoPrice}
                  onChange={e => setNewPromoPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-label">Label (opcional)</Label>
                <Input
                  id="new-label"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Ej: 20% OFF"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-valid-from">Válido desde</Label>
                  <Input
                    id="new-valid-from"
                    type="date"
                    value={newValidFrom}
                    onChange={e => setNewValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-valid-to">Válido hasta</Label>
                  <Input
                    id="new-valid-to"
                    type="date"
                    value={newValidTo}
                    onChange={e => setNewValidTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio promo</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay promociones registradas
                </TableCell>
              </TableRow>
            )}
            {promotions.map(promo => {
              const isEditing = editingId === promo.id
              return (
                <TableRow key={promo.id}>
                  {isEditing && editState ? (
                    <>
                      <TableCell className="text-sm">
                        <span className="font-medium">{promo.productName}</span>
                        {promo.productFlavor && <span className="text-muted-foreground"> — {promo.productFlavor}</span>}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editState.promoPrice}
                          onChange={e => setEditState(s => s ? { ...s, promoPrice: e.target.value } : s)}
                          type="number"
                          step="0.01"
                          className="h-7 text-sm w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editState.label}
                          onChange={e => setEditState(s => s ? { ...s, label: e.target.value } : s)}
                          className="h-7 text-sm w-24"
                          placeholder="Label"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editState.validFrom}
                          onChange={e => setEditState(s => s ? { ...s, validFrom: e.target.value } : s)}
                          type="date"
                          className="h-7 text-sm w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editState.validTo}
                          onChange={e => setEditState(s => s ? { ...s, validTo: e.target.value } : s)}
                          type="date"
                          className="h-7 text-sm w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={promo.active ? 'text-green-600 text-sm' : 'text-muted-foreground text-sm'}>
                          {promo.active ? 'Sí' : 'No'}
                        </span>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm">
                        <span className="font-medium">{promo.productName}</span>
                        {promo.productFlavor && <span className="text-muted-foreground"> — {promo.productFlavor}</span>}
                        <br />
                        <span className="text-xs text-muted-foreground">{promo.productSku}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(promo.promoPrice).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {promo.label ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {promo.validFrom ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {promo.validTo ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleActive(promo)}
                          title={promo.active ? 'Desactivar' : 'Activar'}
                        >
                          {promo.active
                            ? <ToggleRight className="h-4 w-4 text-green-600" />
                            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(promo.id)} disabled={loading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(promo)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(promo.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Banner preview ────────────────────────────────────────────────────────────

function BannerPreview({ name, color, textColor, position }: { name: string; color: string; textColor: string; position: string }) {
  const isTop = position === 'top'
  const isBottom = position === 'bottom'
  const isDiagTL = position === 'diagonal-tl'
  const isDiagTR = position === 'diagonal-tr'

  return (
    <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
      <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs">Imagen</div>

      {(isTop || isBottom) && (
        <div
          className={`absolute left-0 right-0 py-1 text-center text-xs font-bold uppercase tracking-wider ${isTop ? 'top-0' : 'bottom-0'}`}
          style={{ backgroundColor: color, color: textColor }}
        >
          {name || 'Banner'}
        </div>
      )}

      {isDiagTL && (
        <div
          className="absolute -left-6 top-3 w-24 text-center text-xs font-bold uppercase py-0.5 rotate-[-45deg] origin-center"
          style={{ backgroundColor: color, color: textColor }}
        >
          {name || 'Banner'}
        </div>
      )}

      {isDiagTR && (
        <div
          className="absolute -right-6 top-3 w-24 text-center text-xs font-bold uppercase py-0.5 rotate-[45deg] origin-center"
          style={{ backgroundColor: color, color: textColor }}
        >
          {name || 'Banner'}
        </div>
      )}
    </div>
  )
}

// ── Banners tab ───────────────────────────────────────────────────────────────

const POSITION_LABELS: Record<string, string> = {
  top: 'Arriba',
  bottom: 'Abajo',
  'diagonal-tl': 'Diagonal izq.',
  'diagonal-tr': 'Diagonal der.',
}

function BannersTab({ banners }: { banners: Banner[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#EF4444')
  const [editTextColor, setEditTextColor] = useState('#FFFFFF')
  const [editPosition, setEditPosition] = useState('bottom')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#EF4444')
  const [newTextColor, setNewTextColor] = useState('#FFFFFF')
  const [newPosition, setNewPosition] = useState('bottom')
  const [addingNew, setAddingNew] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      await createBanner({ name: newName.trim(), color: newColor, textColor: newTextColor, position: newPosition })
      toast.success('Banner creado')
      setNewName('')
      setNewColor('#EF4444')
      setNewTextColor('#FFFFFF')
      setNewPosition('bottom')
      setAddingNew(false)
      router.refresh()
    } catch { toast.error('Error al crear') }
    finally { setLoading(false) }
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return
    setLoading(true)
    try {
      await updateBanner(id, { name: editName.trim(), color: editColor, textColor: editTextColor, position: editPosition })
      toast.success('Banner actualizado')
      setEditingId(null)
      router.refresh()
    } catch { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    try {
      await deleteBanner(id)
      toast.success('Banner eliminado')
      router.refresh()
    } catch { toast.error('Error al eliminar') }
  }

  function startEdit(item: Banner) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditColor(item.color)
    setEditTextColor(item.textColor)
    setEditPosition(item.position)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setAddingNew(true); setNewName(''); setNewColor('#EF4444'); setNewTextColor('#FFFFFF'); setNewPosition('bottom') }}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nuevo banner
        </Button>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Color</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-32">Posición</TableHead>
              <TableHead className="w-40">Preview</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addingNew && (
              <TableRow>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    <input
                      type="color"
                      value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      title="Color de fondo"
                    />
                    <input
                      type="color"
                      value={newTextColor}
                      onChange={e => setNewTextColor(e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      title="Color de texto"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAddingNew(false) }}
                    placeholder="Nombre del banner..."
                    className="h-7 text-sm"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Select value={newPosition} onValueChange={v => v && setNewPosition(v)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Arriba</SelectItem>
                      <SelectItem value="bottom">Abajo</SelectItem>
                      <SelectItem value="diagonal-tl">Diagonal izq.</SelectItem>
                      <SelectItem value="diagonal-tr">Diagonal der.</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <BannerPreview name={newName} color={newColor} textColor={newTextColor} position={newPosition} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate} disabled={loading}>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddingNew(false)}>
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {banners.length === 0 && !addingNew && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay banners registrados
                </TableCell>
              </TableRow>
            )}
            {banners.map(item => {
              const isEditing = editingId === item.id
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                          title="Color de fondo"
                        />
                        <input
                          type="color"
                          value={editTextColor}
                          onChange={e => setEditTextColor(e.target.value)}
                          className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0.5"
                          title="Color de texto"
                        />
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center">
                        <span style={{ backgroundColor: item.color }} className="inline-block w-5 h-5 rounded border border-border" title="Fondo" />
                        <span style={{ backgroundColor: item.textColor }} className="inline-block w-5 h-5 rounded border border-border" title="Texto" />
                      </div>
                    )}
                  </TableCell>
                  {isEditing ? (
                    <TableCell>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    </TableCell>
                  ) : (
                    <TableCell className="font-medium">{item.name}</TableCell>
                  )}
                  <TableCell>
                    {isEditing ? (
                      <Select value={editPosition} onValueChange={v => v && setEditPosition(v)}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Arriba</SelectItem>
                          <SelectItem value="bottom">Abajo</SelectItem>
                          <SelectItem value="diagonal-tl">Diagonal izq.</SelectItem>
                          <SelectItem value="diagonal-tr">Diagonal der.</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">{POSITION_LABELS[item.position] ?? item.position}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing
                      ? <BannerPreview name={editName} color={editColor} textColor={editTextColor} position={editPosition} />
                      : <BannerPreview name={item.name} color={item.color} textColor={item.textColor} position={item.position} />
                    }
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUpdate(item.id)} disabled={loading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ── Site config tab ───────────────────────────────────────────────────────────

function SiteConfigTab({ config }: { config: Record<string, string> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [storeName, setStoreName] = useState(config.store_name ?? 'Fase-Beta')
  const [whatsapp, setWhatsapp] = useState(config.whatsapp_number ?? '')
  const [instagram, setInstagram] = useState(config.instagram_handle ?? '')
  const [accentColor, setAccentColor] = useState(config.accent_color ?? '#2CC8E0')
  const [accentDeepColor, setAccentDeepColor] = useState(config.accent_deep_color ?? '#169FB6')
  const [heroOverline, setHeroOverline] = useState(config.hero_overline ?? '')
  const [heroTitle, setHeroTitle] = useState(config.hero_title ?? '')
  const [heroSubtitle, setHeroSubtitle] = useState(config.hero_subtitle ?? '')
  const [logoUrl, setLogoUrl] = useState(config.logo_url ?? '')
  const [logoWidth, setLogoWidth] = useState(config.logo_width ?? '340')
  const [announcementEnabled, setAnnouncementEnabled] = useState(config.announcement_enabled === 'true')
  const [announcementText, setAnnouncementText] = useState(config.announcement_text ?? '')
  const [announcementBg, setAnnouncementBg] = useState(config.announcement_bg ?? '#2CC8E0')
  const [announcementTextColor, setAnnouncementTextColor] = useState(config.announcement_text_color ?? '#ffffff')
  const [headerBg, setHeaderBg] = useState(config.header_bg ?? '#ffffff')
  const [headerTextColor, setHeaderTextColor] = useState(config.header_text_color ?? '#0A0A0A')
  const [navCatalogoLabel, setNavCatalogoLabel] = useState(config.nav_catalogo_label ?? 'Catálogo')
  const [navCarritoLabel, setNavCarritoLabel] = useState(config.nav_carrito_label ?? 'Carrito')
  const [navCheckoutLabel, setNavCheckoutLabel] = useState(config.nav_checkout_label ?? 'Checkout')

  async function handleSave() {
    setLoading(true)
    try {
      await setSiteConfigBulk({
        store_name: storeName,
        whatsapp_number: whatsapp,
        instagram_handle: instagram,
        accent_color: accentColor,
        accent_deep_color: accentDeepColor,
        hero_overline: heroOverline,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        logo_url: logoUrl,
        logo_width: logoWidth,
        announcement_enabled: announcementEnabled ? 'true' : 'false',
        announcement_text: announcementText,
        announcement_bg: announcementBg,
        announcement_text_color: announcementTextColor,
        header_bg: headerBg,
        header_text_color: headerTextColor,
        nav_catalogo_label: navCatalogoLabel,
        nav_carrito_label: navCarritoLabel,
        nav_checkout_label: navCheckoutLabel,
      })
      toast.success('Configuración guardada')
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Identidad */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identidad</h3>
        <div className="space-y-3 bg-card rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="store-name">Nombre del sitio</Label>
            <Input id="store-name" value={storeName} onChange={e => setStoreName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+54 9 11 1234 5678" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@fasebeta" />
          </div>
        </div>
      </div>

      {/* Colores */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Colores</h3>
        <div className="space-y-4 bg-card rounded-xl border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Color principal</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color profundo</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={accentDeepColor}
                  onChange={e => setAccentDeepColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input
                  value={accentDeepColor}
                  onChange={e => setAccentDeepColor(e.target.value)}
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center pt-1">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Botón
            </span>
            <span
              className="px-3 py-1 rounded-lg text-sm font-bold"
              style={{ color: accentDeepColor }}
            >
              $1.500
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Header</h3>
        <div className="space-y-4 bg-card rounded-xl border border-border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fondo del header</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={headerBg}
                  onChange={e => setHeaderBg(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input value={headerBg} onChange={e => setHeaderBg(e.target.value)} className="font-mono text-sm" maxLength={7} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color de texto</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={headerTextColor}
                  onChange={e => setHeaderTextColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input value={headerTextColor} onChange={e => setHeaderTextColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Sección 1</Label>
              <Input value={navCatalogoLabel} onChange={e => setNavCatalogoLabel(e.target.value)} placeholder="Catálogo" />
            </div>
            <div className="space-y-1.5">
              <Label>Sección 2</Label>
              <Input value={navCarritoLabel} onChange={e => setNavCarritoLabel(e.target.value)} placeholder="Carrito" />
            </div>
            <div className="space-y-1.5">
              <Label>Sección 3</Label>
              <Input value={navCheckoutLabel} onChange={e => setNavCheckoutLabel(e.target.value)} placeholder="Checkout" />
            </div>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-border text-sm"
            style={{ backgroundColor: headerBg, color: headerTextColor }}
          >
            <span className="font-semibold">Fase-Beta</span>
            <div className="flex gap-4">
              <span>{navCatalogoLabel}</span>
              <span>{navCarritoLabel}</span>
              <span>{navCheckoutLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hero</h3>
        <div className="space-y-3 bg-card rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="hero-overline">Texto superior (overline)</Label>
            <Input id="hero-overline" value={heroOverline} onChange={e => setHeroOverline(e.target.value)} placeholder="Catálogo completo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-title">Título principal</Label>
            <Input id="hero-title" value={heroTitle} onChange={e => setHeroTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-subtitle">Subtítulo</Label>
            <textarea
              id="hero-subtitle"
              value={heroSubtitle}
              onChange={e => setHeroSubtitle(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logo</h3>
        <div className="space-y-3 bg-card rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="logo-url">URL del logo</Label>
            <Input
              id="logo-url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://... (vacío = imagen por defecto)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo-width">Ancho máximo (px)</Label>
            <Input
              id="logo-width"
              type="number"
              value={logoWidth}
              onChange={e => setLogoWidth(e.target.value)}
              min="100"
              max="600"
              placeholder="340"
            />
          </div>
        </div>
      </div>

      {/* Barra de anuncio */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Barra de anuncio</h3>
        <div className="space-y-3 bg-card rounded-xl border border-border p-4">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={e => setAnnouncementEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Habilitar barra de anuncio
          </Label>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-text">Texto del anuncio</Label>
            <Input
              id="announcement-text"
              value={announcementText}
              onChange={e => setAnnouncementText(e.target.value)}
              disabled={!announcementEnabled}
              placeholder="¡Envío gratis en pedidos mayores a $5000!"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Color de fondo</Label>
              <input
                type="color"
                value={announcementBg}
                onChange={e => setAnnouncementBg(e.target.value)}
                disabled={!announcementEnabled}
                className="h-9 w-full cursor-pointer rounded border border-border bg-transparent p-0.5 disabled:opacity-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color de texto</Label>
              <input
                type="color"
                value={announcementTextColor}
                onChange={e => setAnnouncementTextColor(e.target.value)}
                disabled={!announcementEnabled}
                className="h-9 w-full cursor-pointer rounded border border-border bg-transparent p-0.5 disabled:opacity-40"
              />
            </div>
          </div>
          {announcementEnabled && announcementText && (
            <div
              className="w-full py-2 text-center text-sm font-medium rounded-lg"
              style={{ backgroundColor: announcementBg, color: announcementTextColor }}
            >
              {announcementText}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  )
}

// ── CmsClient ─────────────────────────────────────────────────────────────────

export function CmsClient({ promotions, lookups, products, banners, config }: Props) {
  return (
    <Tabs defaultValue="promotions">
      <TabsList>
        <TabsTrigger value="promotions">Promociones</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="flavors">Sabores</TabsTrigger>
        <TabsTrigger value="banners">Banners</TabsTrigger>
        <TabsTrigger value="site">Sitio</TabsTrigger>
      </TabsList>

      <TabsContent value="promotions" className="mt-4">
        <PromotionsTab promotions={promotions} products={products} />
      </TabsContent>

      <TabsContent value="categories" className="mt-4">
        <LookupTable
          items={lookups.categories}
          label="Categoría"
          actions={{
            create: createCategory,
            update: updateCategory,
            remove: deleteCategory,
          }}
        />
      </TabsContent>

      <TabsContent value="brands" className="mt-4">
        <LookupTable
          items={lookups.brands}
          label="Marca"
          actions={{
            create: createBrand,
            update: updateBrand,
            remove: deleteBrand,
          }}
        />
      </TabsContent>

      <TabsContent value="flavors" className="mt-4">
        <LookupTable
          items={lookups.flavors}
          label="Sabor"
          actions={{
            create: createFlavor,
            update: updateFlavor,
            remove: deleteFlavor,
          }}
        />
      </TabsContent>

      <TabsContent value="banners" className="mt-4">
        <BannersTab banners={banners} />
      </TabsContent>

      <TabsContent value="site" className="mt-4">
        <SiteConfigTab config={config} />
      </TabsContent>
    </Tabs>
  )
}
