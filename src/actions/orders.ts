'use server'

import { db } from '@/db'
import { orders, orderItems, products, clients, paymentMethods } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getOrders() {
  return db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    date: orders.date,
    status: orders.status,
    totalAmount: orders.totalAmount,
    notes: orders.notes,
    clientName: clients.name,
    clientPhone: clients.phone,
    paymentMethod: paymentMethods.name,
    itemCount: sql<number>`count(${orderItems.id})`,
  })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .leftJoin(paymentMethods, eq(orders.paymentMethodId, paymentMethods.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .groupBy(orders.id, clients.name, clients.phone, paymentMethods.name)
    .orderBy(desc(orders.date))
}

export async function getOrderById(id: number) {
  const { flavors } = await import('@/db/schema')
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      date: orders.date,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      clientId: orders.clientId,
      clientName: clients.name,
      clientPhone: clients.phone,
      paymentMethod: paymentMethods.name,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .leftJoin(paymentMethods, eq(orders.paymentMethodId, paymentMethods.id))
    .where(eq(orders.id, id))

  const items = await db.select({
    id: orderItems.id,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    productName: products.name,
    productFlavor: flavors.name,
    productSku: products.sku,
    productStock: products.stock,
  })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .where(eq(orderItems.orderId, id))

  return { ...order, items }
}

export async function createOrder(data: {
  clientId?: number
  paymentMethodId?: number
  notes?: string
  date: Date
  items: { productId: number; quantity: number; unitPrice: number }[]
}) {
  const total = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  const [lastOrder] = await db
    .select({ max: sql<number>`coalesce(max(${orders.orderNumber}), 0)` })
    .from(orders)
  const orderNumber = (lastOrder?.max ?? 0) + 1

  await db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values({
      orderNumber,
      clientId: data.clientId,
      paymentMethodId: data.paymentMethodId,
      notes: data.notes,
      totalAmount: String(total),
      date: data.date,
    }).returning({ id: orders.id })

    await tx.insert(orderItems).values(
      data.items.map(i => ({
        orderId: order.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: String(i.unitPrice),
      }))
    )
  })
  revalidatePath('/dashboard/orders')
}

export async function updateOrderStatus(id: number, status: string) {
  await db.update(orders).set({ status }).where(eq(orders.id, id))
  revalidatePath('/dashboard/orders')
}

export async function deleteOrder(id: number) {
  await db.transaction(async (tx) => {
    await tx.delete(orderItems).where(eq(orderItems.orderId, id))
    await tx.delete(orders).where(eq(orders.id, id))
  })
  revalidatePath('/dashboard/orders')
}
