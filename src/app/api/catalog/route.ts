import { NextResponse } from 'next/server'
import { db } from '@/db'
import { products, pricing, categories, brands, flavors, sales, promotions, combos, comboItems, banners } from '@/db/schema'
import { eq, and, or, isNull, gte, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const revalidate = 60

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(c => arr.map(item => [...c, item])),
    [[]]
  )
}

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

  // Build combo entries with per-flavor variants for group slots
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

    // For group slots, fetch individual products with their flavors
    const groupSlots = comboItemRows.filter(r => r.productGroupName)
    const groupProductsMap = new Map<string, Array<{ id: number; sku: string; flavor: string | null; stock: number }>>()
    if (groupSlots.length > 0) {
      const slotKeys = new Set(groupSlots.map(r => `${r.productGroupName}||${r.productGroupWeight ?? ''}`))
      const conds = Array.from(slotKeys).map(key => {
        const sep = key.indexOf('||')
        const name = key.slice(0, sep)
        const weight = key.slice(sep + 2)
        return weight
          ? and(eq(products.name, name), eq(products.weightG, parseInt(weight)))
          : eq(products.name, name)
      })
      const productRows = await db
        .select({
          id: products.id,
          name: products.name,
          weightG: products.weightG,
          sku: products.sku,
          stock: products.stock,
          flavor: flavors.name,
        })
        .from(products)
        .leftJoin(flavors, eq(products.flavorId, flavors.id))
        .where(or(...conds))
      for (const p of productRows) {
        const key = `${p.name}||${p.weightG ?? ''}`
        const list = groupProductsMap.get(key) ?? []
        list.push({ id: p.id, sku: p.sku, flavor: p.flavor, stock: p.stock })
        groupProductsMap.set(key, list)
      }
    }

    for (const combo of visibleCombos) {
      const thisItems = comboItemRows.filter(r => r.comboId === combo.id)
      const fixedItems = thisItems.filter(r => r.productId !== null)
      const groupItemSlots = thisItems.filter(r => r.productGroupName !== null)

      const makeVariant = (sku: string, flavor: string | null, stock: number) => ({
        sku, flavor, stock,
        weightG: null as number | null,
        priceEffective: Number(combo.priceEffective) as number | null,
        priceTransfer: Number(combo.priceTransfer ?? combo.priceEffective) as number | null,
        priceList: Number(combo.priceList ?? combo.priceEffective) as number | null,
        image: combo.imageUrl,
        promoPrice: null as number | null,
        promoLabel: null as string | null,
      })

      let comboVariants
      if (groupItemSlots.length === 0) {
        const stocks = fixedItems.map(fi => Math.floor((fi.stock ?? 0) / fi.quantity))
        comboVariants = [makeVariant(combo.sku, null, stocks.length === 0 ? 0 : Math.min(...stocks))]
      } else {
        const slotOptions = groupItemSlots.map(slot => ({
          slot,
          products: groupProductsMap.get(`${slot.productGroupName}||${slot.productGroupWeight ?? ''}`) ?? [],
        }))
        const combinations = cartesian(slotOptions.map(s => s.products))
        if (combinations.length === 0) {
          comboVariants = [makeVariant(combo.sku, null, 0)]
        } else {
          const fixedStocks = fixedItems.map(fi => Math.floor((fi.stock ?? 0) / fi.quantity))
          comboVariants = combinations.map(choice => {
            const groupStocks = choice.map((p, i) => Math.floor(p.stock / slotOptions[i].slot.quantity))
            const allStocks = [...groupStocks, ...fixedStocks]
            const flavorLabel = choice.map(p => p.flavor).filter((f): f is string => f !== null).join(' · ') || null
            return makeVariant(
              `${combo.sku}__${choice.map(p => p.id).join('_')}`,
              flavorLabel,
              allStocks.length === 0 ? 0 : Math.min(...allStocks)
            )
          })
        }
      }

      grouped[`combo__${combo.sku}`] = {
        id: `combo__${combo.sku}`,
        name: combo.name,
        brand: 'Combo',
        category: 'Combos',
        image: combo.imageUrl,
        visible: true,
        salesCount: 0,
        description: combo.description,
        badge: combo.badge ?? null,
        featured: combo.featured,
        bannerName: combo.bannerName ?? null,
        bannerColor: combo.bannerColor ?? null,
        bannerTextColor: combo.bannerTextColor ?? null,
        bannerPosition: combo.bannerPosition ?? null,
        variants: comboVariants,
      }
    }
  }

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
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
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
