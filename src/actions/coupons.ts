'use server'

import { db } from '@/db'
import { coupons, couponUses, influencers } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type CouponFull = {
  id: number
  code: string
  description: string | null
  discountType: string
  discountValue: string
  minOrderAmount: string | null
  maxUses: number | null
  usesCount: number
  active: boolean
  validFrom: Date | null
  validTo: Date | null
  influencerId: number | null
  influencerName: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type CouponUse = {
  id: number
  couponId: number
  couponCode: string | null
  saleId: number | null
  source: string
  originalAmount: string
  discountApplied: string
  finalAmount: string
  clientName: string | null
  clientPhone: string | null
  usedAt: Date | null
}

export async function getCoupons(): Promise<CouponFull[]> {
  const rows = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      description: coupons.description,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      minOrderAmount: coupons.minOrderAmount,
      maxUses: coupons.maxUses,
      usesCount: coupons.usesCount,
      active: coupons.active,
      validFrom: coupons.validFrom,
      validTo: coupons.validTo,
      influencerId: coupons.influencerId,
      influencerName: influencers.name,
      createdAt: coupons.createdAt,
      updatedAt: coupons.updatedAt,
    })
    .from(coupons)
    .leftJoin(influencers, eq(coupons.influencerId, influencers.id))
    .orderBy(coupons.code)
  return rows
}

export async function getCouponUses(couponId?: number): Promise<CouponUse[]> {
  const rows = await db
    .select({
      id: couponUses.id,
      couponId: couponUses.couponId,
      couponCode: coupons.code,
      saleId: couponUses.saleId,
      source: couponUses.source,
      originalAmount: couponUses.originalAmount,
      discountApplied: couponUses.discountApplied,
      finalAmount: couponUses.finalAmount,
      clientName: couponUses.clientName,
      clientPhone: couponUses.clientPhone,
      usedAt: couponUses.usedAt,
    })
    .from(couponUses)
    .leftJoin(coupons, eq(couponUses.couponId, coupons.id))
    .orderBy(desc(couponUses.usedAt))

  if (couponId) return rows.filter(r => r.couponId === couponId)
  return rows
}

export async function createCoupon(data: {
  code: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  active?: boolean
  validFrom?: Date
  validTo?: Date
  influencerId?: number | null
}) {
  await db.insert(coupons).values({
    code: data.code.toUpperCase().trim(),
    description: data.description ?? null,
    discountType: data.discountType,
    discountValue: String(data.discountValue),
    minOrderAmount: data.minOrderAmount != null ? String(data.minOrderAmount) : null,
    maxUses: data.maxUses ?? null,
    active: data.active ?? true,
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    influencerId: data.influencerId ?? null,
  })
  revalidatePath('/dashboard', 'layout')
}

export async function updateCoupon(id: number, data: {
  code?: string
  description?: string | null
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  minOrderAmount?: number | null
  maxUses?: number | null
  active?: boolean
  validFrom?: Date | null
  validTo?: Date | null
  influencerId?: number | null
}) {
  await db.update(coupons).set({
    ...(data.code !== undefined && { code: data.code.toUpperCase().trim() }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.discountType !== undefined && { discountType: data.discountType }),
    ...(data.discountValue !== undefined && { discountValue: String(data.discountValue) }),
    ...('minOrderAmount' in data && { minOrderAmount: data.minOrderAmount != null ? String(data.minOrderAmount) : null }),
    ...('maxUses' in data && { maxUses: data.maxUses }),
    ...(data.active !== undefined && { active: data.active }),
    ...('validFrom' in data && { validFrom: data.validFrom }),
    ...('validTo' in data && { validTo: data.validTo }),
    ...('influencerId' in data && { influencerId: data.influencerId }),
    updatedAt: new Date(),
  }).where(eq(coupons.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteCoupon(id: number) {
  await db.delete(coupons).where(eq(coupons.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function toggleCouponActive(id: number, active: boolean) {
  await db.update(coupons).set({ active, updatedAt: new Date() }).where(eq(coupons.id, id))
  revalidatePath('/dashboard', 'layout')
}

export type ValidateCouponResult =
  | { valid: true; couponId: number; discountType: string; discountValue: number; discountAmount: number; finalAmount: number }
  | { valid: false; error: string }

export async function validateCoupon(code: string, amount: number): Promise<ValidateCouponResult> {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.toUpperCase().trim()))
    .limit(1)

  if (!coupon) return { valid: false, error: 'Cupón no encontrado' }
  if (!coupon.active) return { valid: false, error: 'Cupón inactivo' }

  const now = new Date()
  if (coupon.validFrom && now < coupon.validFrom) return { valid: false, error: 'El cupón aún no está vigente' }
  if (coupon.validTo && now > coupon.validTo) return { valid: false, error: 'El cupón expiró' }
  if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) return { valid: false, error: 'El cupón agotó sus usos' }
  if (coupon.minOrderAmount && amount < Number(coupon.minOrderAmount)) {
    return { valid: false, error: `Monto mínimo: $${Number(coupon.minOrderAmount).toLocaleString('es-AR')}` }
  }

  const discountValue = Number(coupon.discountValue)
  const discountAmount = coupon.discountType === 'percentage'
    ? Math.round(amount * discountValue / 100)
    : Math.min(discountValue, amount)

  return {
    valid: true,
    couponId: coupon.id,
    discountType: coupon.discountType,
    discountValue,
    discountAmount,
    finalAmount: amount - discountAmount,
  }
}

export async function recordCouponUse(data: {
  couponId: number
  saleId?: number
  source: 'catalog' | 'manual'
  originalAmount: number
  discountApplied: number
  finalAmount: number
  clientName?: string
  clientPhone?: string
}) {
  await db.insert(couponUses).values({
    couponId: data.couponId,
    saleId: data.saleId ?? null,
    source: data.source,
    originalAmount: String(data.originalAmount),
    discountApplied: String(data.discountApplied),
    finalAmount: String(data.finalAmount),
    clientName: data.clientName ?? null,
    clientPhone: data.clientPhone ?? null,
  })
  await db.update(coupons)
    .set({ usesCount: sql`${coupons.usesCount} + 1` })
    .where(eq(coupons.id, data.couponId))
}
