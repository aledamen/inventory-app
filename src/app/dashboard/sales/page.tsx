import { getSales } from '@/actions/sales'
import { getProducts } from '@/actions/products'
import { getAllLookups } from '@/actions/lookups'
import { getCombosFull } from '@/actions/combos'
import { getClients } from '@/actions/clients'
import { SalesTable } from '@/components/sales/sales-table'
import { SaleFormDialog } from '@/components/sales/sale-form-dialog'

export default async function SalesPage() {
  const [salesData, products, lookups, combos, clients] = await Promise.all([
    getSales(),
    getProducts(),
    getAllLookups(),
    getCombosFull(),
    getClients(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">{salesData.length} ventas registradas</p>
        </div>
        <SaleFormDialog products={products} lookups={lookups} combos={combos} clients={clients} />
      </div>
      <SalesTable sales={salesData} products={products} lookups={lookups} />
    </div>
  )
}
