'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
import { createProduct, updateProduct } from '@/actions/products'
import { uploadProductImage, deleteProductImage, toggleProductVisible } from '@/actions/upload'
import type { ProductWithRelations } from '@/types'
import { Plus, Pencil, Upload, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type Lookups = {
  categories: {id:number,name:string}[]
  brands: {id:number,name:string}[]
  flavors: {id:number,name:string}[]
  banners: {id:number,name:string,color:string}[]
}

type Props = {
  lookups: Lookups
  product?: ProductWithRelations
  mode?: 'create' | 'edit'
}

export function ProductFormDialog({ lookups, product, mode = 'create' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null)
  const [dragOver, setDragOver] = useState(false)
  const [bannerId, setBannerId] = useState<string>(product?.bannerId ? String(product.bannerId) : '')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      sku: fd.get('sku') as string,
      name: fd.get('name') as string,
      cost: Number(fd.get('cost')),
      categoryId: fd.get('categoryId') ? Number(fd.get('categoryId')) : undefined,
      brandId: fd.get('brandId') ? Number(fd.get('brandId')) : undefined,
      flavorId: fd.get('flavorId') ? Number(fd.get('flavorId')) : undefined,
      weightG: fd.get('weightG') ? Number(fd.get('weightG')) : undefined,
      stockMin: fd.get('stockMin') ? Number(fd.get('stockMin')) : undefined,
      type: fd.get('type') as string || 'estandar',
      notes: fd.get('notes') as string || undefined,
      description: fd.get('description') as string || undefined,
      badge: (fd.get('badge') as string) || null,
      featured: fd.get('featured') === 'on',
      bannerId: bannerId ? Number(bannerId) : null,
    }
    try {
      if (mode === 'edit' && product) {
        await updateProduct(product.id, data)
        toast.success('Producto actualizado')
      } else {
        await createProduct(data)
        toast.success('Producto creado')
      }
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  async function handleImageFile(file: File) {
    if (!product?.id) return toast.error('Guardá el producto primero antes de subir imagen')
    if (!file.type.startsWith('image/')) return toast.error('El archivo debe ser una imagen')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const url = await uploadProductImage(product.id, fd)
      setImageUrl(url)
      toast.success('Imagen subida')
      router.refresh()
    } catch {
      toast.error('Error al subir imagen — verificá que BLOB_READ_WRITE_TOKEN esté configurado')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteImage() {
    if (!product?.id) return
    setUploading(true)
    try {
      await deleteProductImage(product.id)
      setImageUrl(null)
      toast.success('Imagen eliminada')
      router.refresh()
    } catch {
      toast.error('Error al eliminar imagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggleVisible() {
    if (!product?.id) return
    try {
      await toggleProductVisible(product.id, !product.visible)
      toast.success(product.visible ? 'Producto oculto del catálogo' : 'Producto visible en el catálogo')
      router.refresh()
    } catch {
      toast.error('Error al cambiar visibilidad')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === 'edit'
        ? <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}><Pencil className="h-3.5 w-3.5" /></DialogTrigger>
        : <DialogTrigger render={<Button />}><Plus className="h-4 w-4 mr-2" />Nuevo producto</DialogTrigger>
      }
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Image upload — only in edit mode */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Imagen del catálogo</Label>
                {product?.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={handleToggleVisible}
                  >
                    {product.visible
                      ? <><EyeOff className="h-3.5 w-3.5" />Ocultar</>
                      : <><Eye className="h-3.5 w-3.5" />Publicar</>}
                  </Button>
                )}
              </div>

              <div
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
                  ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  ${imageUrl ? 'p-2' : 'p-8'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleImageFile(file)
                }}
              >
                {imageUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image src={imageUrl} alt="Producto" fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{imageUrl.split('/').pop()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Clic o arrastrá para reemplazar</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={e => { e.stopPropagation(); handleDeleteImage() }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8" />
                    <p className="text-sm">Arrastrá o hacé clic para subir</p>
                    <p className="text-xs">JPG, PNG, WebP — máx. 4.5 MB</p>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
                    <p className="text-sm text-muted-foreground">Subiendo...</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" name="sku" required defaultValue={product?.sku} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Costo *</Label>
              <Input id="cost" name="cost" type="number" step="0.01" required defaultValue={product?.cost} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select name="categoryId" defaultValue={String(lookups.categories.find(c => c.name === product?.category)?.id ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Select name="brandId" defaultValue={String(lookups.brands.find(b => b.name === product?.brand)?.id ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.brands.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sabor</Label>
              <Select name="flavorId" defaultValue={String(lookups.flavors.find(f => f.name === product?.flavor)?.id ?? '')}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.flavors.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightG">Peso (g)</Label>
              <Input id="weightG" name="weightG" type="number" defaultValue={product?.weightG ?? ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stockMin">Stock mínimo</Label>
              <Input id="stockMin" name="stockMin" type="number" defaultValue={product?.stockMin ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Input id="type" name="type" defaultValue={product?.type ?? 'estandar'} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={product?.notes ?? ''} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción (catálogo)</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={product?.description ?? ''} />
          </div>

          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label>Banner</Label>
              <Select value={bannerId} onValueChange={v => setBannerId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Sin banner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin banner</SelectItem>
                  {lookups.banners.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      <span className="flex items-center gap-2">
                        <span style={{ backgroundColor: b.color }} className="inline-block w-3 h-3 rounded-full" />
                        {b.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="badge">Badge</Label>
              <Input id="badge" name="badge" placeholder="Nuevo, Promo, Limitado..." defaultValue={product?.badge ?? ''} />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <Label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4" />
                Destacado en catálogo
              </Label>
            </div>
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
