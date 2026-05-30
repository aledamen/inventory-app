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

  await db.update(sales).set({
    ...(data.saleNumber !== undefined ? { saleNumber: data.saleNumber } : {}),
    productId: data.productId,
    quantity: data.quantity,
    effectivePrice: String(data.effectivePrice),
    saleValue: String(saleValue),
    totalSale: String(saleValue),
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

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  await revalidateCatalog()
}

export async function deleteSale(id: number) {
  const existing = await db.select().from(sales).where(eq(sales.id, id)).limit(1)
  if (!existing[0]) throw new Error('Venta no encontrada')

  await db.update(products)
    .set({ stock: sql`${products.stock} + ${existing[0].quantity}`, updatedAt: new Date() })
    .where(eq(products.id, existing[0].productId))
  await db.delete(sales).where(eq(sales.id, id))

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/clients')
  await revalidateCatalog()
}
