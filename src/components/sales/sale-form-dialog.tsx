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
import {
  Combobox, ComboboxInput, ComboboxContent, ComboboxList,
  ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { createMultiSale } from '@/actions/sales'
import { createComboSale } from '@/actions/combos'
import type { ProductWithRelations } from '@/types'
import type { ComboFull } from '@/actions/combos'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Client = { id: number; name: string; phone: string | null }

type SaleItem = {
  key: string
  productId: string
  quantity: number
  effectivePrice: number
}

type Props = {
  products: ProductWithRelations[]
  lookups: { paymentMethods: {id:number,name:string}[] }
  combos?: ComboFull[]
  clients?: Client[]
}

function newItem(): SaleItem {
  return { key: Math.random().toString(36).slice(2), productId: '', quantity: 1, effectivePrice: 0 }
}

export function SaleFormDialog({ products, lookups, combos = [], clients = [] }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saleType, setSaleType] = useState<'product' | 'combo'>('product')

  // Multi-item state
  const [items, setItems] = useState<SaleItem[]>([newItem()])

  // Combo state
  const [selectedCombo, setSelectedCombo] = useState<ComboFull | null>(null)
  const [groupSelections, setGroupSelections] = useState<{ itemId: number; productId: number }[]>([])
  const [comboPrice, setComboPrice] = useState('')

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const selectedClientName = clients.find(c => c.id === selectedClientId)?.name ?? null

  const availableProducts = products.filter(p => p.stock > 0)
  const availableCombos = combos.filter(c => c.availableStock > 0)

  const saleTotal = useMemo(
    () => items.reduce((s, i) => s + i.effectivePrice * i.quantity, 0),
    [items]
  )

  function updateItem(key: string, patch: Partial<SaleItem>) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function handleProductSelect(key: string, productId: string | null) {
    if (!productId) return
    const p = availableProducts.find(p => String(p.id) === productId)
    updateItem(key, {
      productId,
      effectivePrice: p?.priceCashRounded ?? 0,
    })
  }

  function handleComboChange(comboId: string | null) {
    if (!comboId) return
    const combo = availableCombos.find(c => c.id === Number(comboId)) ?? null
    setSelectedCombo(combo)
    setComboPrice(combo ? String(Number(combo.priceEffective)) : '')
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
    setItems([newItem()])
    setSelectedCombo(null)
    setGroupSelections([])
    setComboPrice('')
    setSelectedClientId(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const date = fd.get('date') ? new Date(`${fd.get('date') as string}T00:00:00`) : new Date()
      const paymentMethodId = fd.get('paymentMethodId') ? Number(fd.get('paymentMethodId')) : undefined
      const notes = (fd.get('notes') as string) || undefined

      if (saleType === 'combo' && selectedCombo) {
        await createComboSale({
          comboId: selectedCombo.id,
          quantity: Number(fd.get('quantity')),
          effectivePrice: Number(comboPrice),
          paymentMethodId,
          notes,
          date,
          clientId: selectedClientId ?? undefined,
          groupSelections,
        })
      } else {
        const validItems = items.filter(i => i.productId && i.quantity > 0)
        if (validItems.length === 0) throw new Error('Agregá al menos un producto')

        await createMultiSale({
          items: validItems.map(i => ({
            productId: Number(i.productId),
            quantity: i.quantity,
            effectivePrice: i.effectivePrice,
          })),
          paymentMethodId,
          notes,
          date,
          clientId: selectedClientId ?? undefined,
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

  const groupSlots = useMemo(
    () => selectedCombo?.items.filter(i => i.productGroupName) ?? [],
    [selectedCombo]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />Nueva venta
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {combos.length > 0 && (
            <div className="flex rounded-lg border border-input overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setSaleType('product'); setSelectedCombo(null) }}
                className={`flex-1 py-2 transition-colors ${saleType === 'product' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
              >
                Productos
              </button>
              <button
                type="button"
                onClick={() => { setSaleType('combo'); setItems([newItem()]) }}
                className={`flex-1 py-2 transition-colors ${saleType === 'combo' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}`}
              >
                Combo
              </button>
            </div>
          )}

          {saleType === 'product' ? (
            <div className="space-y-3">
              {items.map((item, idx) => {
                const selectedProduct = availableProducts.find(p => String(p.id) === item.productId)
                return (
                  <div key={item.key} className="rounded-lg border border-border p-3 space-y-3 relative">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <p className="text-xs font-medium text-muted-foreground">Producto {idx + 1}</p>
                    <div className="space-y-1.5">
                      <Select
                        required
                        value={item.productId}
                        items={availableProducts.map(p => ({
                          value: String(p.id),
                          label: `${p.name}${p.weightG ? ` ${p.weightG}g` : ''}${p.flavor ? ` · ${p.flavor}` : ''}`,
                        }))}
                        onValueChange={v => handleProductSelect(item.key, v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}{p.weightG ? ` ${p.weightG}g` : ''}{p.flavor ? ` · ${p.flavor}` : ''} — stock: {p.stock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && (
                        <p className="text-xs text-muted-foreground">Stock disponible: <strong>{selectedProduct.stock}</strong></p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedProduct?.stock ?? undefined}
                          required
                          value={item.quantity}
                          onChange={e => updateItem(item.key, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio unitario</Label>
                        <Input
                          type="number"
                          step="1"
                          required
                          value={item.effectivePrice || ''}
                          onChange={e => updateItem(item.key, { effectivePrice: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setItems(prev => [...prev, newItem()])}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />Agregar producto
              </Button>

              {items.length > 1 && saleTotal > 0 && (
                <div className="flex justify-between items-center rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total venta</span>
                  <span className="font-semibold">${saleTotal.toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Combo *</Label>
                <Select required items={availableCombos.map(c => ({ value: String(c.id), label: c.name }))} onValueChange={handleComboChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar combo" /></SelectTrigger>
                  <SelectContent>
                    {availableCombos.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} — stock: {c.availableStock}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                      items={opts.map(p => ({ value: String(p.id), label: p.flavor ?? p.name }))}
                      onValueChange={v => setGroupSelections(prev => {
                        const rest = prev.filter(s => s.itemId !== slot.id)
                        return [...rest, { itemId: slot.id, productId: Number(v) }]
                      })}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar sabor" /></SelectTrigger>
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

          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Combobox
                value={selectedClientName}
                onValueChange={v => setSelectedClientId(v ? (clients.find(c => c.name === v)?.id ?? null) : null)}
              >
                <ComboboxInput showClear placeholder="Buscar cliente..." className="w-full" />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                    {clients.map(c => (
                      <ComboboxItem key={c.id} value={c.name}>
                        {c.name}{c.phone ? ` · ${c.phone}` : ''}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select name="paymentMethodId" items={lookups.paymentMethods.map(p => ({ value: String(p.id), label: p.name }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
