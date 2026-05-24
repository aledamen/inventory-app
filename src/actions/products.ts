'use server'

import { db } from '@/db'
import { products, categories, brands, flavors } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      flavor: flavors.name,
      weightG: products.weightG,
      cost: products.cost,
      stock: products.stock,
      stockMin: products.stockMin,
      imageUrl: products.imageUrl,
      visible: products.visible,
      notes: products.notes,
      type: products.type,
      bagAssigned: products.bagAssigned,
      category: categories.name,
      brand: brands.name,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .orderBy(products.name)
}

export async function getLookups() {
  const [cats, brnds, flvrs] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(brands).orderBy(brands.name),
    db.select().from(flavors).orderBy(flavors.name),
  ])
  return { categories: cats, brands: brnds, flavors: flvrs }
}

export async function createProduct(data: {
  sku: string
  name: string
  cost: number
  categoryId?: number
  brandId?: number
  flavorId?: number
  weightG?: number
  stockMin?: number
  type?: string
  bagAssigned?: string
  notes?: string
}) {
  await db.insert(products).values({
    ...data,
    cost: String(data.cost),
    stock: 0,
  })
  revalidatePath('/dashboard/products')
}

export async function updateProduct(id: number, data: Partial<{
  name: string
  cost: number
  categoryId: number
  brandId: number
  flavorId: number
  weightG: number
  stockMin: number
  type: string
  bagAssigned: string
  notes: string
  visible: boolean
  imageUrl: string
}>) {
  const { cost, ...rest } = data
  await db.update(products).set({
    ...rest,
    ...(cost !== undefined ? { cost: String(cost) } : {}),
    updatedAt: new Date(),
  }).where(eq(products.id, id))
  revalidatePath('/dashboard/products')
}

export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id))
  revalidatePath('/dashboard/products')
}
