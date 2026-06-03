'use server'

import { db } from '@/db'
import { stockMovements, products, paymentMethods, flavors } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { revalidateCatalog } from '@/lib/catalog'

export async function getStockMovements() {
  return db
    .select({
      id: stockMovements.id,
      movementNumber: stockMovements.movementNumber,
      date: stockMovements.date,
      productId: stockMovements.productId,
      productSku: products.sku,
      productName: products.name,
      productFlavor: flavors.name,
      quantity: stockMovements.quantity,
      unitCost: stockMovements.unitCost,
      total: stockMovements.total,
      paymentMethodId: stockMovements.paymentMethodId,
      paymentMethod: paymentMethods.name,
      note: stockMovements.note,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(stockMovements.paymentMethodId, paymentMethods.id))
    .orderBy(desc(stockMovements.date))
}

export async function createStockMovement(data: {
  productId: number
  quantity: number
  unitCost?: number
  paymentMethodId?: number
  note?: string
  date: Date
}) {
  const lastNum = await db
    .select({ max: sql<number>`max(${stockMovements.movementNumber})` })
    .from(stockMovements)

  const nextNum = (lastNum[0]?.max ?? 0) + 1

  await db.transaction(async (tx) => {
    await tx.insert(stockMovements).values({
      movementNumber: nextNum,
      type: 'entrada',
      productId: data.productId,
      quantity: data.quantity,
      unitCost: data.unitCost ? String(data.unitCost) : null,
      total: data.unitCost ? String(data.unitCost * data.quantity) : null,
      paymentMethodId: data.paymentMethodId,
      note: data.note,
      date: data.date,
    })

    await tx
      .update(products)
      .set({
        stock: sql`${products.stock} + ${data.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.productId))
  })

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}

export async function updateStockMovement(id: number, data: {
  movementNumber?: number
  productId: number
  quantity: number
  unitCost?: number
  paymentMethodId?: number | null
  note?: string
  date: Date
}) {
  const existing = await db.select().from(stockMovements).where(eq(stockMovements.id, id)).limit(1)
  if (!existing[0]) throw new Error('Movimiento no encontrado')
  const old = existing[0]

  await db.transaction(async (tx) => {
    // Reverse old stock addition
    await tx.update(products)
      .set({ stock: sql`${products.stock} - ${old.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, old.productId))

    // Update movement record
    await tx.update(stockMovements).set({
      ...(data.movementNumber !== undefined ? { movementNumber: data.movementNumber } : {}),
      productId: data.productId,
      quantity: data.quantity,
      unitCost: data.unitCost ? String(data.unitCost) : null,
      total: data.unitCost ? String(data.unitCost * data.quantity) : null,
      paymentMethodId: data.paymentMethodId ?? null,
      note: data.note ?? null,
      date: data.date,
    }).where(eq(stockMovements.id, id))

    // Apply new stock addition
    await tx.update(products)
      .set({ stock: sql`${products.stock} + ${data.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, data.productId))
  })

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}

export async function deleteStockMovement(id: number) {
  const existing = await db.select().from(stockMovements).where(eq(stockMovements.id, id)).limit(1)
  if (!existing[0]) throw new Error('Movimiento no encontrado')

  await db.transaction(async (tx) => {
    // Reverse stock addition (removing an entry reduces stock)
    await tx.update(products)
      .set({ stock: sql`${products.stock} - ${existing[0].quantity}`, updatedAt: new Date() })
      .where(eq(products.id, existing[0].productId))
    await tx.delete(stockMovements).where(eq(stockMovements.id, id))
  })

  revalidatePath('/dashboard/stock')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}
