'use server'

import { db } from '@/db'
import { categories, brands, flavors, paymentMethods } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getAllLookups() {
  const [cats, brnds, flvrs, payments] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(brands).orderBy(brands.name),
    db.select().from(flavors).orderBy(flavors.name),
    db.select().from(paymentMethods).orderBy(paymentMethods.name),
  ])
  return { categories: cats, brands: brnds, flavors: flvrs, paymentMethods: payments }
}

// ── Categories ──────────────────────────────────────────

export async function createCategory(name: string) {
  await db.insert(categories).values({ name })
  revalidatePath('/dashboard', 'layout')
}

export async function updateCategory(id: number, name: string) {
  await db.update(categories).set({ name }).where(eq(categories.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath('/dashboard', 'layout')
}

// ── Brands ──────────────────────────────────────────────

export async function createBrand(name: string) {
  await db.insert(brands).values({ name })
  revalidatePath('/dashboard', 'layout')
}

export async function updateBrand(id: number, name: string) {
  await db.update(brands).set({ name }).where(eq(brands.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteBrand(id: number) {
  await db.delete(brands).where(eq(brands.id, id))
  revalidatePath('/dashboard', 'layout')
}

// ── Flavors ─────────────────────────────────────────────

export async function createFlavor(name: string) {
  await db.insert(flavors).values({ name })
  revalidatePath('/dashboard', 'layout')
}

export async function updateFlavor(id: number, name: string) {
  await db.update(flavors).set({ name }).where(eq(flavors.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteFlavor(id: number) {
  await db.delete(flavors).where(eq(flavors.id, id))
  revalidatePath('/dashboard', 'layout')
}
