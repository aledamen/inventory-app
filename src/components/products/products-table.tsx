'use client'

import { useState, useMemo } from 'react'
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
import { Trash2, Eye, EyeOff, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Props = {
  products: ProductWithRelations[]
  lookups: { categories: {id:number,name:string}[], brands: {id:number,name:string}[], flavors: {id:number,name:string}[], banners: {id:number,name:string,color:string}[] }
}

type SortField = 'sku' | 'name' | 'brand' | 'cost' | 'stock'

function stockBadge(stock: number, min: number | null) {
  if (stock === 0) return <Badge variant="destructive">Sin stock</Badge>
  if (min && stock <= min) return <Badge variant="outline" className="border-orange-400 text-orange-600">⚠ {stock} (bajo)</Badge>
  return <Badge variant="secondary" className="text-green-700">{stock}</Badge>
}

export function ProductsTable({ products, lookups }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = q
      ? products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false)
        )
      : [...products]

    rows.sort((a, b) => {
      let av: string | number, bv: string | number
      switch (sortField) {
        case 'sku':   av = a.sku;              bv = b.sku;              break
        case 'name':  av = a.name;             bv = b.name;             break
        case 'brand': av = a.brand ?? '';      bv = b.brand ?? '';      break
        case 'cost':  av = Number(a.cost);     bv = Number(b.cost);     break
        case 'stock': av = a.stock;            bv = b.stock;            break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [products, search, sortField, sortDir])

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

  function SortHead({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sortField === field
    return (
      <TableHead className={cn('cursor-pointer select-none hover:text-foreground', className)} onClick={() => handleSort(field)}>
        <div className="flex items-center gap-1">
          {children}
          {active
            ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
        </div>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nombre, SKU o marca..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <SortHead field="sku">SKU</SortHead>
              <SortHead field="name">Nombre</SortHead>
              <TableHead>Sabor</TableHead>
              <SortHead field="brand">Marca</SortHead>
              <SortHead field="cost" className="text-right">Costo</SortHead>
              <SortHead field="stock" className="text-center">Stock</SortHead>
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
                    title={p.visible ? 'Visible — clic para ocultar' : 'Oculto — clic para publicar'}
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
