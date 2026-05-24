import { getPricingWithProducts } from '@/actions/pricing'
import { PricingTable } from '@/components/pricing/pricing-table'

export default async function PricingPage() {
  const rows = await getPricingWithProducts()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Precios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Editá los márgenes para recalcular los precios automáticamente.
        </p>
      </div>
      <PricingTable rows={rows} />
    </div>
  )
}
