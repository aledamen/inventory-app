import { getRecontactData } from '@/actions/recontacto'
import { RecontactoTabs } from '@/components/recontacto/recontacto-tabs'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { AlertCircle, CalendarClock, RefreshCw, Users, Repeat, DollarSign } from 'lucide-react'

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export default async function RecontactoPage() {
  const { rows, kpis } = await getRecontactData()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recontacto de clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A quién contactar de nuevo según su última compra
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Escribirle ya"
          value={String(kpis.escribirleYa)}
          variant={kpis.escribirleYa > 0 ? 'danger' : 'default'}
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <KpiCard
          title="Esta semana"
          value={String(kpis.estaSemana)}
          variant="warning"
          icon={<CalendarClock className="w-4 h-4" />}
        />
        <KpiCard
          title="Seguirlo"
          value={String(kpis.seguirlo)}
          variant="danger"
          icon={<RefreshCw className="w-4 h-4" />}
        />
        <KpiCard
          title="Clientes activos"
          value={String(kpis.clientesActivos)}
          variant="blue"
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          title="Recompras"
          value={String(kpis.recompras)}
          variant="success"
          icon={<Repeat className="w-4 h-4" />}
        />
        <KpiCard
          title="Revenue representado"
          value={$(kpis.revenueTotal)}
          variant="success"
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      <RecontactoTabs rows={rows} />
    </div>
  )
}
