import { getCombosFull } from '@/actions/combos'
import { getProducts } from '@/actions/products'
import { getBanners } from '@/actions/cms'
import { CombosClient } from '@/components/combos/combos-client'

export default async function CombosPage() {
  const [combosFull, products, banners] = await Promise.all([getCombosFull(), getProducts(), getBanners()])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Combos</h1>
        <p className="text-sm text-muted-foreground mt-1">Agrupaciones de productos con precio especial.</p>
      </div>
      <CombosClient combos={combosFull} products={products} banners={banners} />
    </div>
  )
}
