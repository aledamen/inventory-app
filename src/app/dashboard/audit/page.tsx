'use client'

import { useEffect, useState, useMemo } from 'react'
import { getAuditLogs } from '@/actions/audit'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// ── Humanization helpers ─────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  stock_movements: 'Entrada de stock',
  sales: 'Venta',
  products: 'Producto',
  expenses: 'Gasto',
  capital_movements: 'Caja',
  clients: 'Cliente',
  suppliers: 'Proveedor',
  returns: 'Devolución',
  orders: 'Pedido',
  stock_adjustments: 'Ajuste de stock',
}

const FIELD_LABELS: Record<string, string> = {
  movement_number: 'N° entrada',
  unit_cost: 'Costo unitario',
  total: 'Total',
  quantity: 'Cantidad',
  shipping_cost: 'Costo envío',
  sale_number: 'N° venta',
  effective_price: 'Precio efectivo',
  sale_value: 'Valor venta',
  total_sale: 'Total venta',
  net_profit: 'Ganancia neta',
  gross_profit: 'Ganancia bruta',
  total_cost: 'Costo total',
  type: 'Tipo',
  amount: 'Monto',
  name: 'Nombre',
  cost: 'Costo',
  stock: 'Stock',
  stock_min: 'Stock mínimo',
  sku: 'SKU',
  date: 'Fecha',
  note: 'Nota',
  notes: 'Notas',
  phone: 'Teléfono',
  email: 'Email',
  address: 'Dirección',
  contact_name: 'Contacto',
  reason: 'Motivo',
  refund_amount: 'Importe devuelto',
  status: 'Estado',
  total_amount: 'Total',
  weight_g: 'Peso (g)',
  size: 'Presentación',
  description: 'Descripción',
  badge: 'Badge',
  visible: 'Visible',
  featured: 'Destacado',
}

const HIDDEN_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'product_id', 'payment_method_id',
  'supplier_id', 'client_id', 'sale_id', 'order_id', 'category_id',
  'brand_id', 'flavor_id', 'banner_id', 'image_url', 'bag_assigned',
  'type_in_stock', 'type',
])

const CURRENCY_FIELDS = new Set([
  'unit_cost', 'total', 'shipping_cost', 'effective_price', 'sale_value',
  'total_sale', 'net_profit', 'gross_profit', 'total_cost', 'amount',
  'cost', 'refund_amount', 'total_amount', 'price_cash', 'price_transfer',
])

