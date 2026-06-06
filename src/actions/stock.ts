'use server'

import { db } from '@/db'
import { stockMovements, products, paymentMethods, flavors, suppliers } from '@/db/schema'
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
      supplierId: stockMovements.supplierId,
      supplierName: suppliers.name,
      shippingCost: stockMovements.shippingCost,
      note: stockMovements.note,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(stockMovements.paymentMethodId, paymentMethods.id))
    .leftJoin(suppliers, eq(stockMovements.supplierId, suppliers.id))
    .orderBy(desc(stockMovements.date), desc(stockMovements.movementNumber))
}

export async function createMultiStockMovement(data: {
  items: { productId: number; quantity: number; unitCost?: number }[]
  supplierId?: number
  paymentMethodId?: number
  shippingCost?: number
  note?: string
  date: Date
}) {
  if (data.items.length === 0) throw new Error('La entrada debe tener al menos un producto')

  const lastNum = await db
    .select({ max: sql<number>`max(${stockMovements.movementNumber})` })
    .from(stockMovements)

  const nextNum = (lastNum[0]?.max ?? 0) + 1
  const shipping = data.shippingCost ?? 0

  // Distribute shipping proportionally by item subtotal; fall back to equal split
  const subtotals = data.items.map(i => (i.unitCost ?? 0) * i.quantity)
  const purchaseSubtotal = subtotals.reduce((s, v) => s + v, 0)

  function itemShipping(idx: number): number {
    if (shipping === 0) return 0
    if (purchaseSubtotal > 0) return shipping * (subtotals[idx] / purchaseSubtotal)
    return shipping / data.items.length
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const subtotal = subtotals[i]
      const totalWithShipping = subtotal + itemShipping(i)

      await tx.insert(stockMovements).values({
        movementNumber: nextNum,
        type: 'entrada',
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost ? String(item.unitCost) : null,
        total: totalWithShipping > 0 ? String(totalWithShipping) : null,
        shippingCost: shipping > 0 ? String(shipping) : null,
        paymentMethodId: data.paymentMethodId ?? null,
        supplierId: data.supplierId ?? null,
        note: data.note ?? null,
        date: data.date,
      })

      await tx.update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId))
    }
  })

  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}

export async function createStockMovement(data: {
  productId: number
  quantity: number
  unitCost?: number
  paymentMethodId?: number
  supplierId?: number
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
      paymentMethodId: data.paymentMethodId ?? null,
      supplierId: data.supplierId ?? null,
      note: data.note ?? null,
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

  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}

export async function updateStockMovement(id: number, data: {
  movementNumber?: number
  productId: number
  quantity: number
  unitCost?: number
  paymentMethodId?: number | null
  supplierId?: number | null
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
      supplierId: data.supplierId ?? null,
      note: data.note ?? null,
      date: data.date,
      updatedAt: new Date(),
    }).where(eq(stockMovements.id, id))

    // Apply new stock addition
    await tx.update(products)
      .set({ stock: sql`${products.stock} + ${data.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, data.productId))
  })

  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}

export async function updateMultiStockMovement(movementNumber: number, data: {
  items: { productId: number; quantity: number; unitCost?: number }[]
  supplierId?: number | null
  paymentMethodId?: number | null
  shippingCost?: number
  note?: string
  date: Date
}) {
  if (data.items.length === 0) throw new Error('La entrada debe tener al menos un producto')

  const oldRows = await db.select().from(stockMovements)
    .where(eq(stockMovements.movementNumber, movementNumber))

  const shipping = data.shippingCost ?? 0
  const subtotals = data.items.map(i => (i.unitCost ?? 0) * i.quantity)
  const purchaseSubtotal = subtotals.reduce((s, v) => s + v, 0)

  function itemShipping(idx: number): number {
    if (shipping === 0) return 0
    if (purchaseSubtotal > 0) return shipping * (subtotals[idx] / purchaseSubtotal)
    return shipping / data.items.length
  }

  await db.transaction(async (tx) => {
    // Reverse stock for all old rows
    for (const row of oldRows) {
      await tx.update(products)
        .set({ stock: sql`${products.stock} - ${row.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, row.productId))
    }

    // Delete all old rows for this movementNumber
    await tx.delete(stockMovements).where(eq(stockMovements.movementNumber, movementNumber))

    // Insert new rows
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const subtotal = subtotals[i]
      const totalWithShipping = subtotal + itemShipping(i)

      await tx.insert(stockMovements).values({
        movementNumber,
        type: 'entrada',
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost ? String(item.unitCost) : null,
        total: totalWithShipping > 0 ? String(totalWithShipping) : null,
        shippingCost: shipping > 0 ? String(shipping) : null,
        paymentMethodId: data.paymentMethodId ?? null,
        supplierId: data.supplierId ?? null,
        note: data.note ?? null,
        date: data.date,
      })

      await tx.update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, item.productId))
    }
  })

  revalidatePath('/dashboard', 'layout')
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

  revalidatePath('/dashboard', 'layout')
  await revalidateCatalog()
}
