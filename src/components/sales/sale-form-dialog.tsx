'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { createSale } from '@/actions/sales'
import { createComboSale } from '@/actions/combos'
import type { ProductWithRelations } from '@/types'
import type { ComboFull } from '@/actions/combos'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: {id:number,name:string}[] }
  combos?: ComboFull[]
}

export function SaleFormDialog({ products, lookups, combos = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saleType, setSaleType] = useState<'product' | 'combo'>('product')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [selectedCombo, setSelectedCombo] = useState<ComboFull | null>(null)
  const [groupSelections, setGroupSelections] = useState<{ itemId: number; productId: number }[]>([])
  const [comboPrice, setComboPrice] = useState('')

  const availableProducts = products.filter(p => p.stock > 0)
  const availableCombos = combos.filter(c => c.availableStock > 0)

  function handleComboChange(comboId: string) {
    const combo = availableCombos.find(c => c.id === Number(comboId)) ?? null
    setSelectedCombo(combo)
    setComboPrice(combo ? String(Number(combo.priceEffective)) : '')
    // Init group selections with first available product for each group slot
    const sels: { itemId: number; productId: number }[] = []
    for (const item of combo?.items ?? []) {
      if (item.productGroupName) {
        const match = products.find(p =>
          p.name === item.productGroupName &&
          (item.productGroupWeight == null || p.weightG === item.productGroupWeight) &&
          p.stock > 0
        )
        if (match) sels.push({ itemId: item.id, productId: match.id })
      }
    }
    setGroupSelections(sels)
  }

  function resetState() {
    setSaleType('product')
    setSelectedProduct(null)
    setSelectedCombo(null)
    setGroupSelections([])
    setComboPrice('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      if (saleType === 'combo' && selectedCombo) {
        await createComboSale({
          comboId: selectedCombo.id,
          quantity: Number(fd.get('quantity')),
          effectivePrice: Number(comboPrice),
          paymentMethodId: fd.get('paymentMethodId') ? Number(fd.get('paymentMethodId')) : undefined,
          notes: (fd.get('notes') as string) || undefined,
          date: fd.get('date') ? new Date(fd.get('date') as string) : new Date(),
          groupSelections,
        })
      } else {
        await createSale({
          productId: Number(fd.get('productId')),
          quantity: Number(fd.get('quantity')),
          effectivePrice: Number(fd.get('effectivePrice')),
          paymentMethodId: fd.get('paymentMethodId') ? Number(fd.get('paymentMethodId')) : undefined,
          notes: (fd.get('notes') as string) || undefined,
          date: fd.get('date') ? new Date(fd.get('date') as string) : new Date(),
        })
      }
      toast.success('Venta registrada')
      setOpen(false)
      resetState()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  const groupSlots = useMemo(() =>
    selectedCombo?.items.filter(i => i.productGroupName) ?? [],
    [selectedCombo]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nueva venta
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Tipo de venta */}
          {combos.length > 0 && (
            <div className="flex rounded-lg border border-input overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setSaleType('product'); setSelectedCombo(null) }}
                className={`flex-1 py-2 transition-colors ${saleType === 'product' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
              >
                Producto individual
              </button>
              <button
                type="button"
                onClick={() => { setSaleType('combo'); setSelectedProduct(null) }}
                className={`flex-1 py-2 transition-colors ${saleType === 'combo' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
              >
                Combo
              </button>
            </div>
          )}

          {saleType === 'product' ? (
            <>
              <div className="space-y-1.5">
                <Label>Producto *</Label>
                <Select
                  name="productId"
                  required
                  onValueChange={v => setSelectedProduct(availableProducts.find(p => p.id === Number(v)) ?? null)}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}{p.weightG ? ` ${p.weightG}g` : ''}{p.flavor ? ` · ${p.flavor}` : ''} — stock: {p.stock}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">Stock: <strong>{selectedProduct.stock}</strong></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" max={selectedProduct?.stock ?? undefined} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="effectivePrice">Precio *</Label>
                  <Input id="effectivePrice" name="effectivePrice" type="number" step="1" required />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Combo *</Label>
                <Select required onValueChange={handleComboChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar combo" /></SelectTrigger>
                  <SelectContent>
                    {availableCombos.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} — stock: {c.availableStock}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Group slot pickers */}
              {groupSlots.map(slot => {
                const opts = products.filter(p =>
                  p.name === slot.productGroupName &&
                  (slot.productGroupWeight == null || p.weightG === slot.productGroupWeight) &&
                  p.stock > 0
                )
                const current = groupSelections.find(s => s.itemId === slot.id)?.productId ?? ''
                return (
                  <div key={slot.id} className="space-y-1.5">
                    <Label>{slot.productName ?? slot.productGroupName}{slot.productGroupWeight ? ` ${slot.productGroupWeight}g` : ''} — elegí sabor</Label>
                    <Select
                      required
                      value={String(current)}
                      onValueChange={v => setGroupSelections(prev => {
                        const rest = prev.filter(s => s.itemId !== slot.id)
                        return [...rest, { itemId: slot.id, productId: Number(v) }]
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar sabor" /></SelectTrigger>
                      <SelectContent>
                        {opts.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.flavor ?? p.name} — stock: {p.stock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" max={selectedCombo?.availableStock ?? undefined} required defaultValue="1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Precio combo *</Label>
                  <Input
                    type="number" step="1" required
                    value={comboPrice}
                    onChange={e => setComboPrice(e.target.value)}
                  />
                </div>
              </div>

              {selectedCombo && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Productos incluidos:</p>
                  {selectedCombo.items.map(item => (
                    <p key={item.id} className="text-muted-foreground">
                      {item.productGroupName
                        ? `• ${item.productGroupName}${item.productGroupWeight ? ` ${item.productGroupWeight}g` : ''} × ${item.quantity} (cualquier sabor)`
                        : `• ${item.productName}${item.productFlavor ? ` · ${item.productFlavor}` : ''} × ${item.quantity}`
                      }
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select name="paymentMethodId">
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {lookups.paymentMethods.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
