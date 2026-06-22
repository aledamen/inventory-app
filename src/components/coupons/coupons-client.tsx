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
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { createCoupon, updateCoupon, deleteCoupon, toggleCouponActive } from '@/actions/coupons'
import type { CouponFull, CouponUse } from '@/actions/coupons'
import type { Influencer } from '@/actions/influencers'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  coupons: CouponFull[]
  couponUses: CouponUse[]
  influencers: Influencer[]
}

function formatAmount(val: string | null | undefined) {
  if (!val) return '—'
  return `$${Number(val).toLocaleString('es-AR')}`
}

function CouponDialog({
  coupon,
  influencers,
  mode = 'create',
}: {
  coupon?: CouponFull
  influencers: Influencer[]
  mode?: 'create' | 'edit'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    (coupon?.discountType as 'percentage' | 'fixed') ?? 'percentage'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const data = {
      code: fd.get('code') as string,
      description: (fd.get('description') as string) || undefined,
      discountType,
      discountValue: Number(fd.get('discountValue')),
      minOrderAmount: fd.get('minOrderAmount') ? Number(fd.get('minOrderAmount')) : undefined,
      maxUses: fd.get('maxUses') ? Number(fd.get('maxUses')) : undefined,
      active: fd.get('active') === 'on',
      validFrom: fd.get('validFrom') ? new Date(fd.get('validFrom') as string) : undefined,
      validTo: fd.get('validTo') ? new Date(fd.get('validTo') as string) : undefined,
      influencerId: fd.get('influencerId') ? Number(fd.get('influencerId')) : null,
    }

    try {
      if (mode === 'edit' && coupon) {
        await updateCoupon(coupon.id, data)
      } else {
        await createCoupon(data)
      }
      toast.success(mode === 'edit' ? 'Cupón actualizado' : 'Cupón creado')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const toDateInput = (d: Date | null | undefined) => {
    if (!d) return ''
    return new Date(d).toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={mode === 'create'
        ? <Button><Plus className="h-4 w-4 mr-2" />Nuevo cupón</Button>
        : <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar cupón' : 'Nuevo cupón'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código *</Label>
              <Input id="code" name="code" required placeholder="PROMO10" defaultValue={coupon?.code}
                className="uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de descuento *</Label>
              <Select
                value={discountType}
                items={[
                  { value: 'percentage', label: 'Porcentaje (%)' },
                  { value: 'fixed', label: 'Monto fijo ($)' },
                ]}
                onValueChange={v => setDiscountType(v as 'percentage' | 'fixed')}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discountValue">
                {discountType === 'percentage' ? 'Descuento (%)' : 'Descuento ($)'} *
              </Label>
              <Input
                id="discountValue" name="discountValue" type="number" min="0"
                max={discountType === 'percentage' ? 100 : undefined}
                step={discountType === 'percentage' ? '0.1' : '1'}
                required defaultValue={coupon?.discountValue}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minOrderAmount">Monto mínimo ($)</Label>
              <Input id="minOrderAmount" name="minOrderAmount" type="number" min="0"
                defaultValue={coupon?.minOrderAmount ?? ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">Usos máximos</Label>
              <Input id="maxUses" name="maxUses" type="number" min="1" placeholder="Sin límite"
                defaultValue={coupon?.maxUses ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="influencerId">Influencer</Label>
              <Select
                name="influencerId"
                defaultValue={coupon?.influencerId ? String(coupon.influencerId) : ''}
                items={[
                  { value: '', label: 'Sin influencer' },
                  ...influencers.filter(i => i.active).map(i => ({ value: String(i.id), label: `${i.name}${i.socialUsername ? ` (${i.socialUsername})` : ''}` })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin influencer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin influencer</SelectItem>
                  {influencers.filter(i => i.active).map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name}{i.socialUsername ? ` (${i.socialUsername})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Válido desde</Label>
              <Input id="validFrom" name="validFrom" type="date" defaultValue={toDateInput(coupon?.validFrom)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validTo">Válido hasta</Label>
              <Input id="validTo" name="validTo" type="date" defaultValue={toDateInput(coupon?.validTo)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={coupon?.description ?? ''} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" name="active" defaultChecked={coupon?.active ?? true} className="h-4 w-4" />
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

export function CouponsClient({ coupons, couponUses, influencers }: Props) {
  const router = useRouter()

  async function handleDelete(id: number, code: string) {
    if (!confirm(`¿Eliminar el cupón ${code}?`)) return
    try {
      await deleteCoupon(id)
      toast.success('Cupón eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  async function handleToggle(id: number, active: boolean) {
    try {
      await toggleCouponActive(id, !active)
      toast.success(!active ? 'Cupón activado' : 'Cupón desactivado')
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  return (
    <Tabs defaultValue="coupons">
      <div className="flex items-center justify-between mb-4">
        <TabsList>
          <TabsTrigger value="coupons">Cupones</TabsTrigger>
          <TabsTrigger value="history">Historial de usos</TabsTrigger>
        </TabsList>
        <CouponDialog mode="create" influencers={influencers} />
      </div>

      <TabsContent value="coupons">
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Influencer</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay cupones creados
                  </TableCell>
                </TableRow>
              )}
              {coupons.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>
                    {c.discountType === 'percentage'
                      ? `${Number(c.discountValue)}%`
                      : formatAmount(c.discountValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.influencerName ?? '—'}
                  </TableCell>
                  <TableCell>
                    {c.usesCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.validTo ? new Date(c.validTo).toLocaleDateString('es-AR') : 'Sin vencimiento'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.active ? 'default' : 'secondary'}>
                      {c.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleToggle(c.id, c.active)}
                        title={c.active ? 'Desactivar' : 'Activar'}
                      >
                        {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <CouponDialog coupon={c} influencers={influencers} mode="edit" />
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => handleDelete(c.id, c.code)}
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
      </TabsContent>

      <TabsContent value="history">
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cupón</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponUses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay usos registrados
                  </TableCell>
                </TableRow>
              )}
              {couponUses.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-semibold">{u.couponCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.source === 'catalog' ? 'Catálogo' : 'Manual'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.clientName ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatAmount(u.originalAmount)}</TableCell>
                  <TableCell className="text-right text-red-600">−{formatAmount(u.discountApplied)}</TableCell>
                  <TableCell className="text-right font-medium">{formatAmount(u.finalAmount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.usedAt ? new Date(u.usedAt).toLocaleDateString('es-AR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
