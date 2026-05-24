'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductFormDialog } from './product-form-dialog'
import { deleteProduct } from '@/actions/products'
import { toggleProductVisible } from '@/actions/upload'
import type { ProductWithRelations } from '@/types'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  products: ProductWithRelations[]
  lookups: { categories: {id:number,name:string}[], brands: {id:number,name:string}[], flavors: {id:number,name:string}[] }
}

function stockBadge(stock: number, min: number | null) {
  if (stock === 0) return <Badge variant="destructive">Sin stock</Badge>
  if (min && stock <= min) return <Badge variant="outline" className="border-orange-400 text-orange-600">⚠ Bajo</Badge>
  return <Badge variant="secondary" className="text-green-700">{stock}</Badge>
}

export function ProductsTable({ products, lookups }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    try {
      await deleteProduct(id)
      toast.success('Producto eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleToggleVisible(id: number, current: boolean | null) {
    try {
      await toggleProductVisible(id, !current)
      toast.success(!current ? 'Visible en catálogo' : 'Oculto del catálogo')
      router.refresh()
    } catch {
      toast.error('Error al cambiar visibilidad')
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nombre, SKU o marca..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Sabor</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Catálogo</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No hay productos
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">{p.sku.slice(0, 2)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.flavor ?? '—'}</TableCell>
                <TableCell>{p.brand ?? '—'}</TableCell>
                <TableCell className="text-right">
                  ${Number(p.cost).toLocaleString('es-AR')}
                </TableCell>
                <TableCell className="text-center">
                  {stockBadge(p.stock, p.stockMin)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${p.visible ? 'text-green-600' : 'text-muted-foreground'}`}
                    onClick={() => handleToggleVisible(p.id, p.visible)}
                    title={p.visible ? 'Visible en catálogo — clic para ocultar' : 'Oculto del catálogo — clic para publicar'}
                  >
                    {p.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <ProductFormDialog lookups={lookups} product={p} mode="edit" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id, p.name)}
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
