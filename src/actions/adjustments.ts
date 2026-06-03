'use server'

import { db } from '@/db'
import { stockAdjustments, products } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getAdjustments() {
  const { flavors } = await import('@/db/schema')
  return db.select({
    id: stockAdjustments.id,
    date: stockAdjustments.date,
    quantity: stockAdjustments.quantity,
    reason: stockAdjustments.reason,
    productId: stockAdjustments.productId,
    productName: products.name,
    productFlavor: flavors.name,
    productSku: products.sku,
    createdAt: stockAdjustments.createdAt,
  })
    .from(stockAdjustments)
    .innerJoin(products, eq(stockAdjustments.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .orderBy(desc(stockAdjustments.date))
}

export async function createAdjustment(data: {
  productId: number
  quantity: number
  reason: string
  date: Date
}) {
  await db.transaction(async (tx) => {
    await tx.insert(stockAdjustments).values(data)
    await tx
      .update(products)
      .set({ stock: sql`greatest(0, ${products.stock} + ${data.quantity})` })
      .where(eq(products.id, data.productId))
  })
  revalidatePath('/dashboard', 'layout')
}

export async function deleteAdjustment(id: number) {
  await db.delete(stockAdjustments).where(eq(stockAdjustments.id, id))
  revalidatePath('/dashboard', 'layout')
}
