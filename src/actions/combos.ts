'use server'

import { db } from '@/db'
import { combos, comboItems, products, pricing, flavors, banners, sales, paymentMethods } from '@/db/schema'
import { eq, inArray, sql, or, and } from 'drizzle-orm'
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
    productId: number | null
    productGroupName: string | null
    productGroupWeight: number | null
    productName: string | null
    productSku: string | null
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
      productGroupName: comboItems.productGroupName,
      productGroupWeight: comboItems.productGroupWeight,
      quantity: comboItems.quantity,
      productName: products.name,
      productSku: products.sku,
      productFlavor: flavors.name,
      stock: products.stock,
      unitCost: pricing.totalCost,
    })
    .from(comboItems)
    .leftJoin(products, eq(comboItems.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .where(inArray(comboItems.comboId, comboIds))

  // Pre-fetch total stock for group slots, keyed by "name||weight"
  const groupSlots = itemRows.filter(r => r.productGroupName)
  const groupStockMap = new Map<string, number>()
  if (groupSlots.length > 0) {
    const conditions = groupSlots.map(r =>
      r.productGroupWeight
        ? and(eq(products.name, r.productGroupName!), eq(products.weightG, r.productGroupWeight))
        : eq(products.name, r.productGroupName!)
    )
    const rows = await db
      .select({ name: products.name, weightG: products.weightG, total: sql<number>`sum(${products.stock})` })
      .from(products)
      .where(or(...conditions))
      .groupBy(products.name, products.weightG)
    for (const r of rows) groupStockMap.set(`${r.name}||${r.weightG ?? ''}`, Number(r.total))
    // Null-weight slots look up by "name||" — sum all variants for that name
    for (const slot of groupSlots) {
      if (!slot.productGroupWeight) {
        const key = `${slot.productGroupName}||`
        if (!groupStockMap.has(key)) {
          let total = 0
          for (const [k, v] of groupStockMap) {
            if (k.startsWith(`${slot.productGroupName}||`)) total += v
          }
          groupStockMap.set(key, total)
        }
      }
    }
  }

  // Group items by comboId
  const itemsByCombo = new Map<number, ComboFull['items']>()
  for (const row of itemRows) {
    const list = itemsByCombo.get(row.comboId) ?? []
    list.push({
      id: row.itemId,
      productId: row.productId ?? null,
      productGroupName: row.productGroupName ?? null,
      productGroupWeight: row.productGroupWeight ?? null,
      productName: row.productName ?? null,
      productSku: row.productSku ?? null,
      productFlavor: row.productFlavor ?? null,
      quantity: row.quantity,
      stock: row.productGroupName
        ? (groupStockMap.get(`${row.productGroupName}||${row.productGroupWeight ?? ''}`) ?? 0)
        : (row.stock ?? 0),
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
  badge?: string | null
  featured?: boolean
  visible?: boolean
  priceEffective: number
  priceTransfer?: number
  priceList?: number
  notes?: string
  bannerId?: number | null
  items: { productId?: number; productGroupName?: string; productGroupWeight?: number; quantity: number }[]
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
        productId: item.productId ?? null,
        productGroupName: item.productGroupName ?? null,
        productGroupWeight: item.productGroupWeight ?? null,
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
      ...('badge' in data && { badge: data.badge ?? null }),
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
          productId: item.productId ?? null,
          productGroupName: item.productGroupName ?? null,
          productGroupWeight: item.productGroupWeight ?? null,
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

export async function createComboSale(data: {
  comboId: number
  quantity: number
  effectivePrice: number
  paymentMethodId?: number
  notes?: string
  date: Date
  clientId?: number
  groupSelections: { itemId: number; productId: number }[]
}) {
  const items = await db
    .select({
      itemId: comboItems.id,
      productId: comboItems.productId,
      productGroupName: comboItems.productGroupName,
      productGroupWeight: comboItems.productGroupWeight,
      quantity: comboItems.quantity,
      unitCost: pricing.totalCost,
      unitPrice: pricing.priceCashRounded,
    })
    .from(comboItems)
    .leftJoin(products, eq(comboItems.productId, products.id))
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .where(eq(comboItems.comboId, data.comboId))

  if (items.length === 0) throw new Error('Combo sin productos configurados')

  // Resolve each item: fixed → productId as-is; group → use groupSelection
  type ResolvedItem = typeof items[number] & { resolvedProductId: number; resolvedUnitCost: string | null; resolvedUnitPrice: number | null }
  const resolved: ResolvedItem[] = []

  for (const item of items) {
    let resolvedProductId: number
    let resolvedUnitCost = item.unitCost
    let resolvedUnitPrice = item.unitPrice

    if (item.productGroupName) {
      const sel = data.groupSelections.find(s => s.itemId === item.itemId)
      if (!sel) throw new Error('Falta seleccionar variante para un slot de grupo')
      resolvedProductId = sel.productId
      const p = await db
        .select({ cost: pricing.totalCost, price: pricing.priceCashRounded })
        .from(products)
        .leftJoin(pricing, eq(products.id, pricing.productId))
        .where(eq(products.id, resolvedProductId))
        .limit(1)
      resolvedUnitCost = p[0]?.cost ?? null
      resolvedUnitPrice = p[0]?.price ?? null
    } else {
      resolvedProductId = item.productId!
    }

    const prod = await db.select({ stock: products.stock }).from(products).where(eq(products.id, resolvedProductId)).limit(1)
    if (!prod[0] || prod[0].stock < item.quantity * data.quantity) {
      throw new Error('Stock insuficiente para uno de los productos del combo')
    }

    resolved.push({ ...item, resolvedProductId, resolvedUnitCost, resolvedUnitPrice })
  }

  // Split combo price proportional to individual prices
  const totalIndividualValue = resolved.reduce((s, i) => s + i.quantity * (i.resolvedUnitPrice ?? 0), 0)

  const lastNum = await db.select({ max: sql<number>`max(${sales.saleNumber})` }).from(sales)
  const nextNum = (lastNum[0]?.max ?? 0) + 1

  for (const item of resolved) {
    const unitItemValue = item.quantity * (item.resolvedUnitPrice ?? 0)
    const share = totalIndividualValue > 0 ? unitItemValue / totalIndividualValue : 1 / resolved.length
    const effectivePerUnit = (data.effectivePrice * share) / item.quantity
    const totalQty = item.quantity * data.quantity
    const totalCostLine = Number(item.resolvedUnitCost ?? 0) * totalQty
    const saleValue = effectivePerUnit * totalQty
    const netProfit = saleValue - totalCostLine

    await db.insert(sales).values({
      saleNumber: nextNum,
      type: 'salida',
      productId: item.resolvedProductId,
      quantity: totalQty,
      effectivePrice: String(effectivePerUnit),
      saleValue: String(saleValue),
      totalSale: String(data.effectivePrice * data.quantity),
      totalCost: String(totalCostLine),
      netProfit: String(netProfit),
      grossProfit: String(saleValue),
      clientId: data.clientId ?? null,
      paymentMethodId: data.paymentMethodId ?? null,
      notes: data.notes ?? null,
      date: data.date,
    })

    await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${totalQty}`, updatedAt: new Date() })
      .where(eq(products.id, item.resolvedProductId))
  }

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard')
}
