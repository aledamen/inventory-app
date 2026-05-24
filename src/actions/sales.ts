'use server'

import { db } from '@/db'
import { sales, products, paymentMethods, pricing, flavors } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getSales() {
  return db
    .select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      date: sales.date,
      productSku: products.sku,
      productName: products.name,
      productFlavor: flavors.name,
      quantity: sales.quantity,
      effectivePrice: sales.effectivePrice,
      totalSale: sales.totalSale,
      netProfit: sales.netProfit,
      paymentMethod: paymentMethods.name,
      notes: sales.notes,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(sales.paymentMethodId, paymentMethods.id))
    .orderBy(desc(sales.date))
}

export async function createSale(data: {
  productId: number
  quantity: number
  effectivePrice: number
  paymentMethodId?: number
  notes?: string
  date: Date
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

  await db.transaction(async (tx) => {
    await tx.insert(sales).values({
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
      paymentMethodId: data.paymentMethodId,
      notes: data.notes,
      date: data.date,
    })

    await tx
      .update(products)
      .set({
        stock: sql`${products.stock} - ${data.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, data.productId))
  })

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
}