function fmt(key: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  if (CURRENCY_FIELDS.has(key)) {
    const n = Number(val)
    return isNaN(n) ? String(val) : `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  }
  if (key === 'date' && typeof val === 'string') {
    return new Date(val).toLocaleDateString('es-AR')
  }
  return String(val)
}

function visibleFields(data: Record<string, unknown> | null): [string, unknown][] {
  if (!data) return []
  return Object.entries(data).filter(([k]) => !HIDDEN_FIELDS.has(k) && FIELD_LABELS[k])
}

function getBusinessId(tabla: string, data: Record<string, unknown> | null): string {
  if (!data) return ''
  if (tabla === 'stock_movements') return data.movement_number ? `#${data.movement_number}` : ''
  if (tabla === 'sales') return data.sale_number ? `#${data.sale_number}` : ''
  if (tabla === 'products') return data.sku ? String(data.sku) : (data.name ? String(data.name) : '')
  if (tabla === 'clients' || tabla === 'suppliers') return data.name ? String(data.name) : ''
  if (tabla === 'capital_movements') return data.type ? String(data.type) : ''
  if (tabla === 'expenses') return data.type ? String(data.type) : ''
  return ''
}

// ── Grouping logic ───────────────────────────────────────────────────────────

type RawLog = {
  id: number
  tabla: string
  accion: string
  registroId: number | null
  datosAnteriores: Record<string, unknown> | null
  datosNuevos: Record<string, unknown> | null
  fecha: Date
}

type AuditEvent = {
  id: string
  tabla: string
  accion: 'creado' | 'eliminado' | 'modificado'
  businessId: string
  fecha: Date
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  count: number
}

function groupLogs(logs: RawLog[]): AuditEvent[] {
  // Group by tabla + same-second timestamp
  const groups = new Map<string, RawLog[]>()
  for (const log of logs) {
    const sec = Math.floor(new Date(log.fecha).getTime() / 1000)
    const key = `${log.tabla}__${sec}`
    groups.set(key, [...(groups.get(key) ?? []), log])
  }

  const events: AuditEvent[] = []

  for (const [key, rows] of groups.entries()) {
    const tabla = rows[0].tabla
    const fecha = rows[0].fecha
    const deletes = rows.filter(r => r.accion === 'DELETE')
    const inserts = rows.filter(r => r.accion === 'INSERT')

    if (deletes.length > 0 && inserts.length > 0) {
      // Modification: DELETE + INSERT in same transaction
      const firstDelete = deletes[0]
      const firstInsert = inserts[0]
      events.push({
        id: key,
        tabla,
        accion: 'modificado',
        businessId: getBusinessId(tabla, firstInsert.datosNuevos ?? firstDelete.datosAnteriores),
        fecha,
        antes: firstDelete.datosAnteriores,
        despues: firstInsert.datosNuevos,
        count: Math.max(deletes.length, inserts.length),
      })
    } else if (inserts.length > 0 && deletes.length === 0) {
      const first = inserts[0]
      events.push({
        id: key,
        tabla,
        accion: 'creado',
        businessId: getBusinessId(tabla, first.datosNuevos),
        fecha,
        antes: null,
        despues: first.datosNuevos,
        count: inserts.length,
      })
    } else if (deletes.length > 0 && inserts.length === 0) {
      const first = deletes[0]
      events.push({
        id: key,
        tabla,
        accion: 'eliminado',
        businessId: getBusinessId(tabla, first.datosAnteriores),
        fecha,
        antes: first.datosAnteriores,
        despues: null,
        count: deletes.length,
      })
    }
  }

  return events.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

function getDiff(antes: Record<string, unknown> | null, despues: Record<string, unknown> | null) {
  if (!antes || !despues) return []
  const keys = new Set([...Object.keys(antes), ...Object.keys(despues)])
  const diff: { field: string; label: string; before: unknown; after: unknown }[] = []
  for (const k of keys) {
    if (HIDDEN_FIELDS.has(k) || !FIELD_LABELS[k]) continue
    const a = antes[k], b = despues[k]
    if (String(a ?? '') !== String(b ?? '')) {
      diff.push({ field: k, label: FIELD_LABELS[k], before: a, after: b })
    }
  }
  return diff
}

// ── Component ────────────────────────────────────────────────────────────────

const ACCION_STYLE = {
  creado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  eliminado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  modificado: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

const TABLA_FILTER_OPTIONS = [
  { value: '', label: 'Todas las tablas' },
  { value: 'stock_movements', label: 'Entradas de stock' },
  { value: 'sales', label: 'Ventas' },
  { value: 'products', label: 'Productos' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'capital_movements', label: 'Caja' },
  { value: 'clients', label: 'Clientes' },
  { value: 'suppliers', label: 'Proveedores' },
]

export default function AuditPage() {
  const [logs, setLogs] = useState<RawLog[]>([])
  const [search, setSearch] = useState('')
  const [tablaFilter, setTablaFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAuditLogs().then(data => setLogs(data as RawLog[]))
  }, [])

  const events = useMemo(() => groupLogs(logs), [logs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return events.filter(e => {
      if (tablaFilter && e.tabla !== tablaFilter) return false
      if (q && !e.businessId.toLowerCase().includes(q) && !(TABLE_LABELS[e.tabla] ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [events, search, tablaFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} eventos registrados</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={tablaFilter}
          onChange={e => setTablaFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
        >
          {TABLA_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">Sin eventos</p>
        )}
        {filtered.map(event => {
          const isOpen = expandedId === event.id
          const diff = event.accion === 'modificado' ? getDiff(event.antes, event.despues) : []

          return (
            <div
              key={event.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Header row */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isOpen ? null : event.id)}
              >
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${ACCION_STYLE[event.accion]}`}>
                  {event.accion.charAt(0).toUpperCase() + event.accion.slice(1)}
                </span>
                <span className="text-sm font-medium">{TABLE_LABELS[event.tabla] ?? event.tabla}</span>
                {event.businessId && (
                  <span className="text-sm text-muted-foreground">{event.businessId}</span>
                )}
                {event.count > 1 && (
                  <span className="text-xs text-muted-foreground">({event.count} ítems)</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {new Date(event.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-border px-4 py-3">
                  {event.accion === 'modificado' && diff.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cambios</p>
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <span>Campo</span><span>Antes</span><span>Después</span>
                      </div>
                      {diff.map(d => (
                        <div key={d.field} className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-sm py-1 border-t border-border/50">
                          <span className="font-medium">{d.label}</span>
                          <span className="text-red-600 dark:text-red-400">{fmt(d.field, d.before)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{fmt(d.field, d.after)}</span>
                        </div>
                      ))}
                      {diff.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin cambios detectados en campos visibles</p>
                      )}
                    </div>
                  )}

                  {event.accion === 'creado' && event.despues && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Valores</p>
                      {visibleFields(event.despues).map(([k, v]) => (
                        <div key={k} className="flex gap-3 text-sm py-0.5">
                          <span className="text-muted-foreground w-36 shrink-0">{FIELD_LABELS[k] ?? k}</span>
                          <span>{fmt(k, v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {event.accion === 'eliminado' && event.antes && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Datos eliminados</p>
                      {visibleFields(event.antes).map(([k, v]) => (
                        <div key={k} className="flex gap-3 text-sm py-0.5">
                          <span className="text-muted-foreground w-36 shrink-0">{FIELD_LABELS[k] ?? k}</span>
                          <span className="text-red-600 dark:text-red-400">{fmt(k, v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {event.accion === 'modificado' && diff.length === 0 && (
                    <p className="text-xs text-muted-foreground">Reorganización de ítems sin cambios en valores visibles</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
