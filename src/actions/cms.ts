'use server'

import { db } from '@/db'
import { promotions, products, flavors, banners } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getPromotions() {
  return db
    .select({
      id: promotions.id,
      productId: promotions.productId,
      promoPrice: promotions.promoPrice,
      label: promotions.label,
      validFrom: promotions.validFrom,
      validTo: promotions.validTo,
      active: promotions.active,
      createdAt: promotions.createdAt,
      productName: products.name,
      productSku: products.sku,
      productFlavor: flavors.name,
    })
    .from(promotions)
    .innerJoin(products, eq(promotions.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .orderBy(promotions.createdAt)
}

export async function createPromotion(data: {
  productId: number
  promoPrice: number
  label?: string
  validFrom?: string
  validTo?: string
}) {
  await db.insert(promotions).values({
    productId: data.productId,
    promoPrice: String(data.promoPrice),
    label: data.label ?? null,
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    active: true,
  })
  revalidatePath('/dashboard/cms')
  revalidatePath('/api/catalog')
}

export async function updatePromotion(
  id: number,
  data: Partial<{
    promoPrice: number
    label: string | null
    validFrom: string | null
    validTo: string | null
    active: boolean
    productId: number
  }>
) {
  const { promoPrice, ...rest } = data
  await db
    .update(promotions)
    .set({
      ...rest,
      ...(promoPrice !== undefined ? { promoPrice: String(promoPrice) } : {}),
    })
    .where(eq(promotions.id, id))
  revalidatePath('/dashboard/cms')
  revalidatePath('/api/catalog')
}

export async function deletePromotion(id: number) {
  await db.delete(promotions).where(eq(promotions.id, id))
  revalidatePath('/dashboard/cms')
  revalidatePath('/api/catalog')
}

export async function getBanners() {
  return db.select().from(banners).orderBy(banners.name)
}

export async function createBanner(data: { name: string; color: string; textColor?: string; position?: string }) {
  await db.insert(banners).values({
    name: data.name,
    color: data.color,
    textColor: data.textColor ?? '#FFFFFF',
    position: data.position ?? 'bottom',
  })
  revalidatePath('/dashboard/cms')
  revalidatePath('/dashboard/products')
  revalidatePath('/api/catalog')
}

export async function updateBanner(id: number, data: Partial<{ name: string; color: string; textColor: string; position: string }>) {
  await db.update(banners).set(data).where(eq(banners.id, id))
  revalidatePath('/dashboard/cms')
  revalidatePath('/dashboard/products')
  revalidatePath('/api/catalog')
}

export async function deleteBanner(id: number) {
  await db.delete(banners).where(eq(banners.id, id))
  revalidatePath('/dashboard/cms')
  revalidatePath('/dashboard/products')
  revalidatePath('/api/catalog')
}
