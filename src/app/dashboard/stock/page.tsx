import { getStockMovements } from '@/actions/stock'
import { getProducts } from '@/actions/products'
import { getAllLookups } from '@/actions/lookups'
import { getSuppliers } from '@/actions/suppliers'
import { StockTable } from '@/components/stock/stock-table'
import { StockFormDialog } from '@/components/stock/stock-form-dialog'

export default async function StockPage() {
  const [movements, products, lookups, suppliers] = await Promise.all([
    getStockMovements(),
    getProducts(),
    getAllLookups(),
    getSuppliers(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Entradas de stock</h1>
          <p className="text-sm text-muted-foreground mt-1">{movements.length} movimientos registrados</p>
        </div>
        <StockFormDialog products={products} lookups={lookups} suppliers={suppliers} />
      </div>
      <StockTable movements={movements} products={products} lookups={lookups} suppliers={suppliers} />
    </div>
  )
}
