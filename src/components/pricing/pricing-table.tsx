'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updatePricing } from '@/actions/pricing'
import { toast } from 'sonner'
import { Check, Pencil, X } from 'lucide-react'

type PricingRow = {
  id: number
  sku: string | null
  name: string | null
  flavor: string | null
  brand: string | null
  cost: string | null
  totalCost: string | null
  marginCash: string | null
  marginTransfer: string | null
  marginList: string | null
  priceCashRounded: number | null
  priceTransferRounded: number | null
  priceListRounded: number | null
  clientShipping: number | null
  profit: string | null
}

type EditState = {
  marginCash: string
  marginTransfer: string
  marginList: string
  clientShipping: string
}

const pct = (v: string | null) => v ? `${(Number(v) * 100).toFixed(0)}%` : '—'
const $ = (v: number | null) => v ? `$${v.toLocaleString('es-AR')}` : '—'

export function PricingTable({ rows }: { rows: PricingRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r =>
    (r.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (r.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  function startEdit(row: PricingRow) {
    setEditingId(row.id)
    setEditState({
      marginCash: String(Math.round(Number(row.marginCash ?? 0) * 100)),
      marginTransfer: String(Math.round(Number(row.marginTransfer ?? 0) * 100)),
      marginList: String(Math.round(Number(row.marginList ?? 0) * 100)),
      clientShipping: String(row.clientShipping ?? 3500),
    })
  }

  async function saveEdit(id: number) {
    if (!editState) return
    setLoading(true)
    try {
      await updatePricing(id, {
        marginCash: Number(editState.marginCash) / 100,
        marginTransfer: Number(editState.marginTransfer) / 100,
        marginList: Number(editState.marginList) / 100,
        clientShipping: Number(editState.clientShipping),
      })
      toast.success('Precios actualizados')
      setEditingId(null)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nombre o SKU..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Costo total</TableHead>
              <TableHead className="text-center">Mg. Ef.</TableHead>
              <TableHead className="text-center">Mg. Trans.</TableHead>
              <TableHead className="text-center">Mg. Lista</TableHead>
              <TableHead className="text-right">P. Efectivo</TableHead>
              <TableHead className="text-right">P. Trans.</TableHead>
              <TableHead className="text-right">P. Lista</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No hay datos de precios. Ejecutá la migración primero.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(row => {
              const isEditing = editingId === row.id

              return (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.sku ?? '—'}</TableCell>
                  <TableCell>
                    {row.name ?? '—'}
                    {row.flavor && <span className="text-muted-foreground"> · {row.flavor}</span>}
                  </TableCell>
                  <TableCell className="text-right">{row.totalCost ? `$${Number(row.totalCost).toLocaleString('es-AR')}` : '—'}</TableCell>

                  {isEditing && editState ? (
                    <>
                      <TableCell><Input value={editState.marginCash} onChange={e => setEditState(s => s ? {...s, marginCash: e.target.value} : s)} className="w-16 h-7 text-center text-sm" /></TableCell>
                      <TableCell><Input value={editState.marginTransfer} onChange={e => setEditState(s => s ? {...s, marginTransfer: e.target.value} : s)} className="w-16 h-7 text-center text-sm" /></TableCell>
                      <TableCell><Input value={editState.marginList} onChange={e => setEditState(s => s ? {...s, marginList: e.target.value} : s)} className="w-16 h-7 text-center text-sm" /></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-center">{pct(row.marginCash)}</TableCell>
                      <TableCell className="text-center">{pct(row.marginTransfer)}</TableCell>
                      <TableCell className="text-center">{pct(row.marginList)}</TableCell>
                    </>
                  )}

                  <TableCell className="text-right font-medium">{$(row.priceCashRounded)}</TableCell>
                  <TableCell className="text-right">{$(row.priceTransferRounded)}</TableCell>
                  <TableCell className="text-right">{$(row.priceListRounded)}</TableCell>
                  <TableCell className="text-right text-green-700">
                    {row.profit ? `$${Number(row.profit).toLocaleString('es-AR', {maximumFractionDigits:0})}` : '—'}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(row.id)} disabled={loading}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
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
