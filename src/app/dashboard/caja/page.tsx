import { getCapitalMovements, getCajaBalance } from '@/actions/capital'
import { getAllLookups } from '@/actions/lookups'
import { CapitalFormDialog } from '@/components/caja/capital-form-dialog'
import { CapitalTable } from '@/components/caja/capital-table'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Wallet, Banknote, Landmark, TrendingUp, TrendingDown, ShoppingCart, ArrowDownToLine, Package, Info } from 'lucide-react'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export default async function CajaPage() {
  const [movements, balance, lookups] = await Promise.all([
    getCapitalMovements(),
    getCajaBalance(),
    getAllLookups(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aportes + Ventas − Stock comprado − Gastos
          </p>
        </div>
        <CapitalFormDialog paymentMethods={lookups.paymentMethods} />
      </div>

      {/* Activos del negocio */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Activos del negocio</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <KpiCard
            title="Efectivo líquido"
            value={$(balance.efectivoLiquido)}
            sub="plata disponible para gastar"
            variant={balance.efectivoLiquido >= 0 ? 'success' : 'danger'}
            icon={<Wallet className="w-4 h-4" />}
          />
          <KpiCard
            title="Efectivo en mano"
            value={$(balance.efectivo)}
            sub="billetes físicos, caja chica"
            variant={balance.efectivo >= 0 ? 'success' : 'danger'}
            icon={<Banknote className="w-4 h-4" />}
          />
          <KpiCard
            title="Cuenta bancaria"
            value={$(balance.cuentaBancaria)}
            sub="transferencias + Mercado Pago"
            variant={balance.cuentaBancaria >= 0 ? 'success' : 'danger'}
            icon={<Landmark className="w-4 h-4" />}
          />
          <KpiCard
            title="Stock en mano"
            value={$(balance.stockActualCosto)}
            sub="capital inmovilizado en productos"
            variant="blue"
            icon={<Package className="w-4 h-4" />}
            href="/dashboard/products"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Los gastos aún no distinguen método de pago — se descuentan del efectivo en mano.
        </p>
      </div>

      {/* Capital total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Capital total"
          value={$(balance.capitalTotal)}
          sub="efectivo + stock al costo"
          variant="success"
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Aporte calculado */}
      {balance.aportes === 0 && balance.aporteSugerido > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-4 flex gap-3">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Tu aporte calculado es <strong>{$(balance.aporteSugerido)}</strong>
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              Compraste <strong>{$(balance.stockComprado)}</strong> en stock y cobraste <strong>{$(balance.ventas)}</strong> en ventas.
              La diferencia ({$(balance.stockComprado)} − {$(balance.ventas)}) es lo que pusiste de tu bolsillo.
              Si todo se reinvirtió y no tenés plata ociosa, este número es exacto.
            </p>
            <p className="text-amber-700/80 dark:text-amber-500 text-xs">
              Si tenés plata en mano ahora, sumá ese monto. Ejemplo: $30.000 en efectivo → tu aporte real fue{' '}
              <strong>{$(balance.aporteSugerido)} + lo que tengas en mano</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Flujos */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Flujo de fondos</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Aportes propios"
            value={$(balance.aportes)}
            sub="capital ingresado"
            variant="blue"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            title="Total ventas"
            value={$(balance.ventas)}
            sub="ingresos cobrados"
            variant="success"
            icon={<ShoppingCart className="w-4 h-4" />}
            href="/dashboard/sales"
          />
          <KpiCard
            title="Stock comprado"
            value={$(balance.stockComprado)}
            sub="total invertido en mercadería"
            icon={<ArrowDownToLine className="w-4 h-4" />}
            href="/dashboard/stock"
          />
          <KpiCard
            title="Gastos"
            value={$(balance.gastosTotal)}
            sub="gastos operativos"
            variant={balance.gastosTotal > 0 ? 'warning' : 'default'}
            icon={<TrendingDown className="w-4 h-4" />}
            href="/dashboard/expenses"
          />
        </div>
      </div>

      {/* Detalle fórmula */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm font-mono text-muted-foreground space-y-1">
        <p className="text-xs font-sans font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detalle del cálculo</p>
        <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
          <span className="text-foreground font-semibold">{$(balance.aportes)}</span>
          <span>aportes</span>
          <span>+</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{$(balance.ventas)}</span>
          <span>ventas</span>
          <span>−</span>
          <span className="text-foreground font-semibold">{$(balance.stockComprado)}</span>
          <span>stock</span>
          <span>−</span>
          <span className="text-foreground font-semibold">{$(balance.gastosTotal)}</span>
          <span>gastos</span>
          {balance.retiros > 0 && (
            <>
              <span>−</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{$(balance.retiros)}</span>
              <span>retiros</span>
            </>
          )}
          <span>=</span>
          <span className={`font-bold ${balance.efectivoLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {$(balance.efectivoLiquido)} efectivo líquido
          </span>
          <span>+</span>
          <span className="text-primary font-semibold">{$(balance.stockActualCosto)}</span>
          <span>stock</span>
          <span>=</span>
          <span className="text-foreground font-bold">{$(balance.capitalTotal)} capital total</span>
        </div>
      </div>

      {/* Movimientos manuales */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Aportes y retiros
        </p>
        <CapitalTable movements={movements} />
      </div>
    </div>
  )
}
