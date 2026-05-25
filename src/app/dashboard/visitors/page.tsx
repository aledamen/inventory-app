import { getVisitorStats, getBlockedIps } from '@/actions/visitors'
import { VisitorsClient } from '@/components/visitors/visitors-client'
import { headers } from 'next/headers'

export default async function VisitorsPage() {
  const [stats, blockedIpsList, hdrs] = await Promise.all([
    getVisitorStats(),
    getBlockedIps(),
    headers(),
  ])

  const currentIp = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? hdrs.get('x-real-ip')
    ?? 'desconocida'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visitantes</h1>
        <p className="text-sm text-muted-foreground mt-1">Visitas al catálogo público.</p>
      </div>
      <VisitorsClient stats={stats} blockedIps={blockedIpsList} currentIp={currentIp} />
    </div>
  )
}
