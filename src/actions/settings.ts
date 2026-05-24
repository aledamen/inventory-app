'use server'

import { db } from '@/db'
import { config, categories, brands, flavors, paymentMethods, products, stockMovements, sales } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ── Config ─────────────────────────────────────────────────────────────────

export async function getConfig() {
  return db.select().from(config).orderBy(config.key)
}

export async function upsertConfig(key: string, value: string) {
  await db.insert(config).values({ key, value })
    .onConflictDoUpdate({ target: config.key, set: { value } })
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pricing')
}

// ── Lookups ────────────────────────────────────────────────────────────────

export async function getLookupsForSettings() {
  const [cats, brnds, flvrs, pms] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(brands).orderBy(brands.name),
    db.select().from(flavors).orderBy(flavors.name),
    db.select().from(paymentMethods).orderBy(paymentMethods.name),
  ])
  return { categories: cats, brands: brnds, flavors: flvrs, paymentMethods: pms }
}

export async function addCategory(name: string) {
  await db.insert(categories).values({ name }).onConflictDoNothing()
  revalidatePath('/dashboard/settings')
}
export async function deleteCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath('/dashboard/settings')
}

export async function addBrand(name: string) {
  await db.insert(brands).values({ name }).onConflictDoNothing()
  revalidatePath('/dashboard/settings')
}
export async function deleteBrand(id: number) {
  await db.delete(brands).where(eq(brands.id, id))
  revalidatePath('/dashboard/settings')
}

export async function addFlavor(name: string) {
  await db.insert(flavors).values({ name }).onConflictDoNothing()
  revalidatePath('/dashboard/settings')
}
export async function deleteFlavor(id: number) {
  await db.delete(flavors).where(eq(flavors.id, id))
  revalidatePath('/dashboard/settings')
}

export async function addPaymentMethod(name: string) {
  await db.insert(paymentMethods).values({ name }).onConflictDoNothing()
  revalidatePath('/dashboard/settings')
}
export async function deletePaymentMethod(id: number) {
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id))
  revalidatePath('/dashboard/settings')
}

// ── Recalcular stock ───────────────────────────────────────────────────────
// Espeja la función recalcularStock() del App Script:
// stock = sum(entradas) - sum(ventas) por SKU

export async function recalculateStock() {
  const allProducts = await db.select({ id: products.id }).from(products)

  for (const product of allProducts) {
    const [entriesRow, salesRow] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)` })
        .from(stockMovements)
        .where(eq(stockMovements.productId, product.id)),
      db.select({ total: sql<number>`coalesce(sum(${sales.quantity}), 0)` })
        .from(sales)
        .where(eq(sales.productId, product.id)),
    ])

    const newStock = Math.max(0, (entriesRow[0]?.total ?? 0) - (salesRow[0]?.total ?? 0))

    await db.update(products)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(eq(products.id, product.id))
  }

  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard')
}
