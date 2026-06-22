'use server'

import { db } from '@/db'
import {
  influencers, socialNetworks, coupons,
  influencerCompensationRules, influencerPosts, influencerDeliveries,
} from '@/db/schema'
import { eq, desc, isNotNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompensationRule = {
  id: number
  influencerId: number
  trigger: string
  triggerValue: string | null
  rewardProductId: number | null
  rewardQuantity: number
  active: boolean
  notes: string | null
  createdAt: Date | null
}

export type InfluencerPost = {
  id: number
  influencerId: number
  postDate: string
  socialNetworkId: number | null
  socialNetworkName: string | null
  contentType: string
  url: string | null
  notes: string | null
  compensated: boolean
  createdAt: Date | null
}

export type InfluencerDelivery = {
  id: number
  influencerId: number
  deliveryDate: string
  productId: number | null
  productName: string
  quantity: number
  trigger: string
  triggerRef: string | null
  status: string
  notes: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type MilestoneProgress = {
  ruleId: number
  trigger: string
  triggerValue: number | null
  currentSalesCount: number
  currentRevenue: number
  rewardProductId: number | null
  rewardQuantity: number
  notes: string | null
  reached: boolean
  pendingDeliveries: number
}

export type InfluencerProfile = {
  id: number
  name: string
  socialNetworkId: number | null
  socialNetworkName: string | null
  socialUsername: string | null
  notes: string | null
  active: boolean
  couponCode: string | null
  rules: CompensationRule[]
  posts: InfluencerPost[]
  deliveries: InfluencerDelivery[]
  milestones: MilestoneProgress[]
  totalSalesCount: number
  totalRevenue: number
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getInfluencerProfile(id: number): Promise<InfluencerProfile | null> {
  const [influencer] = await db
    .select({
      id: influencers.id,
      name: influencers.name,
      socialNetworkId: influencers.socialNetworkId,
      socialNetworkName: socialNetworks.name,
      socialUsername: influencers.socialUsername,
      notes: influencers.notes,
      active: influencers.active,
    })
    .from(influencers)
    .leftJoin(socialNetworks, eq(influencers.socialNetworkId, socialNetworks.id))
    .where(eq(influencers.id, id))
    .limit(1)

  if (!influencer) return null

  // Get their coupon code (first active one)
  const [coupon] = await db
    .select({ code: coupons.code })
    .from(coupons)
    .where(eq(coupons.influencerId, id))
    .orderBy(coupons.active)
    .limit(1)

  const [rules, posts, deliveries] = await Promise.all([
    db.select().from(influencerCompensationRules)
      .where(eq(influencerCompensationRules.influencerId, id))
      .orderBy(influencerCompensationRules.createdAt),
    db
      .select({
        id: influencerPosts.id,
        influencerId: influencerPosts.influencerId,
        postDate: influencerPosts.postDate,
        socialNetworkId: influencerPosts.socialNetworkId,
        socialNetworkName: socialNetworks.name,
        contentType: influencerPosts.contentType,
        url: influencerPosts.url,
        notes: influencerPosts.notes,
        compensated: influencerPosts.compensated,
        createdAt: influencerPosts.createdAt,
      })
      .from(influencerPosts)
      .leftJoin(socialNetworks, eq(influencerPosts.socialNetworkId, socialNetworks.id))
      .where(eq(influencerPosts.influencerId, id))
      .orderBy(desc(influencerPosts.postDate)),
    db.select().from(influencerDeliveries)
      .where(eq(influencerDeliveries.influencerId, id))
      .orderBy(desc(influencerDeliveries.deliveryDate)),
  ])

  // Sales stats via coupons (dynamic import to avoid circular)
  const { sales } = await import('@/db/schema')
  const couponIds = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.influencerId, id))

  let totalSalesCount = 0
  let totalRevenue = 0

  if (couponIds.length > 0) {
    for (const c of couponIds) {
      const [agg] = await db
        .select({
          count: sql<number>`count(distinct ${sales.saleNumber})`,
          revenue: sql<number>`coalesce(sum(distinct ${sales.totalSale}::numeric), 0)`,
        })
        .from(sales)
        .where(eq(sales.couponId, c.id))
      totalSalesCount += Number(agg?.count ?? 0)
      totalRevenue += Number(agg?.revenue ?? 0)
    }
  }

  // Milestone progress per rule
  const milestones: MilestoneProgress[] = rules
    .filter(r => r.trigger !== 'per_post')
    .map(r => {
      const threshold = r.triggerValue ? Number(r.triggerValue) : null
      const current = r.trigger === 'sales_count' ? totalSalesCount : totalRevenue
      const pendingDeliveries = deliveries.filter(
        d => d.status === 'pending' && d.trigger === (r.trigger === 'sales_count' ? 'milestone_sales' : 'milestone_revenue')
      ).length
      return {
        ruleId: r.id,
        trigger: r.trigger,
        triggerValue: threshold,
        currentSalesCount: totalSalesCount,
        currentRevenue: totalRevenue,
        rewardProductId: r.rewardProductId,
        rewardQuantity: r.rewardQuantity,
        notes: r.notes,
        reached: threshold != null ? current >= threshold : false,
        pendingDeliveries,
      }
    })

  return {
    ...influencer,
    couponCode: coupon?.code ?? null,
    rules,
    posts,
    deliveries,
    milestones,
    totalSalesCount,
    totalRevenue,
  }
}

// ─── Compensation Rules ───────────────────────────────────────────────────────

export async function createCompensationRule(data: {
  influencerId: number
  trigger: string
  triggerValue?: number | null
  rewardProductId?: number | null
  rewardQuantity?: number
  notes?: string | null
}) {
  await db.insert(influencerCompensationRules).values({
    influencerId: data.influencerId,
    trigger: data.trigger,
    triggerValue: data.triggerValue != null ? String(data.triggerValue) : null,
    rewardProductId: data.rewardProductId ?? null,
    rewardQuantity: data.rewardQuantity ?? 1,
    notes: data.notes ?? null,
  })
  revalidatePath('/dashboard', 'layout')
}

export async function updateCompensationRule(id: number, data: {
  trigger?: string
  triggerValue?: number | null
  rewardProductId?: number | null
  rewardQuantity?: number
  active?: boolean
  notes?: string | null
}) {
  await db.update(influencerCompensationRules).set({
    ...(data.trigger !== undefined && { trigger: data.trigger }),
    ...('triggerValue' in data && { triggerValue: data.triggerValue != null ? String(data.triggerValue) : null }),
    ...('rewardProductId' in data && { rewardProductId: data.rewardProductId }),
    ...(data.rewardQuantity !== undefined && { rewardQuantity: data.rewardQuantity }),
    ...(data.active !== undefined && { active: data.active }),
    ...('notes' in data && { notes: data.notes }),
  }).where(eq(influencerCompensationRules.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteCompensationRule(id: number) {
  await db.delete(influencerCompensationRules).where(eq(influencerCompensationRules.id, id))
  revalidatePath('/dashboard', 'layout')
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(data: {
  influencerId: number
  postDate: string
  socialNetworkId?: number | null
  contentType?: string
  url?: string | null
  notes?: string | null
}) {
  await db.insert(influencerPosts).values({
    influencerId: data.influencerId,
    postDate: data.postDate,
    socialNetworkId: data.socialNetworkId ?? null,
    contentType: data.contentType ?? 'post',
    url: data.url ?? null,
    notes: data.notes ?? null,
    compensated: false,
  })
  revalidatePath('/dashboard', 'layout')
}

export async function deletePost(id: number) {
  await db.delete(influencerPosts).where(eq(influencerPosts.id, id))
  revalidatePath('/dashboard', 'layout')
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export async function createDelivery(data: {
  influencerId: number
  deliveryDate: string
  productId?: number | null
  productName: string
  quantity?: number
  trigger?: string
  triggerRef?: string | null
  notes?: string | null
  postId?: number | null // mark related post as compensated
}) {
  await db.insert(influencerDeliveries).values({
    influencerId: data.influencerId,
    deliveryDate: data.deliveryDate,
    productId: data.productId ?? null,
    productName: data.productName,
    quantity: data.quantity ?? 1,
    trigger: data.trigger ?? 'manual',
    triggerRef: data.triggerRef ?? null,
    status: 'pending',
    notes: data.notes ?? null,
  })

  if (data.postId) {
    await db.update(influencerPosts)
      .set({ compensated: true })
      .where(eq(influencerPosts.id, data.postId))
  }

  revalidatePath('/dashboard', 'layout')
}

export async function markDeliveryDelivered(id: number) {
  await db.update(influencerDeliveries)
    .set({ status: 'delivered', updatedAt: new Date() })
    .where(eq(influencerDeliveries.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteDelivery(id: number) {
  await db.delete(influencerDeliveries).where(eq(influencerDeliveries.id, id))
  revalidatePath('/dashboard', 'layout')
}

// ─── Pending deliveries overview (for analytics) ─────────────────────────────

export type PendingDeliveryRow = {
  influencerId: number
  influencerName: string
  deliveryId: number
  productName: string
  quantity: number
  trigger: string
  triggerRef: string | null
  deliveryDate: string
  daysAgo: number
}

export async function getPendingDeliveries(): Promise<PendingDeliveryRow[]> {
  const rows = await db
    .select({
      influencerId: influencers.id,
      influencerName: influencers.name,
      deliveryId: influencerDeliveries.id,
      productName: influencerDeliveries.productName,
      quantity: influencerDeliveries.quantity,
      trigger: influencerDeliveries.trigger,
      triggerRef: influencerDeliveries.triggerRef,
      deliveryDate: influencerDeliveries.deliveryDate,
      createdAt: influencerDeliveries.createdAt,
    })
    .from(influencerDeliveries)
    .innerJoin(influencers, eq(influencerDeliveries.influencerId, influencers.id))
    .where(eq(influencerDeliveries.status, 'pending'))
    .orderBy(influencerDeliveries.createdAt)

  const now = Date.now()
  return rows.map(r => ({
    ...r,
    deliveryDate: String(r.deliveryDate),
    daysAgo: r.createdAt
      ? Math.floor((now - new Date(r.createdAt).getTime()) / 86400000)
      : 0,
  }))
}
