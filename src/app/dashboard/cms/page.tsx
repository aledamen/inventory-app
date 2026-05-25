import { getPromotions, getBanners } from '@/actions/cms'
import { getLookups, getProducts } from '@/actions/products'
import { getSiteConfig } from '@/actions/site-config'
import { CmsClient } from '@/components/cms/cms-client'

export default async function CmsPage() {
  const [promotions, lookups, products, banners, config] = await Promise.all([
    getPromotions(),
    getLookups(),
    getProducts(),
    getBanners(),
    getSiteConfig(),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CMS Catálogo</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de contenido del catálogo público.</p>
      </div>
      <CmsClient promotions={promotions} lookups={lookups} products={products} banners={banners} config={config} />
    </div>
  )
}
