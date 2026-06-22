'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import type { InfluencerStat, MonthlyStat, CouponUseDetail } from '@/actions/coupons'
import type { PendingDeliveryRow } from '@/actions/influencer-compensations'

type Props = {
  influencerStats: InfluencerStat[]
  monthlyStats: MonthlyStat[]
  useDetails: CouponUseDetail[]
  pendingDeliveries: PendingDeliveryRow[]
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function fmtMonth(m: string) {
  const [year, month] = m.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[Number(month) - 1]} ${year}`
}

function deliveryTriggerLabel(trigger: string) {
  switch (trigger) {
    case 'milestone_sales': return 'Meta ventas'
    case 'milestone_revenue': return 'Meta revenue'
    case 'post': return 'Posteo'
    default: return 'Manual'
  }
}

export function MarketingAnalyticsClient({ influencerStats, monthlyStats, useDetails, pendingDeliveries }: Props) {
  const [tab, setTab] = useState('influencers')

  const totalRevenue = influencerStats.reduce((s, i) => s + i.totalRevenue, 0)
  const totalDiscount = influencerStats.reduce((s, i) => s + i.totalDiscount, 0)
  const totalSales = influencerStats.reduce((s, i) => s + i.salesCount, 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Ventas con cupón', value: totalSales },
          { label: 'Revenue total', value: fmt(totalRevenue) },
          { label: 'Descuentos dados', value: fmt(totalDiscount) },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Pending deliveries */}
      {pendingDeliveries.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400">
              Compensaciones pendientes — {pendingDeliveries.length}
            </p>
          </div>
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Hace</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeliveries.map(d => (
                  <TableRow key={d.deliveryId}>
                    <TableCell className="font-medium">{d.influencerName}</TableCell>
                    <TableCell>{d.productName}</TableCell>
                    <TableCell>{d.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {deliveryTriggerLabel(d.trigger)}
                      {d.triggerRef && <span className="ml-1 text-xs">· {d.triggerRef}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.daysAgo === 0 ? 'Hoy' : `${d.daysAgo}d`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/influencers/${d.influencerId}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent transition-colors"
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="influencers">Por influencer</TabsTrigger>
          <TabsTrigger value="monthly">Por mes</TabsTrigger>
          <TabsTrigger value="uses">Usos individuales</TabsTrigger>
        </TabsList>

        {/* Per influencer */}
        <TabsContent value="influencers">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Cupón</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencerStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay ventas con cupón de influencer registradas
                    </TableCell>
                  </TableRow>
                )}
                {influencerStats.map(s => (
                  <TableRow key={s.couponId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.influencerName}</p>
                        {s.influencerHandle && (
                          <p className="text-xs text-muted-foreground">
                            {s.socialNetworkName && `${s.socialNetworkName} · `}{s.influencerHandle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{s.couponCode}</TableCell>
                    <TableCell className="text-right">{s.salesCount}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(s.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-red-500">−{fmt(s.totalDiscount)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{fmt(s.netRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Cupón</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin datos mensuales
                    </TableCell>
                  </TableRow>
                )}
                {monthlyStats.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{fmtMonth(s.month)}</TableCell>
                    <TableCell>{s.influencerName}</TableCell>
                    <TableCell className="font-mono">{s.couponCode}</TableCell>
                    <TableCell className="text-right">{s.uses}</TableCell>
                    <TableCell className="text-right">{fmt(s.revenue)}</TableCell>
                    <TableCell className="text-right text-red-500">−{fmt(s.discount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Individual uses */}
        <TabsContent value="uses">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cupón</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead>Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useDetails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No hay usos registrados
                    </TableCell>
                  </TableRow>
                )}
                {useDetails.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {u.usedAt ? new Date(u.usedAt).toLocaleDateString('es-AR') : '—'}
                    </TableCell>
                    <TableCell>{u.clientName ?? '—'}</TableCell>
                    <TableCell className="font-mono font-semibold">{u.couponCode ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.influencerName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.source === 'catalog' ? 'Catálogo' : 'Manual'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt(u.originalAmount)}</TableCell>
                    <TableCell className="text-right text-red-500">−{fmt(u.discountApplied)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(u.finalAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.saleId ? `#${u.saleId}` : <span className="opacity-40">Sin vincular</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
