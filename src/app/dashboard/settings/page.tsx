import { getConfig, getLookupsForSettings } from '@/actions/settings'
import { SettingsClient } from '@/components/settings/settings-client'

export default async function SettingsPage() {
  const [configData, lookups] = await Promise.all([
    getConfig(),
    getLookupsForSettings(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Variables globales y tablas de referencia.</p>
      </div>
      <SettingsClient config={configData} lookups={lookups} />
    </div>
  )
}
