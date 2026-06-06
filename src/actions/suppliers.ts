'use server'

import { db } from '@/db'
import { suppliers, stockMovements } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getSuppliers() {
  return db.select({
    id: suppliers.id,
    name: suppliers.name,
    phone: suppliers.phone,
    email: suppliers.email,
    address: suppliers.address,
    contactName: suppliers.contactName,
    notes: suppliers.notes,
    createdAt: suppliers.createdAt,
    totalOrders: sql<number>`count(${stockMovements.id})`,
    totalInvested: sql<string>`coalesce(sum(${stockMovements.total}), 0)`,
    lastOrder: sql<Date | null>`max(${stockMovements.date})`,
  })
    .from(suppliers)
    .leftJoin(stockMovements, eq(suppliers.id, stockMovements.supplierId))
    .groupBy(suppliers.id)
    .orderBy(desc(sql`sum(${stockMovements.total})`))
}

export async function getSupplierById(id: number) {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id))
  return supplier ?? null
}

export async function getSupplierMovements(supplierId: number) {
  const { products, flavors, paymentMethods } = await import('@/db/schema')
  return db.select({
    id: stockMovements.id,
    movementNumber: stockMovements.movementNumber,
    date: stockMovements.date,
    productName: products.name,
    productFlavor: flavors.name,
    quantity: stockMovements.quantity,
    unitCost: stockMovements.unitCost,
    total: stockMovements.total,
    paymentMethod: paymentMethods.name,
    note: stockMovements.note,
  })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(stockMovements.paymentMethodId, paymentMethods.id))
    .where(eq(stockMovements.supplierId, supplierId))
    .orderBy(desc(stockMovements.date))
}

export async function createSupplier(data: {
  name: string
  phone?: string
  email?: string
  address?: string
  contactName?: string
  notes?: string
}) {
  await db.insert(suppliers).values(data)
  revalidatePath('/dashboard', 'layout')
}

export async function updateSupplier(id: number, data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  contactName?: string | null
  notes?: string | null
}) {
  await db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(eq(suppliers.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteSupplier(id: number) {
  await db.delete(suppliers).where(eq(suppliers.id, id))
  revalidatePath('/dashboard', 'layout')
}
