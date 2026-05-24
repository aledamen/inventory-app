import { NextResponse } from 'next/server'
import { db } from '@/db'
import { products, pricing, categories, brands, flavors } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const revalidate = 60

export async function GET() {
  const rows = await db
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
      priceCashRounded: pricing.priceCashRounded,
      priceTransferRounded: pricing.priceTransferRounded,
      priceListRounded: pricing.priceListRounded,
    })
    .from(products)
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .where(eq(products.visible, true))

  // Group by name+brand to create product groups with variants
  const grouped: Record<string, {
    id: string
    name: string
    brand: string | null
    category: string | null
    image: string | null
    visible: boolean
    variants: {
      sku: string
      flavor: string | null
      stock: number
      weightG: number | null
      priceEffective: number | null
      priceTransfer: number | null
      priceList: number | null
      image: string | null
    }[]
  }> = {}

  for (const row of rows) {
    const key = `${row.name}__${row.brand ?? ''}`
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        name: row.name,
        brand: row.brand,
        category: row.category,
        image: row.imageUrl,
        visible: row.visible ?? false,
        variants: [],
      }
    }
    grouped[key].variants.push({
      sku: row.sku,
      flavor: row.flavor,
      stock: row.stock,
      weightG: row.weightG,
      priceEffective: row.priceCashRounded,
      priceTransfer: row.priceTransferRounded,
      priceList: row.priceListRounded,
      image: row.imageUrl,
    })
  }

  const data = Object.values(grouped).sort((a, b) => {
    const stockA = a.variants.reduce((s, v) => s + v.stock, 0)
    const stockB = b.variants.reduce((s, v) => s + v.stock, 0)
    return stockB - stockA
  })

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
