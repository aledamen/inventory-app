'use server'

import { db } from '@/db'
import { pricing, products, categories, brands, flavors } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

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
  const current = await db.select().from(pricing).where(eq(pricing.id, id)).limit(1)
  if (!current[0]) throw new Error('Pricing no encontrado')

  const p = current[0]
  const totalCost = Number(p.totalCost ?? 0)
  const mCash = data.marginCash ?? Number(p.marginCash ?? 0.25)
  const mTransfer = data.marginTransfer ?? Number(p.marginTransfer ?? 0.29)
  const mList = data.marginList ?? Number(p.marginList ?? 0.45)
  const shipping = data.clientShipping ?? (p.clientShipping ?? 3500)

  const priceCash = mCash > 0 ? totalCost / (1 - mCash) : totalCost
  const priceTransfer = mTransfer > 0 ? totalCost / (1 - mTransfer) : totalCost
  const priceList = mList > 0 ? totalCost / (1 - mList) : totalCost

  const round = (n: number) => Math.ceil(n / 10) * 10

  await db.update(pricing).set({
    marginCash: String(mCash),
    marginTransfer: String(mTransfer),
    marginList: String(mList),
    clientShipping: Math.round(Number(shipping)),
    priceCash: String(priceCash),
    priceCashRounded: round(priceCash),
    priceTransfer: String(priceTransfer),
    priceTransferRounded: round(priceTransfer),
    priceList: String(priceList),
    priceListRounded: round(priceList),
    priceCashWithShipping: round(priceCash) + Math.round(Number(shipping)),
    priceListWithShipping: round(priceList) + Math.round(Number(shipping)),
    profit: String(priceCash - totalCost),
    updatedAt: new Date(),
  }).where(eq(pricing.id, id))

  revalidatePath('/dashboard/pricing')
}
