import { getClients } from '@/actions/clients'
import { ClientsTable } from '@/components/clients/clients-table'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'

export default async function ClientsPage() {
  const clientsData = await getClients()

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">CRM — historial de compras por cliente</p>
        </div>
        <ClientFormDialog mode="create" />
      </div>
      <ClientsTable clients={clientsData} />
    </div>
  )
}
