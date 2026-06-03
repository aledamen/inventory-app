'use server'

import { db } from '@/db'
import { sales, products, paymentMethods, pricing, flavors, clients } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { revalidateCatalog } from '@/lib/catalog'

export async function getSales() {
  return db
    .select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      date: sales.date,
      productId: sales.productId,
      productSku: products.sku,
      productName: products.name,
      productFlavor: flavors.name,
      quantity: sales.quantity,
      effectivePrice: sales.effectivePrice,
      saleValue: sales.saleValue,
      totalSale: sales.totalSale,
      netProfit: sales.netProfit,
      paymentMethodId: sales.paymentMethodId,
      paymentMethod: paymentMethods.name,
      notes: sales.notes,
      clientId: sales.clientId,
      clientName: clients.name,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(sales.paymentMethodId, paymentMethods.id))
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .orderBy(desc(sales.date))
}

export async function createMultiSale(data: {
  items: { productId: number; quantity: number; effectivePrice: number }[]
  paymentMethodId?: number
  notes?: string
  date: Date
  clientId?: number
}) {
  if (data.items.length === 0) throw new Error('La venta debe tener al menos un producto')

  const lastNum = await db
    .select({ max: sql<number>`max(${sales.saleNumber})` })
    .from(sales)
  const saleNumber = (lastNum[0]?.max ?? 0) + 1

  await db.transaction(async (tx) => {
    // Validate stock and get costs upfront
    const rows: {
      productId: number; quantity: number; effectivePrice: number
      saleValue: number; totalCost: number; netProfit: number
    }[] = []

    for (const item of data.items) {
      const [product] = await tx
        .select({ stock: products.stock, cost: pricing.totalCost })
        .from(products)
        .leftJoin(pricing, eq(products.id, pricing.productId))
        .where(eq(products.id, item.productId))
        .limit(1)

      if (!product) throw new Error(`Producto ${item.productId} no encontrado`)
      if (product.stock < item.quantity) throw new Error('Stock insuficiente para uno o más productos')

      const saleValue = item.effectivePrice * item.quantity
      const totalCost = product.cost ? Number(product.cost) * item.quantity : 0
      rows.push({ ...item, saleValue, totalCost, netProfit: saleValue - totalCost })
    }

    const saleTotal = rows.reduce((s, r) => s + r.saleValue, 0)

    for (const row of rows) {
      await tx.insert(sales).values({
        saleNumber,
        type: 'salida',
        productId: row.productId,
        quantity: row.quantity,
        effectivePrice: String(row.effectivePrice),
        saleValue: String(row.saleValue),
        totalSale: String(saleTotal),
        totalCost: String(row.totalCost),
        netProfit: String(row.netProfit),
        grossProfit: String(row.saleValue),
        clientId: data.clientId ?? null,
        paymentMethodId: data.paymentMethodId,
        notes: data.notes,
        date: data.date,
      })

      await tx.update(products)
        .set({ stock: sql`${products.stock} - ${row.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, row.productId))
    }
  })

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}

export async function createSale(data: {
  productId: number
  quantity: number
  effectivePrice: number
  paymentMethodId?: number
  notes?: string
  date: Date
  clientId?: number
}) {
  const product = await db
    .select({ stock: products.stock, cost: pricing.totalCost })
    .from(products)
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .where(eq(products.id, data.productId))
    .limit(1)

  if (!product[0]) throw new Error('Producto no encontrado')
  if (product[0].stock < data.quantity) throw new Error('Stock insuficiente')

  const totalCost = product[0].cost ? Number(product[0].cost) * data.quantity : 0
  const saleValue = data.effectivePrice * data.quantity
  const netProfit = saleValue - totalCost

  const lastNum = await db
    .select({ max: sql<number>`max(${sales.saleNumber})` })
    .from(sales)

  const nextNum = (lastNum[0]?.max ?? 0) + 1

  await db.insert(sales).values({
    saleNumber: nextNum,
    type: 'salida',
    productId: data.productId,
    quantity: data.quantity,
    effectivePrice: String(data.effectivePrice),
    saleValue: String(saleValue),
    totalSale: String(saleValue),
    totalCost: String(totalCost),
    netProfit: String(netProfit),
    grossProfit: String(saleValue),
    clientId: data.clientId ?? null,
    paymentMethodId: data.paymentMethodId,
    notes: data.notes,
    date: data.date,
  })

  await db
    .update(products)
    .set({
      stock: sql`${products.stock} - ${data.quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, data.productId))

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}

export async function updateSale(id: number, data: {
  saleNumber?: number
  productId: number
  quantity: number
  effectivePrice: number
  paymentMethodId?: number | null
  clientId?: number | null
  notes?: string
  date: Date
}) {
  const existing = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
  if (!existing[0]) throw new Error('Venta no encontrada')
  const old = existing[0]

  const product = await db
    .select({ stock: products.stock, cost: pricing.totalCost })
    .from(products)
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .where(eq(products.id, data.productId))
    .limit(1)

  if (!product[0]) throw new Error('Producto no encontrado')

  const effectiveStock = product[0].stock + (old.productId === data.productId ? old.quantity : 0)
  if (effectiveStock < data.quantity) throw new Error('Stock insuficiente')

  const totalCost = product[0].cost ? Number(product[0].cost) * data.quantity : 0
  const saleValue = data.effectivePrice * data.quantity
  const netProfit = saleValue - totalCost

  await db.update(products)
    .set({ stock: sql`${products.stock} + ${old.quantity}`, updatedAt: new Date() })
    .where(eq(products.id, old.productId))

  const targetSaleNumber = data.saleNumber ?? old.saleNumber

  await db.update(sales).set({
    ...(data.saleNumber !== undefined ? { saleNumber: data.saleNumber } : {}),
    productId: data.productId,
    quantity: data.quantity,
    effectivePrice: String(data.effectivePrice),
    saleValue: String(saleValue),
    totalSale: String(saleValue), // will be recalculated below for groups
    totalCost: String(totalCost),
    netProfit: String(netProfit),
    grossProfit: String(saleValue),
    paymentMethodId: data.paymentMethodId ?? null,
    clientId: data.clientId ?? null,
    notes: data.notes ?? null,
    date: data.date,
  }).where(eq(sales.id, id))

  await db.update(products)
    .set({ stock: sql`${products.stock} - ${data.quantity}`, updatedAt: new Date() })
    .where(eq(products.id, data.productId))

  // Recalculate totalSale for all rows in the group (handles multi-item sales)
  const [groupTotal] = await db
    .select({ total: sql<string>`sum(${sales.saleValue})` })
    .from(sales)
    .where(eq(sales.saleNumber, targetSaleNumber))

  if (groupTotal?.total) {
    await db
      .update(sales)
      .set({ totalSale: groupTotal.total })
      .where(eq(sales.saleNumber, targetSaleNumber))
  }

  // If saleNumber changed, also fix the old group's totalSale
  if (data.saleNumber !== undefined && data.saleNumber !== old.saleNumber) {
    const [oldGroupTotal] = await db
      .select({ total: sql<string>`sum(${sales.saleValue})` })
      .from(sales)
      .where(eq(sales.saleNumber, old.saleNumber))

    if (oldGroupTotal?.total) {
      await db
        .update(sales)
        .set({ totalSale: oldGroupTotal.total })
        .where(eq(sales.saleNumber, old.saleNumber))
    }
  }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}

export async function deleteSale(id: number) {
  const existing = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
  if (!existing[0]) throw new Error('Venta no encontrada')
  const { saleNumber, productId, quantity } = existing[0]

  await db.update(products)
    .set({ stock: sql`${products.stock} + ${quantity}`, updatedAt: new Date() })
    .where(eq(products.id, productId))
  await db.delete(sales).where(eq(sales.id, id))

  // Recalculate totalSale for remaining rows in the group
  const [groupTotal] = await db
    .select({ total: sql<string>`sum(${sales.saleValue})` })
    .from(sales)
    .where(eq(sales.saleNumber, saleNumber))

  if (groupTotal?.total) {
    await db
      .update(sales)
      .set({ totalSale: groupTotal.total })
      .where(eq(sales.saleNumber, saleNumber))
  }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/caja')
  await revalidateCatalog()
}
