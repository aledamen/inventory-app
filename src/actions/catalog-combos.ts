import { db } from '@/db'
import { combos, comboItems, products, flavors, banners } from '@/db/schema'
import { eq, and, or, inArray, asc, sql } from 'drizzle-orm'

export type ComboCatalogVariant = {
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
}

export type ComboCatalogEntry = {
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
  availableStock: number
  variants: ComboCatalogVariant[]
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(c => arr.map(item => [...c, item])),
    [[]]
  )
}

/**
 * Builds combo catalog entries (per-flavor cartesian variants for group slots),
 * keyed by `combo__<sku>`, matching the shape consumed by /api/catalog and
 * /api/curated-picks. Pass `skus` to restrict to a subset of combo SKUs.
 */
export async function buildComboEntries(skus?: string[]): Promise<Record<string, ComboCatalogEntry>> {
  const entries: Record<string, ComboCatalogEntry> = {}

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
    .where(
      skus && skus.length > 0
        ? and(eq(combos.visible, true), inArray(combos.sku, skus))
        : eq(combos.visible, true)
    )

  if (visibleCombos.length === 0) return entries

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
    .orderBy(asc(comboItems.id))

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

  // Group-summed stock per "name||weight" slot key, matching getCombosFull()'s
  // groupStockMap semantics (SUM of stock across all products in the group,
  // not a single flavor choice's stock — used only for availableStock below).
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

  for (const combo of visibleCombos) {
    const thisItems = comboItemRows.filter(r => r.comboId === combo.id)
    const fixedItems = thisItems.filter(r => r.productId !== null)
    const groupItemSlots = thisItems.filter(r => r.productGroupName !== null)

    // availableStock: per-component-product stock check (getCombosFull() formula),
    // NOT the per-flavor-choice cartesian variant stock computed below.
    const stockItems = thisItems.map(r => ({
      quantity: r.quantity,
      stock: r.productGroupName
        ? (groupStockMap.get(`${r.productGroupName}||${r.productGroupWeight ?? ''}`) ?? 0)
        : (r.stock ?? 0),
    }))
    const availableStock = stockItems.length === 0
      ? 0
      : Math.min(...stockItems.map(item => Math.floor(item.stock / item.quantity)))

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

    entries[`combo__${combo.sku}`] = {
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
      availableStock,
      variants: comboVariants,
    }
  }

  return entries
}
