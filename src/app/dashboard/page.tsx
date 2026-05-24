import { getDashboardStats } from '@/actions/dashboard'
import { KpiCard } from '@/components/dashboard/kpi-card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Package, ShoppingCart, AlertTriangle, Wallet } from 'lucide-react'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export default async function DashboardPage() {
  const stats = await getDashboardStats()

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
          />
          <KpiCard
            title="Valor al precio"
            value={$(stats.stockValueAtPrice)}
            sub="facturación potencial"
            variant="blue"
            icon={<Package className="w-4 h-4" />}
          />
          <KpiCard
            title="Ganancia potencial"
            value={$(stats.potentialProfit)}
            sub="si se vende todo"
            variant="success"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            title="Alertas de stock"
            value={`${stats.outOfStockCount} sin · ${stats.lowStockCount} bajo`}
            sub="productos con problemas"
            variant={stats.outOfStockCount > 0 ? 'danger' : stats.lowStockCount > 0 ? 'warning' : 'default'}
            icon={<AlertTriangle className="w-4 h-4" />}
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
          />
          <KpiCard
            title="Facturación"
            value={$(stats.monthlyRevenue)}
            variant="blue"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <KpiCard
            title="Ganancia neta"
            value={$(stats.monthlyNetProfit)}
            variant="success"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            title="Gastos totales"
            value={$(stats.totalExpenses)}
            variant={stats.totalExpenses > 0 ? 'warning' : 'default'}
            icon={<Wallet className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Últimas ventas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Últimas ventas</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
