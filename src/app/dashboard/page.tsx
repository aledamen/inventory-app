import { getDashboardStats } from '@/actions/dashboard'
import { getCajaBalance } from '@/actions/capital'
import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Package, ShoppingCart, AlertTriangle, Wallet } from 'lucide-react'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export default async function DashboardPage() {
  const [stats, caja] = await Promise.all([getDashboardStats(), getCajaBalance()])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen general del negocio.</p>
      </div>

      {/* Stock */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Stock actual</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Valor al costo"
            value={$(stats.stockValueAtCost)}
            sub="inversión inmovilizada"
            icon={<DollarSign className="w-4 h-4" />}
            href="/dashboard/products"
          />
          <KpiCard
            title="Valor al precio"
            value={$(stats.stockValueAtPrice)}
            sub="facturación potencial"
            variant="blue"
            icon={<Package className="w-4 h-4" />}
            href="/dashboard/products"
          />
          <KpiCard
            title="Ganancia potencial"
            value={$(stats.potentialProfit)}
            sub="si se vende todo"
            variant="success"
            icon={<TrendingUp className="w-4 h-4" />}
            href="/dashboard/analytics"
          />
          <KpiCard
            title="Alertas de stock"
            value={`${stats.outOfStockCount} sin · ${stats.lowStockCount} bajo`}
            sub="productos con problemas"
            variant={stats.outOfStockCount > 0 ? 'danger' : stats.lowStockCount > 0 ? 'warning' : 'default'}
            icon={<AlertTriangle className="w-4 h-4" />}
            href="/dashboard/products"
          />
        </div>
      </div>

      {/* Caja */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Caja</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Saldo en caja"
            value={$(caja.balance)}
            sub="balance actual"
            variant={caja.balance >= 0 ? 'success' : 'danger'}
            icon={<Wallet className="w-4 h-4" />}
            href="/dashboard/caja"
          />
          <KpiCard
            title="Aportes propios"
            value={$(caja.aportes)}
            sub="capital ingresado"
            variant="blue"
            icon={<DollarSign className="w-4 h-4" />}
            href="/dashboard/caja"
          />
          <KpiCard
            title="Total ventas"
            value={$(caja.ventas)}
            sub="ingresos acumulados"
            variant="success"
            icon={<ShoppingCart className="w-4 h-4" />}
            href="/dashboard/sales"
          />
          <KpiCard
            title="Stock comprado"
            value={$(caja.stockComprado)}
            sub="inversión en mercadería"
            icon={<Package className="w-4 h-4" />}
            href="/dashboard/stock"
          />
        </div>
      </div>

      {/* Este mes */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Este mes</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Ventas"
            value={String(stats.monthlySalesCount)}
            sub="transacciones"
            icon={<ShoppingCart className="w-4 h-4" />}
            href="/dashboard/sales"
          />
          <KpiCard
            title="Facturación"
            value={$(stats.monthlyRevenue)}
            variant="blue"
            icon={<DollarSign className="w-4 h-4" />}
            href="/dashboard/sales"
          />
          <KpiCard
            title="Ganancia neta"
            value={$(stats.monthlyNetProfit)}
            variant={stats.monthlyNetProfit >= 0 ? 'success' : 'danger'}
            icon={<TrendingUp className="w-4 h-4" />}
            href="/dashboard/analytics"
          />
          <KpiCard
            title="Gastos del mes"
            value={$(stats.monthlyExpenses)}
            variant={stats.monthlyExpenses > 0 ? 'warning' : 'default'}
            icon={<Wallet className="w-4 h-4" />}
            href="/dashboard/expenses"
          />
        </div>
      </div>

      {/* Últimas ventas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Últimas ventas</p>
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Sin ventas registradas
                  </TableCell>
                </TableRow>
              )}
              {stats.recentSales.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground text-xs font-mono">#{s.saleNumber}</TableCell>
                  <TableCell className="text-sm">{new Date(s.date).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>
                    <span className="font-medium">{s.productName ?? '—'}</span>
                    {s.productFlavor && (
                      <span className="text-muted-foreground text-xs ml-1.5">· {s.productFlavor}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{s.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    {s.totalSale ? $(Number(s.totalSale)) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.netProfit && (
                      <span className="text-xs font-semibold text-emerald-600">
                        {$(Number(s.netProfit))}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
