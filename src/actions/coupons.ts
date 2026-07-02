'use server'

import { db } from '@/db'
import { coupons, couponUses, influencers, socialNetworks } from '@/db/schema'
import { eq, desc, sql, isNotNull } from 'drizzle-orm'
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
  description?: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderAmount?: number | null
  maxUses?: number | null
  active?: boolean
  validFrom?: Date | null
  validTo?: Date | null
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
  | { valid: true; couponId: number; discountType: string; discountValue: number; discountAmount: number; finalAmount: number; influencerName: string | null; influencerHandle: string | null }
  | { valid: false; error: string }

export async function validateCoupon(code: string, amount: number): Promise<ValidateCouponResult> {
  const [coupon] = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      active: coupons.active,
      validFrom: coupons.validFrom,
      validTo: coupons.validTo,
      maxUses: coupons.maxUses,
      usesCount: coupons.usesCount,
      minOrderAmount: coupons.minOrderAmount,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
      influencerName: influencers.name,
      influencerHandle: influencers.socialUsername,
    })
    .from(coupons)
    .leftJoin(influencers, eq(coupons.influencerId, influencers.id))
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
    influencerName: coupon.influencerName ?? null,
    influencerHandle: coupon.influencerHandle ?? null,
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

export type InfluencerStat = {
  influencerId: number
  influencerName: string
  influencerHandle: string | null
  socialNetworkName: string | null
  couponCode: string
  couponId: number
  salesCount: number
  totalRevenue: number
  totalDiscount: number
  netRevenue: number
}

export type MonthlyStat = {
  month: string
  influencerName: string
  couponCode: string
  uses: number
  revenue: number
  discount: number
}

export type CouponUseDetail = {
  id: number
  couponCode: string | null
  influencerName: string | null
  clientName: string | null
  source: string
  originalAmount: number
  discountApplied: number
  finalAmount: number
  saleId: number | null
  usedAt: Date | null
}

export async function getCouponAnalytics(): Promise<{
  influencerStats: InfluencerStat[]
  monthlyStats: MonthlyStat[]
  useDetails: CouponUseDetail[]
}> {
  const { sales } = await import('@/db/schema')

  // Deduplicated sales with coupon (one row per sale_number)
  const salesAgg = await db
    .select({
      saleNumber: sales.saleNumber,
      couponId: sales.couponId,
      totalSale: sql<string>`MAX(${sales.totalSale})`,
      netProfit: sql<string>`SUM(${sales.netProfit})`,
      date: sql<Date>`MAX(${sales.date})`,
    })
    .from(sales)
    .where(isNotNull(sales.couponId))
    .groupBy(sales.saleNumber, sales.couponId)

  // coupon_uses with full detail
  const uses = await db
    .select({
      id: couponUses.id,
      couponId: couponUses.couponId,
      couponCode: coupons.code,
      influencerId: influencers.id,
      influencerName: influencers.name,
      influencerHandle: influencers.socialUsername,
      socialNetworkName: socialNetworks.name,
      clientName: couponUses.clientName,
      source: couponUses.source,
      originalAmount: couponUses.originalAmount,
      discountApplied: couponUses.discountApplied,
      finalAmount: couponUses.finalAmount,
      saleId: couponUses.saleId,
      usedAt: couponUses.usedAt,
    })
    .from(couponUses)
    .leftJoin(coupons, eq(couponUses.couponId, coupons.id))
    .leftJoin(influencers, eq(coupons.influencerId, influencers.id))
    .leftJoin(socialNetworks, eq(influencers.socialNetworkId, socialNetworks.id))
    .orderBy(desc(couponUses.usedAt))

  // All coupons with influencer
  const allCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      influencerId: coupons.influencerId,
      influencerName: influencers.name,
      influencerHandle: influencers.socialUsername,
      socialNetworkName: socialNetworks.name,
    })
    .from(coupons)
    .leftJoin(influencers, eq(coupons.influencerId, influencers.id))
    .leftJoin(socialNetworks, eq(influencers.socialNetworkId, socialNetworks.id))
    .where(isNotNull(coupons.influencerId))

  // Build influencer stats
  const statsMap = new Map<number, InfluencerStat>()
  for (const c of allCoupons) {
    if (!c.influencerId) continue
    const key = c.influencerId
    const salesForCoupon = salesAgg.filter(s => s.couponId === c.id)
    const totalRevenue = salesForCoupon.reduce((s, r) => s + Number(r.totalSale), 0)
    const totalDiscount = uses.filter(u => u.couponId === c.id).reduce((s, u) => s + Number(u.discountApplied), 0)
    const existing = statsMap.get(key)
    if (existing) {
      existing.salesCount += salesForCoupon.length
      existing.totalRevenue += totalRevenue
      existing.totalDiscount += totalDiscount
      existing.netRevenue = existing.totalRevenue - existing.totalDiscount
    } else {
      statsMap.set(key, {
        influencerId: c.influencerId,
        influencerName: c.influencerName ?? '',
        influencerHandle: c.influencerHandle ?? null,
        socialNetworkName: c.socialNetworkName ?? null,
        couponCode: c.code,
        couponId: c.id,
        salesCount: salesForCoupon.length,
        totalRevenue,
        totalDiscount,
        netRevenue: totalRevenue - totalDiscount,
      })
    }
  }

  // Monthly stats
  const monthlyMap = new Map<string, MonthlyStat>()
  for (const s of salesAgg) {
    if (!s.couponId) continue
    const c = allCoupons.find(c => c.id === s.couponId)
    if (!c?.influencerName) continue
    const month = new Date(s.date).toISOString().slice(0, 7)
    const key = `${month}-${c.id}`
    const existing = monthlyMap.get(key)
    const usesForSale = uses.filter(u => u.saleId === null && u.couponId === c.id)
    if (existing) {
      existing.revenue += Number(s.totalSale)
    } else {
      monthlyMap.set(key, {
        month,
        influencerName: c.influencerName ?? '',
        couponCode: c.code,
        uses: usesForSale.length,
        revenue: Number(s.totalSale),
        discount: uses.filter(u => u.couponId === c.id).reduce((sum, u) => sum + Number(u.discountApplied), 0),
      })
    }
  }

  return {
    influencerStats: Array.from(statsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue),
    monthlyStats: Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month)),
    useDetails: uses.map(u => ({
      id: u.id,
      couponCode: u.couponCode,
      influencerName: u.influencerName,
      clientName: u.clientName,
      source: u.source,
      originalAmount: Number(u.originalAmount),
      discountApplied: Number(u.discountApplied),
      finalAmount: Number(u.finalAmount),
      saleId: u.saleId,
      usedAt: u.usedAt,
    })),
  }
}
