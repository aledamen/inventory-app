import { getProducts, getLookups } from '@/actions/products'
import { ProductsTable } from '@/components/products/products-table'
import { ProductFormDialog } from '@/components/products/product-form-dialog'

export default async function ProductsPage() {
  const [products, lookups] = await Promise.all([getProducts(), getLookups()])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} productos registrados</p>
        </div>
        <ProductFormDialog lookups={lookups} />
      </div>
      <ProductsTable products={products} lookups={lookups} />
    </div>
  )
}
