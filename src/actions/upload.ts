'use server'

import { put, del } from '@vercel/blob'
import { db } from '@/db'
import { products } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function uploadProductImage(productId: number, formData: FormData) {
  const file = formData.get('file') as File
  if (!file || !file.size) throw new Error('No file provided')

  const [existing] = await db
    .select({ imageUrl: products.imageUrl, sku: products.sku })
    .from(products)
    .where(eq(products.id, productId))

  // Delete old blob if it's a Vercel Blob URL
  if (existing?.imageUrl?.includes('vercel-storage.com')) {
    await del(existing.imageUrl).catch(() => null)
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const blob = await put(`products/${existing?.sku ?? productId}.${ext}`, file, {
    access: 'public',
    contentType: file.type,
  })

  await db
    .update(products)
    .set({ imageUrl: blob.url })
    .where(eq(products.id, productId))

  revalidatePath('/dashboard/products')
  return blob.url
}

export async function deleteProductImage(productId: number) {
  const [existing] = await db
    .select({ imageUrl: products.imageUrl })
    .from(products)
    .where(eq(products.id, productId))

  if (existing?.imageUrl?.includes('vercel-storage.com')) {
    await del(existing.imageUrl).catch(() => null)
  }

  await db
    .update(products)
    .set({ imageUrl: null })
    .where(eq(products.id, productId))

  revalidatePath('/dashboard/products')
}

export async function toggleProductVisible(productId: number, visible: boolean) {
  await db
    .update(products)
    .set({ visible })
    .where(eq(products.id, productId))

  revalidatePath('/dashboard/products')
  revalidatePath('/api/catalog')
}
