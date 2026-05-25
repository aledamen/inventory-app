'use server'

import { db } from '@/db'
import { catalogViews, blockedIps } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type VisitorStats = {
  totalViews: number
  uniqueIps: number
  todayViews: number
  viewsByDay: { date: string; count: number }[]
  topPaths: { path: string; count: number }[]
  recentViews: { id: number; ip: string | null; path: string; visitedAt: Date }[]
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const [totals] = await db
    .select({
      totalViews: sql<number>`count(*)`,
      uniqueIps: sql<number>`count(distinct ${catalogViews.ip})`,
      todayViews: sql<number>`count(*) filter (where ${catalogViews.visitedAt}::date = current_date)`,
    })
    .from(catalogViews)

  const viewsByDayRows = await db
    .select({
      date: sql<string>`${catalogViews.visitedAt}::date::text`,
      count: sql<number>`count(*)`,
    })
    .from(catalogViews)
    .where(sql`${catalogViews.visitedAt} >= current_date - interval '30 days'`)
    .groupBy(sql`${catalogViews.visitedAt}::date`)
    .orderBy(sql`${catalogViews.visitedAt}::date`)

  const topPathsRows = await db
    .select({
      path: catalogViews.path,
      count: sql<number>`count(*)`,
    })
    .from(catalogViews)
    .groupBy(catalogViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  const recentViewsRows = await db
    .select({
      id: catalogViews.id,
      ip: catalogViews.ip,
      path: catalogViews.path,
      visitedAt: catalogViews.visitedAt,
    })
    .from(catalogViews)
    .orderBy(desc(catalogViews.visitedAt))
    .limit(50)

  return {
    totalViews: Number(totals?.totalViews ?? 0),
    uniqueIps: Number(totals?.uniqueIps ?? 0),
    todayViews: Number(totals?.todayViews ?? 0),
    viewsByDay: viewsByDayRows.map(r => ({ date: r.date, count: Number(r.count) })),
    topPaths: topPathsRows.map(r => ({ path: r.path, count: Number(r.count) })),
    recentViews: recentViewsRows,
  }
}

export async function getBlockedIps() {
  return db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt))
}

export async function addBlockedIp(ip: string, label?: string) {
  await db.insert(blockedIps).values({ ip, label: label ?? null }).onConflictDoNothing()
  revalidatePath('/dashboard/visitors')
}

export async function updateBlockedIp(id: number, data: { ip?: string; label?: string }) {
  await db
    .update(blockedIps)
    .set({
      ...(data.ip !== undefined && { ip: data.ip }),
      ...(data.label !== undefined && { label: data.label }),
      updatedAt: new Date(),
    })
    .where(eq(blockedIps.id, id))
  revalidatePath('/dashboard/visitors')
}

export async function removeBlockedIp(id: number) {
  await db.delete(blockedIps).where(eq(blockedIps.id, id))
  revalidatePath('/dashboard/visitors')
}
