'use server'

import { db } from '@/db'
import { pricing, products, categories, brands, flavors, config } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { revalidateCatalog } from '@/lib/catalog'
import { configFromMap, getBagPrice, roundUp, type PricingConfig } from '@/lib/pricing-calc'

async function fetchConfig(): Promise<PricingConfig> {
  const rows = await db.select().from(config)
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return configFromMap(map)
}

export async function getPricingWithProducts() {
  return db
    .select({
      id: pricing.id,
      productId: pricing.productId,
      sku: products.sku,
      name: products.name,
      flavor: flavors.name,
      brand: brands.name,
      category: categories.name,
      cost: products.cost,
      shippingCost: pricing.shippingCost,
      packagingCost: pricing.packagingCost,
      totalCost: pricing.totalCost,
      marginCash: pricing.marginCash,
      marginTransfer: pricing.marginTransfer,
      marginList: pricing.marginList,
      priceCashRounded: pricing.priceCashRounded,
      priceTransferRounded: pricing.priceTransferRounded,
      priceListRounded: pricing.priceListRounded,
      clientShipping: pricing.clientShipping,
      profit: pricing.profit,
    })
    .from(pricing)
    .leftJoin(products, eq(pricing.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .orderBy(products.name)
}

export async function updatePricing(id: number, data: {
  marginCash?: number
  marginTransfer?: number
  marginList?: number
  clientShipping?: number
}) {
  const [current] = await db
    .select({
      id: pricing.id,
      productId: pricing.productId,
      marginCash: pricing.marginCash,
      marginTransfer: pricing.marginTransfer,
      marginList: pricing.marginList,
      clientShipping: pricing.clientShipping,
      storedShipping: pricing.shippingCost,
      storedPackaging: pricing.packagingCost,
    })
    .from(pricing)
    .where(eq(pricing.id, id))
    .limit(1)

  if (!current) throw new Error('Pricing no encontrado')

  const [product] = await db
    .select({ cost: products.cost, weightG: products.weightG, bagAssigned: products.bagAssigned })
    .from(products)
    .where(eq(products.id, current.productId))
    .limit(1)

  const cfg = await fetchConfig()

  const shippingCost = product?.weightG
    ? cfg.costPerGram * product.weightG
    : Number(current.storedShipping ?? 0)

  const bagCost = getBagPrice(product?.bagAssigned, cfg)
  const packagingCost = bagCost > 0
    ? bagCost + cfg.stickerCost
    : Number(current.storedPackaging ?? 0)

  const cost = Number(product?.cost ?? 0)
  const totalCost = cost + shippingCost + packagingCost

  const mCash = data.marginCash ?? Number(current.marginCash ?? cfg.defaultMarginCash)
  const mTransfer = data.marginTransfer ?? Number(current.marginTransfer ?? cfg.defaultMarginTransfer)
  const mList = data.marginList ?? Number(current.marginList ?? cfg.defaultMarginList)
  const shipping = data.clientShipping ?? (current.clientShipping ?? 3500)

  const priceCash = totalCost * (1 + mCash)
  const priceTransfer = totalCost * (1 + mTransfer)
  const priceList = totalCost * (1 + mList)

  await db.update(pricing).set({
    shippingCost: String(shippingCost),
    packagingCost: String(packagingCost),
    totalCost: String(totalCost),
    marginCash: String(mCash),
    marginTransfer: String(mTransfer),
    marginList: String(mList),
    clientShipping: Math.round(Number(shipping)),
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
  }).where(eq(pricing.id, id))

  revalidatePath('/dashboard/pricing')
  await revalidateCatalog()
}

export async function recalculateAllPricing() {
  const cfg = await fetchConfig()

  const rows = await db
    .select({
      pricingId: pricing.id,
      productCost: products.cost,
      weightG: products.weightG,
      bagAssigned: products.bagAssigned,
      marginCash: pricing.marginCash,
      marginTransfer: pricing.marginTransfer,
      marginList: pricing.marginList,
      clientShipping: pricing.clientShipping,
      storedShipping: pricing.shippingCost,
      storedPackaging: pricing.packagingCost,
    })
    .from(pricing)
    .leftJoin(products, eq(pricing.productId, products.id))

  for (const row of rows) {
    const shippingCost = row.weightG
      ? cfg.costPerGram * row.weightG
      : Number(row.storedShipping ?? 0)

    const bagCost = getBagPrice(row.bagAssigned, cfg)
    const packagingCost = bagCost > 0
      ? bagCost + cfg.stickerCost
      : Number(row.storedPackaging ?? 0)

    const cost = Number(row.productCost ?? 0)
    const totalCost = cost + shippingCost + packagingCost

    const mCash = Number(row.marginCash ?? cfg.defaultMarginCash)
    const mTransfer = Number(row.marginTransfer ?? cfg.defaultMarginTransfer)
    const mList = Number(row.marginList ?? cfg.defaultMarginList)
    const shipping = row.clientShipping ?? 3500

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
    }).where(eq(pricing.id, row.pricingId))
  }

  revalidatePath('/dashboard/pricing')
  revalidatePath('/dashboard/products')
  await revalidateCatalog()
}
