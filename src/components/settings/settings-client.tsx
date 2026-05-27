'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  upsertConfig,
  addCategory, deleteCategory,
  addBrand, deleteBrand,
  addFlavor, deleteFlavor,
  addPaymentMethod, deletePaymentMethod,
  recalculateStock,
} from '@/actions/settings'
import { Plus, Trash2, RefreshCw, Save } from 'lucide-react'

type Config = { id: number; key: string; value: string }[]
type Lookups = {
  categories: { id: number; name: string }[]
  brands: { id: number; name: string }[]
  flavors: { id: number; name: string }[]
  paymentMethods: { id: number; name: string }[]
}

// ── Label maps ─────────────────────────────────────────────────────────────

const CONFIG_LABELS: Record<string, { label: string; description: string }> = {
  costo_abastancemiento_por_gramo: {
    label: 'Costo abastecimiento por gramo',
    description: 'Costo de envío del proveedor por gramo de producto. Se multiplica por el peso del producto para calcular el costo de abastecimiento.',
  },
  costo_envio: {
    label: 'Costo de envío al cliente',
    description: 'Costo fijo de envío que se agrega al precio final (ARS). Por ahora no se usa en el cálculo automático.',
  },
  comision_mp: {
    label: 'Comisión MercadoPago',
    description: 'Porcentaje que cobra MercadoPago por transacción (ej: 0.2 = 20%). Por ahora referencial.',
  },
  margen_estandar_amigo: {
    label: 'Margen estándar amigo',
    description: 'Margen de ganancia para ventas a conocidos. Por ahora referencial.',
  },
  margen_estandar_efectivo: {
    label: 'Margen estándar efectivo',
    description: 'Margen global para precios en efectivo (ej: 0.25 = 25%). Al guardar se recalculan todos los precios.',
  },
  margen_estandar_transferencia: {
    label: 'Margen estándar transferencia',
    description: 'Margen global para precios de transferencia. Al guardar se recalculan todos los precios.',
  },
  margen_estandar_lista: {
    label: 'Margen estándar lista',
    description: 'Margen global para precios de lista/catálogo. Al guardar se recalculan todos los precios.',
  },
  margen_premium_efectivo: {
    label: 'Margen premium efectivo',
    description: 'Margen para productos de tipo premium (efectivo). Por ahora referencial.',
  },
  margen_premium_lista: {
    label: 'Margen premium lista',
    description: 'Margen para productos de tipo premium (lista). Por ahora referencial.',
  },
  precio_bolsa_chica_unidad: {
    label: 'Bolsa chica 25x35 (precio unitario)',
    description: 'Costo de la bolsa chica usada en packaging. Al guardar se recalculan todos los precios.',
  },
  prcio_bolsa_mediana_unidad: {
    label: 'Bolsa mediana 30x40 (precio unitario)',
    description: 'Costo de la bolsa mediana usada en packaging. Al guardar se recalculan todos los precios.',
  },
  precio_bolsa_grande_unidad: {
    label: 'Bolsa grande 40x50 (precio unitario)',
    description: 'Costo de la bolsa grande usada en packaging. Al guardar se recalculan todos los precios.',
  },
  precio_sticker_unidad: {
    label: 'Sticker por unidad',
    description: 'Costo del sticker de marca. Se suma al costo de bolsa para calcular el packaging total. Al guardar se recalculan todos los precios.',
  },
}

// ── Config Section ──────────────────────────────────────────────────────────

function ConfigSection({ config }: { config: Config }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(config.map(c => [c.key, c.value]))
  )
  const [pending, startTransition] = useTransition()

  function handleSave(key: string) {
    startTransition(async () => {
      try {
        await upsertConfig(key, values[key])
        toast.success('Variable actualizada')
        router.refresh()
      } catch {
        toast.error('Error al guardar')
      }
    })
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Variables globales</h2>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {config.map(c => {
          const meta = CONFIG_LABELS[c.key]
          return (
            <div key={c.key} className="px-5 py-4 flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{meta?.label ?? c.key}</p>
                {meta?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  step="0.01"
                  value={values[c.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [c.key]: e.target.value }))}
                  className="w-32 h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={pending || values[c.key] === c.value}
                  onClick={() => handleSave(c.key)}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Guardar
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Lookup Section ─────────────────────────────────────────────────────────

type LookupItem = { id: number; name: string }
type LookupSectionProps = {
  title: string
  items: LookupItem[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function LookupSection({ title, items, onAdd, onDelete }: LookupSectionProps) {
  const router = useRouter()
  const [newValue, setNewValue] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newValue.trim()) return
    startTransition(async () => {
      try {
        await onAdd(newValue.trim())
        toast.success(`"${newValue.trim()}" agregado`)
        setNewValue('')
        router.refresh()
      } catch {
        toast.error('Error al agregar')
      }
    })
  }

  function handleDelete(id: number, name: string) {
    startTransition(async () => {
      try {
        await onDelete(id)
        toast.success(`"${name}" eliminado`)
        router.refresh()
      } catch {
        toast.error('No se puede eliminar — puede estar en uso')
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground">Sin elementos</span>
        )}
        {items.map(item => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
          >
            {item.name}
            <button
              onClick={() => handleDelete(item.id, item.name)}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder={`Nuevo ${title.toLowerCase()}...`}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0" disabled={pending || !newValue.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Agregar
        </Button>
      </form>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function SettingsClient({ config, lookups }: { config: Config; lookups: Lookups }) {
  const router = useRouter()
  const [recalcPending, startRecalc] = useTransition()

  function handleRecalculate() {
    startRecalc(async () => {
      try {
        await recalculateStock()
        toast.success('Stock recalculado correctamente')
        router.refresh()
      } catch {
        toast.error('Error al recalcular')
      }
    })
  }

  return (
    <div className="space-y-8">
      <ConfigSection config={config} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Tablas de referencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LookupSection
            title="Categorías"
            items={lookups.categories}
            onAdd={addCategory}
            onDelete={deleteCategory}
          />
          <LookupSection
            title="Marcas"
            items={lookups.brands}
            onAdd={addBrand}
            onDelete={deleteBrand}
          />
          <LookupSection
            title="Sabores"
            items={lookups.flavors}
            onAdd={addFlavor}
            onDelete={deleteFlavor}
          />
          <LookupSection
            title="Métodos de pago"
            items={lookups.paymentMethods}
            onAdd={addPaymentMethod}
            onDelete={deletePaymentMethod}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Mantenimiento</h2>
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Recalcular stock</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recalcula el stock de todos los productos desde cero usando entradas y ventas registradas.
              Equivalente al botón &quot;Recalcular stock&quot; de la planilla.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalcPending}
            className="shrink-0 ml-4"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${recalcPending ? 'animate-spin' : ''}`} />
            {recalcPending ? 'Calculando...' : 'Recalcular'}
          </Button>
        </div>
      </section>
    </div>
  )
}
