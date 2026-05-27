import { getCapitalMovements, getCajaBalance } from '@/actions/capital'
import { CapitalFormDialog } from '@/components/caja/capital-form-dialog'
import { CapitalTable } from '@/components/caja/capital-table'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Wallet, TrendingUp, TrendingDown, ShoppingCart, ArrowDownToLine } from 'lucide-react'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export default async function CajaPage() {
  const [movements, balance] = await Promise.all([
    getCapitalMovements(),
    getCajaBalance(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aportes + Ventas − Stock comprado − Gastos
          </p>
        </div>
        <CapitalFormDialog />
      </div>

      {/* Balance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-2 lg:col-span-1">
          <KpiCard
            title="Saldo en caja"
            value={$(balance.balance)}
            sub="balance actual"
            variant={balance.balance >= 0 ? 'success' : 'danger'}
            icon={<Wallet className="w-4 h-4" />}
          />
        </div>
        <KpiCard
          title="Aportes propios"
          value={$(balance.aportes)}
          sub="capital ingresado"
          variant="blue"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          title="Retiros"
          value={$(balance.retiros)}
          sub="capital retirado"
          variant={balance.retiros > 0 ? 'warning' : 'default'}
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Flujos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total ventas"
          value={$(balance.ventas)}
          sub="ingresos acumulados"
          variant="success"
          icon={<ShoppingCart className="w-4 h-4" />}
          href="/dashboard/sales"
        />
        <KpiCard
          title="Stock comprado"
          value={$(balance.stockComprado)}
          sub="egresos en mercadería"
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

      {/* Detalle fórmula */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm font-mono text-muted-foreground">
        <span className="text-foreground font-semibold">{$(balance.aportes)}</span> aportes
        {' + '}
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{$(balance.ventas)}</span> ventas
        {' − '}
        <span className="text-foreground font-semibold">{$(balance.stockComprado)}</span> stock
        {' − '}
        <span className="text-foreground font-semibold">{$(balance.gastosTotal)}</span> gastos
        {' − '}
        <span className="text-amber-600 dark:text-amber-400 font-semibold">{$(balance.retiros)}</span> retiros
        {' = '}
        <span className={`font-bold ${balance.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {$(balance.balance)}
        </span>
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
