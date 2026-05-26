'use server'

import { db } from '@/db'
import { combos, comboItems, products, pricing, flavors, banners } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { put, del } from '@vercel/blob'

export type ComboFull = {
  id: number
  sku: string
  name: string
  description: string | null
  badge: string | null
  featured: boolean
  visible: boolean
  imageUrl: string | null
  priceEffective: string
  priceTransfer: string | null
  priceList: string | null
  notes: string | null
  bannerId: number | null
  bannerName: string | null
  bannerColor: string | null
  bannerTextColor: string | null
  bannerPosition: string | null
  createdAt: Date | null
  updatedAt: Date | null
  availableStock: number
  items: {
    id: number
    productId: number
    productName: string
    productSku: string
    productFlavor: string | null
    quantity: number
    stock: number
    unitCost: string | null
  }[]
}

export async function getCombosFull(): Promise<ComboFull[]> {
  const allCombos = await db
    .select({
      id: combos.id,
      sku: combos.sku,
      name: combos.name,
      description: combos.description,
      badge: combos.badge,
      featured: combos.featured,
      visible: combos.visible,
      imageUrl: combos.imageUrl,
      priceEffective: combos.priceEffective,
      priceTransfer: combos.priceTransfer,
      priceList: combos.priceList,
      notes: combos.notes,
      bannerId: combos.bannerId,
      bannerName: banners.name,
      bannerColor: banners.color,
      bannerTextColor: banners.textColor,
      bannerPosition: banners.position,
      createdAt: combos.createdAt,
      updatedAt: combos.updatedAt,
    })
    .from(combos)
    .leftJoin(banners, eq(combos.bannerId, banners.id))
    .orderBy(combos.name)
  if (allCombos.length === 0) return []

  const comboIds = allCombos.map(c => c.id)

  const itemRows = await db
    .select({
      itemId: comboItems.id,
      comboId: comboItems.comboId,
      productId: comboItems.productId,
      quantity: comboItems.quantity,
      productName: products.name,
      productSku: products.sku,
      productFlavor: flavors.name,
      stock: products.stock,
      unitCost: pricing.totalCost,
    })
    .from(comboItems)
    .innerJoin(products, eq(comboItems.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .where(inArray(comboItems.comboId, comboIds))

  // Group items by comboId
  const itemsByCombo = new Map<number, ComboFull['items']>()
  for (const row of itemRows) {
    const list = itemsByCombo.get(row.comboId) ?? []
    list.push({
      id: row.itemId,
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      productFlavor: row.productFlavor ?? null,
      quantity: row.quantity,
      stock: row.stock,
      unitCost: row.unitCost ?? null,
    })
    itemsByCombo.set(row.comboId, list)
  }

  return allCombos.map(combo => {
    const items = itemsByCombo.get(combo.id) ?? []
    const availableStock = items.length === 0
      ? 0
      : Math.min(...items.map(item => Math.floor(item.stock / item.quantity)))
    return {
      id: combo.id,
      sku: combo.sku,
      name: combo.name,
      description: combo.description,
      badge: combo.badge,
      featured: combo.featured,
      visible: combo.visible,
      imageUrl: combo.imageUrl,
      priceEffective: combo.priceEffective,
      priceTransfer: combo.priceTransfer,
      priceList: combo.priceList,
      notes: combo.notes,
      bannerId: combo.bannerId ?? null,
      bannerName: combo.bannerName ?? null,
      bannerColor: combo.bannerColor ?? null,
      bannerTextColor: combo.bannerTextColor ?? null,
      bannerPosition: combo.bannerPosition ?? null,
      createdAt: combo.createdAt,
      updatedAt: combo.updatedAt,
      availableStock,
      items,
    }
  })
}

type ComboInput = {
  sku: string
  name: string
  description?: string
  badge?: string
  featured?: boolean
  visible?: boolean
  priceEffective: number
  priceTransfer?: number
  priceList?: number
  notes?: string
  bannerId?: number | null
  items: { productId: number; quantity: number }[]
}

export async function createCombo(data: ComboInput): Promise<{ id: number }> {
  const [combo] = await db
    .insert(combos)
    .values({
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      badge: data.badge ?? null,
      featured: data.featured ?? false,
      visible: data.visible ?? false,
      priceEffective: String(data.priceEffective),
      priceTransfer: data.priceTransfer != null ? String(data.priceTransfer) : null,
      priceList: data.priceList != null ? String(data.priceList) : null,
      notes: data.notes ?? null,
      bannerId: data.bannerId ?? null,
    })
    .returning({ id: combos.id })

  if (data.items.length > 0) {
    await db.insert(comboItems).values(
      data.items.map(item => ({
        comboId: combo.id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    )
  }

  revalidatePath('/dashboard/combos')
  revalidatePath('/api/catalog')
  return { id: combo.id }
}

export async function updateCombo(id: number, data: Partial<ComboInput>) {
  await db
    .update(combos)
    .set({
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.badge !== undefined && { badge: data.badge }),
      ...(data.featured !== undefined && { featured: data.featured }),
      ...(data.visible !== undefined && { visible: data.visible }),
      ...(data.priceEffective !== undefined && { priceEffective: String(data.priceEffective) }),
      ...(data.priceTransfer !== undefined && { priceTransfer: data.priceTransfer != null ? String(data.priceTransfer) : null }),
      ...(data.priceList !== undefined && { priceList: data.priceList != null ? String(data.priceList) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...('bannerId' in data && { bannerId: data.bannerId ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(combos.id, id))

  if (data.items !== undefined) {
    await db.delete(comboItems).where(eq(comboItems.comboId, id))
    if (data.items.length > 0) {
      await db.insert(comboItems).values(
        data.items.map(item => ({
          comboId: id,
          productId: item.productId,
          quantity: item.quantity,
        }))
      )
    }
  }

  revalidatePath('/dashboard/combos')
  revalidatePath('/api/catalog')
}

export async function deleteCombo(id: number) {
  await db.delete(combos).where(eq(combos.id, id))
  revalidatePath('/dashboard/combos')
  revalidatePath('/api/catalog')
}

export async function toggleComboVisible(id: number, visible: boolean) {
  await db.update(combos).set({ visible, updatedAt: new Date() }).where(eq(combos.id, id))
  revalidatePath('/dashboard/combos')
  revalidatePath('/api/catalog')
}

export async function uploadComboImage(comboId: number, formData: FormData) {
  const file = formData.get('file') as File
  if (!file || !file.size) throw new Error('No file provided')

  const [existing] = await db
    .select({ imageUrl: combos.imageUrl, sku: combos.sku })
    .from(combos)
    .where(eq(combos.id, comboId))

  if (existing?.imageUrl?.includes('vercel-storage.com')) {
    await del(existing.imageUrl).catch(() => null)
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const blob = await put(`combos/${existing?.sku ?? comboId}.${ext}`, file, {
    access: 'public',
    contentType: file.type,
  })

  await db.update(combos).set({ imageUrl: blob.url }).where(eq(combos.id, comboId))
  revalidatePath('/dashboard/combos')
  return blob.url
}
