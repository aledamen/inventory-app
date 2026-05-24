import { getAdjustments } from '@/actions/adjustments'
import { getProducts } from '@/actions/products'
import { AdjustmentsTable } from '@/components/adjustments/adjustments-table'
import { AdjustmentFormDialog } from '@/components/adjustments/adjustment-form-dialog'

export default async function AdjustmentsPage() {
  const [adjustmentsData, productsData] = await Promise.all([
    getAdjustments(),
    getProducts(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ajustes de inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Correcciones manuales de stock — pérdidas, muestras, regalos</p>
        </div>
        <AdjustmentFormDialog products={productsData} />
      </div>
      <AdjustmentsTable adjustments={adjustmentsData} />
    </div>
  )
}
