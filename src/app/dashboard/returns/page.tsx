import { getReturns } from '@/actions/returns'
import { getProducts } from '@/actions/products'
import { getClients } from '@/actions/clients'
import { ReturnsTable } from '@/components/returns/returns-table'
import { ReturnFormDialog } from '@/components/returns/return-form-dialog'

export default async function ReturnsPage() {
  const [returnsData, productsData, clientsData] = await Promise.all([
    getReturns(),
    getProducts(),
    getClients(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Devoluciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Anulación de ventas y restauración de stock</p>
        </div>
        <ReturnFormDialog products={productsData} clients={clientsData} />
      </div>
      <ReturnsTable returns={returnsData} />
    </div>
  )
}
