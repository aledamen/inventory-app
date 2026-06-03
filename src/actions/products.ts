'use server'

import { db } from '@/db'
import { products, categories, brands, flavors, banners, pricing, config } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { revalidateCatalog } from '@/lib/catalog'
import { configFromMap, getBagPrice, roundUp } from '@/lib/pricing-calc'

async function recalculatePricing(productId: number) {
  const [pricingRow] = await db.select().from(pricing).where(eq(pricing.productId, productId)).limit(1)
  if (!pricingRow) return

  const [product] = await db
    .select({ cost: products.cost, weightG: products.weightG, bagAssigned: products.bagAssigned })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
  if (!product) return

  const configRows = await db.select().from(config)
  const cfg = configFromMap(Object.fromEntries(configRows.map(r => [r.key, r.value])))

  const shippingCost = product.weightG
    ? cfg.costPerGram * product.weightG
    : Number(pricingRow.shippingCost ?? 0)

  const bagCost = getBagPrice(product.bagAssigned, cfg)
  const packagingCost = bagCost > 0
    ? bagCost + cfg.stickerCost
    : Number(pricingRow.packagingCost ?? 0)

  const cost = Number(product.cost ?? 0)
  const totalCost = cost + shippingCost + packagingCost

  const mCash = Number(pricingRow.marginCash ?? cfg.defaultMarginCash)
  const mTransfer = Number(pricingRow.marginTransfer ?? cfg.defaultMarginTransfer)
  const mList = Number(pricingRow.marginList ?? cfg.defaultMarginList)
  const shipping = pricingRow.clientShipping ?? 3500

  const priceCash = totalCost * (1 + mCash)
  const priceTransfer = totalCost * (1 + mTransfer)
  const priceList = totalCost * (1 + mList)

  await db.update(pricing).set({
    shippingCost: String(shippingCost),
    packagingCost: String(packagingCost),
    totalCost: String(totalCost),
    priceCash: String(priceCash),
    priceCashRounded: roundUp(priceCash),
    priceTransfer: String(priceTransfer),
    priceTransferRounded: roundUp(priceTransfer),
    priceList: String(priceList),
    priceListRounded: roundUp(priceList),
    priceCashWithShipping: roundUp(priceCash) + Math.round(Number(shipping)),
    priceListWithShipping: roundUp(priceList) + Math.round(Number(shipping)),
    profit: String(priceCash - totalCost),
    updatedAt: new Date(),
  }).where(eq(pricing.productId, productId))
}

export async function getProducts() {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      flavor: flavors.name,
      weightG: products.weightG,
      size: products.size,
      cost: products.cost,
      stock: products.stock,
      stockMin: products.stockMin,
      imageUrl: products.imageUrl,
      visible: products.visible,
      notes: products.notes,
      type: products.type,
      bagAssigned: products.bagAssigned,
      description: products.description,
      badge: products.badge,
      featured: products.featured,
      category: categories.name,
      brand: brands.name,
      updatedAt: products.updatedAt,
      bannerName: banners.name,
      bannerColor: banners.color,
      bannerId: products.bannerId,
      priceCashRounded: pricing.priceCashRounded,
      totalCost: pricing.totalCost,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(banners, eq(products.bannerId, banners.id))
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .orderBy(products.name)
}

export async function getLookups() {
  const [cats, brnds, flvrs, bnnrs] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(brands).orderBy(brands.name),
    db.select().from(flavors).orderBy(flavors.name),
    db.select().from(banners).orderBy(banners.name),
  ])
  return { categories: cats, brands: brnds, flavors: flvrs, banners: bnnrs }
}

export async function createProduct(data: {
  sku: string
  name: string
  cost: number
  categoryId?: number
  brandId?: number
  flavorId?: number
  weightG?: number
  size?: string
  stockMin?: number
  type?: string
  bagAssigned?: string
  notes?: string
}) {
  await db.insert(products).values({
    ...data,
    cost: String(data.cost),
    stock: 0,
  })
  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}

export async function updateProduct(id: number, data: Partial<{
  sku: string
  name: string
  cost: number
  categoryId: number
  brandId: number
  flavorId: number
  weightG: number
  size: string
  stockMin: number
  type: string
  bagAssigned: string
  notes: string
  visible: boolean
  imageUrl: string
  description: string
  badge: string | null
  featured: boolean
  bannerId: number | null
}>) {
  const { cost, ...rest } = data
  await db.update(products).set({
    ...rest,
    ...(cost !== undefined ? { cost: String(cost) } : {}),
    updatedAt: new Date(),
  }).where(eq(products.id, id))

  if (cost !== undefined || rest.weightG !== undefined || rest.bagAssigned !== undefined) {
    await recalculatePricing(id)
  }

  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}

export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id))
  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}
