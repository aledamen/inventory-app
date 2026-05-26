import { NextResponse } from 'next/server'
import { db } from '@/db'
import { products, pricing, categories, brands, flavors, sales, promotions, combos, comboItems, banners } from '@/db/schema'
import { eq, and, or, isNull, gte, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const revalidate = 60

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
        name: row.weightG ? `${row.name} ${row.weightG}g` : row.name,
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

  // Fetch visible combos and compute their stock
  const visibleCombos = await db
    .select({
      id: combos.id,
      sku: combos.sku,
      name: combos.name,
      description: combos.description,
      badge: combos.badge,
      featured: combos.featured,
      visible: combos.visible,
      imageUrl: combos.imageUrl,
      priceEffective: combos.priceEffective,
      priceTransfer: combos.priceTransfer,
      priceList: combos.priceList,
      notes: combos.notes,
      bannerId: combos.bannerId,
      bannerName: banners.name,
      bannerColor: banners.color,
      bannerTextColor: banners.textColor,
      bannerPosition: banners.position,
      createdAt: combos.createdAt,
      updatedAt: combos.updatedAt,
    })
    .from(combos)
    .leftJoin(banners, eq(combos.bannerId, banners.id))
    .where(eq(combos.visible, true))

  // Build combo stock map (handles both fixed productId slots and group slots)
  const comboStockMap = new Map<number, number>()
  if (visibleCombos.length > 0) {
    const comboIds = visibleCombos.map(c => c.id)
    const comboItemRows = await db
      .select({
        comboId: comboItems.comboId,
        productId: comboItems.productId,
        productGroupName: comboItems.productGroupName,
        productGroupWeight: comboItems.productGroupWeight,
        quantity: comboItems.quantity,
        stock: products.stock,
      })
      .from(comboItems)
      .leftJoin(products, eq(comboItems.productId, products.id))
      .where(inArray(comboItems.comboId, comboIds))

    // For group slots, fetch total stock by name+weight
    const groupSlots = comboItemRows.filter(r => r.productGroupName)
    const groupStockMap = new Map<string, number>()
    if (groupSlots.length > 0) {
      const conditions = groupSlots.map(r =>
        r.productGroupWeight
          ? and(eq(products.name, r.productGroupName!), eq(products.weightG, r.productGroupWeight))
          : eq(products.name, r.productGroupName!)
      )
      const stockRows = await db
        .select({ name: products.name, weightG: products.weightG, total: sql<number>`sum(${products.stock})` })
        .from(products)
        .where(or(...conditions))
        .groupBy(products.name, products.weightG)
      for (const r of stockRows) groupStockMap.set(`${r.name}||${r.weightG ?? ''}`, Number(r.total))
      // Null-weight slots look up by "name||" — sum all variants for that name
      for (const slot of groupSlots) {
        if (!slot.productGroupWeight) {
          const key = `${slot.productGroupName}||`
          if (!groupStockMap.has(key)) {
            let total = 0
            for (const [k, v] of groupStockMap) {
              if (k.startsWith(`${slot.productGroupName}||`)) total += v
            }
            groupStockMap.set(key, total)
          }
        }
      }
    }

    const itemsByCombo = new Map<number, { stock: number; quantity: number }[]>()
    for (const row of comboItemRows) {
      const stock = row.productGroupName
        ? (groupStockMap.get(`${row.productGroupName}||${row.productGroupWeight ?? ''}`) ?? 0)
        : (row.stock ?? 0)
      const list = itemsByCombo.get(row.comboId) ?? []
      list.push({ stock, quantity: row.quantity })
      itemsByCombo.set(row.comboId, list)
    }
    for (const [cId, cItems] of itemsByCombo) {
      const stock = cItems.length === 0 ? 0 : Math.min(...cItems.map(i => Math.floor(i.stock / i.quantity)))
      comboStockMap.set(cId, stock)
    }
  }

  // Build combo entries
  for (const combo of visibleCombos) {
    const comboStock = comboStockMap.get(combo.id) ?? 0
    grouped[`combo__${combo.sku}`] = {
      id: `combo__${combo.sku}`,
      name: combo.name,
      brand: 'Combo',
      category: 'Combos',
      image: combo.imageUrl,
      visible: true,
      salesCount: 0,
      description: combo.description,
      badge: combo.badge ?? 'Combo',
      featured: combo.featured,
      bannerName: combo.bannerName ?? null,
      bannerColor: combo.bannerColor ?? null,
      bannerTextColor: combo.bannerTextColor ?? null,
      bannerPosition: combo.bannerPosition ?? null,
      variants: [{
        sku: combo.sku,
        flavor: null,
        stock: comboStock,
        weightG: null,
        priceEffective: Number(combo.priceEffective),
        priceTransfer: Number(combo.priceTransfer ?? combo.priceEffective),
        priceList: Number(combo.priceList ?? combo.priceEffective),
        image: combo.imageUrl,
        promoPrice: null,
        promoLabel: null,
      }],
    }
  }

  // Sort: banner first, then featured, then stock, then salesCount desc
  const data = Object.values(grouped).sort((a, b) => {
    const aBanner = a.bannerName != null
    const bBanner = b.bannerName != null
    if (aBanner && !bBanner) return -1
    if (!aBanner && bBanner) return 1
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    const aHasStock = a.variants.some(v => v.stock > 0)
    const bHasStock = b.variants.some(v => v.stock > 0)
    if (aHasStock && !bHasStock) return -1
    if (!aHasStock && bHasStock) return 1
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
