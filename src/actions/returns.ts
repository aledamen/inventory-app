'use server'

import { db } from '@/db'
import { returns, products, clients, sales } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getReturns() {
  const { flavors } = await import('@/db/schema')
  return db.select({
    id: returns.id,
    date: returns.date,
    saleId: returns.saleId,
    quantity: returns.quantity,
    reason: returns.reason,
    refundAmount: returns.refundAmount,
    productName: products.name,
    productFlavor: flavors.name,
    clientName: clients.name,
  })
    .from(returns)
    .innerJoin(products, eq(returns.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(clients, eq(returns.clientId, clients.id))
    .orderBy(desc(returns.date))
}

export async function createReturn(data: {
  saleId?: number
  productId: number
  clientId?: number
  quantity: number
  reason?: string
  refundAmount?: number
  date: Date
}) {
  await db.transaction(async (tx) => {
    await tx.insert(returns).values({
      ...data,
      refundAmount: data.refundAmount ? String(data.refundAmount) : null,
    })
    // Restore stock
    const { sql } = await import('drizzle-orm')
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${data.quantity}` })
      .where(eq(products.id, data.productId))
  })
  revalidatePath('/dashboard', 'layout')
}

export async function updateReturn(id: number, data: {
  productId: number
  clientId?: number | null
  saleId?: number | null
  quantity: number
  reason?: string
  refundAmount?: number | null
  date: Date
}) {
  const existing = await db.select().from(returns).where(eq(returns.id, id)).limit(1)
  if (!existing[0]) throw new Error('Devolución no encontrada')
  const old = existing[0]

  await db.transaction(async (tx) => {
    // Reverse old stock restoration
    await tx.update(products)
      .set({ stock: sql`${products.stock} - ${old.quantity}` })
      .where(eq(products.id, old.productId))
    // Apply new stock restoration
    await tx.update(products)
      .set({ stock: sql`${products.stock} + ${data.quantity}` })
      .where(eq(products.id, data.productId))
    // Update record
    await tx.update(returns).set({
      productId: data.productId,
      clientId: data.clientId ?? null,
      saleId: data.saleId ?? null,
      quantity: data.quantity,
      reason: data.reason ?? null,
      refundAmount: data.refundAmount ? String(data.refundAmount) : null,
      date: data.date,
    }).where(eq(returns.id, id))
  })

  revalidatePath('/dashboard', 'layout')
}

export async function deleteReturn(id: number) {
  await db.delete(returns).where(eq(returns.id, id))
  revalidatePath('/dashboard', 'layout')
}
