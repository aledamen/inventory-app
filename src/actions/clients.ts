'use server'

import { db } from '@/db'
import { clients, sales } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  return db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    email: clients.email,
    address: clients.address,
    notes: clients.notes,
    createdAt: clients.createdAt,
    totalSales: sql<number>`count(${sales.id})`,
    totalSpent: sql<string>`coalesce(sum(${sales.saleValue}), 0)`,
    lastPurchase: sql<Date | null>`max(${sales.date})`,
  })
    .from(clients)
    .leftJoin(sales, eq(clients.id, sales.clientId))
    .groupBy(clients.id)
    .orderBy(desc(sql`sum(${sales.saleValue})`))
}

export async function getClientById(id: number) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  return client ?? null
}

export async function getClientSales(clientId: number) {
  const { products, flavors, paymentMethods } = await import('@/db/schema')
  return db.select({
    id: sales.id,
    saleNumber: sales.saleNumber,
    date: sales.date,
    productName: products.name,
    productFlavor: flavors.name,
    quantity: sales.quantity,
    saleValue: sales.saleValue,
    netProfit: sales.netProfit,
    paymentMethod: paymentMethods.name,
  })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(sales.paymentMethodId, paymentMethods.id))
    .where(eq(sales.clientId, clientId))
    .orderBy(desc(sales.date))
}

export async function createClient(data: {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}) {
  await db.insert(clients).values(data)
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/returns')
}

export async function updateClient(id: number, data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}) {
  await db.update(clients).set(data).where(eq(clients.id, id))
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/returns')
}

export async function deleteClient(id: number) {
  await db.delete(clients).where(eq(clients.id, id))
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/orders')
  revalidatePath('/dashboard/returns')
}
