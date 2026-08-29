import { NextResponse } from 'next/server'
import { db } from '@/db'
import { products, pricing, categories, brands, flavors, sales, promotions, banners } from '@/db/schema'
import { eq, and, or, isNull, gte } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { buildComboEntries } from '@/actions/catalog-combos'

export const revalidate = 0

export async function GET() {
  const [rows, salesRows, promoRows] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        brand: brands.name,
        category: categories.name,
        flavor: flavors.name,
        stock: products.stock,
        visible: products.visible,
        imageUrl: products.imageUrl,
        weightG: products.weightG,
        size: products.size,
        description: products.description,
        badge: products.badge,
        featured: products.featured,
        priceCashRounded: pricing.priceCashRounded,
        priceTransferRounded: pricing.priceTransferRounded,
        priceListRounded: pricing.priceListRounded,
        bannerName: banners.name,
        bannerColor: banners.color,
        bannerTextColor: banners.textColor,
        bannerPosition: banners.position,
      })
      .from(products)
      .leftJoin(pricing, eq(products.id, pricing.productId))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(flavors, eq(products.flavorId, flavors.id))
      .leftJoin(banners, eq(products.bannerId, banners.id))
      .where(eq(products.visible, true)),

    db
      .select({
        productId: sales.productId,
        totalSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
      })
      .from(sales)
      .groupBy(sales.productId),

    db
      .select({
        productId: promotions.productId,
        promoPrice: promotions.promoPrice,
        label: promotions.label,
      })
      .from(promotions)
      .where(
        and(
          eq(promotions.active, true),
          or(isNull(promotions.validTo), gte(promotions.validTo, sql`CURRENT_DATE`))
        )
      ),
  ])

  // Build productId → totalSold map
  const soldByProduct = new Map<number, number>()
  for (const s of salesRows) soldByProduct.set(s.productId, Number(s.totalSold))

  // Build productId → promo map (active promotions, not expired)
  const promoByProduct = new Map<number, { promoPrice: string | null; promoLabel: string | null }>()
  for (const promo of promoRows) {
    promoByProduct.set(promo.productId, { promoPrice: promo.promoPrice, promoLabel: promo.label })
  }

  // Group by name+brand+weight
  const grouped: Record<string, {
    id: string
    name: string
    brand: string | null
    category: string | null
    image: string | null
    visible: boolean
    salesCount: number
    description: string | null
    badge: string | null
    featured: boolean
    bannerName: string | null
    bannerColor: string | null
    bannerTextColor: string | null
    bannerPosition: string | null
    variants: {
      sku: string
      flavor: string | null
      stock: number
      weightG: number | null
      priceEffective: number | null
      priceTransfer: number | null
      priceList: number | null
      image: string | null
      promoPrice: number | null
      promoLabel: string | null
    }[]
  }> = {}

  for (const row of rows) {
    const key = `${row.name}__${row.brand ?? ''}__${row.weightG ?? ''}`
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        name: row.size ? `${row.name} ${row.size}` : (row.weightG ? `${row.name} ${row.weightG}g` : row.name),
        brand: row.brand,
        category: row.category,
        image: row.imageUrl,
        visible: row.visible ?? false,
        salesCount: 0,
        description: row.description ?? null,
        badge: row.badge ?? null,
        featured: row.featured ?? false,
        bannerName: row.bannerName ?? null,
        bannerColor: row.bannerColor ?? null,
        bannerTextColor: row.bannerTextColor ?? null,
        bannerPosition: row.bannerPosition ?? null,
        variants: [],
      }
    }
    const promo = promoByProduct.get(row.id)
    grouped[key].salesCount += soldByProduct.get(row.id) ?? 0
    grouped[key].featured = grouped[key].featured || (row.featured ?? false)
    grouped[key].variants.push({
      sku: row.sku,
      flavor: row.flavor,
      stock: row.stock,
      weightG: row.weightG,
      priceEffective: row.priceCashRounded,
      priceTransfer: row.priceTransferRounded,
      priceList: row.priceListRounded,
      image: row.imageUrl,
      promoPrice: promo ? Number(promo.promoPrice) : null,
      promoLabel: promo?.promoLabel ?? null,
    })
  }

  // Build combo entries with per-flavor variants for group slots
  const comboEntries = await buildComboEntries()
  Object.assign(grouped, comboEntries)

  // Sort: stock first, then banner, then featured, then salesCount desc
  const data = Object.values(grouped).sort((a, b) => {
    const aHasStock = a.variants.some(v => v.stock > 0)
    const bHasStock = b.variants.some(v => v.stock > 0)
    if (aHasStock && !bHasStock) return -1
    if (!aHasStock && bHasStock) return 1
    const aBanner = a.bannerName != null
    const bBanner = b.bannerName != null
    if (aBanner && !bBanner) return -1
    if (!aBanner && bBanner) return 1
    return b.salesCount - a.salesCount
  })

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
