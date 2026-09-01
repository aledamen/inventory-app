'use server'

import { db } from '@/db'
import { curatedPicks } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { triggerCatalogRevalidate } from '@/lib/revalidate-catalog'

export type CuratedPick = typeof curatedPicks.$inferSelect

type CuratedPickInput = {
  position: number
  headline: string
  subheadline?: string | null
  description?: string | null
  comboSku: string
}

async function revalidateCuratedPicks() {
  revalidatePath('/dashboard/curated-picks')
  revalidatePath('/api/curated-picks')
  await triggerCatalogRevalidate()
}

export async function getCuratedPicks(): Promise<CuratedPick[]> {
  return db.select().from(curatedPicks).orderBy(asc(curatedPicks.position), asc(curatedPicks.id))
}

export async function createCuratedPick(data: CuratedPickInput): Promise<{ id: number }> {
  const [pick] = await db
    .insert(curatedPicks)
    .values({
      position: data.position,
      headline: data.headline,
      subheadline: data.subheadline ?? null,
      description: data.description ?? null,
      comboSku: data.comboSku,
    })
    .returning({ id: curatedPicks.id })

  await revalidateCuratedPicks()
  return { id: pick.id }
}

export async function updateCuratedPick(id: number, data: Partial<CuratedPickInput>) {
  await db
    .update(curatedPicks)
    .set({
      ...(data.position !== undefined && { position: data.position }),
      ...(data.headline !== undefined && { headline: data.headline }),
      ...('subheadline' in data && { subheadline: data.subheadline ?? null }),
      ...('description' in data && { description: data.description ?? null }),
      ...(data.comboSku !== undefined && { comboSku: data.comboSku }),
      updatedAt: new Date(),
    })
    .where(eq(curatedPicks.id, id))

  await revalidateCuratedPicks()
}

export async function deleteCuratedPick(id: number) {
  await db.delete(curatedPicks).where(eq(curatedPicks.id, id))
  await revalidateCuratedPicks()
}

export async function reorderCuratedPicks(order: { id: number; position: number }[]) {
  for (const { id, position } of order) {
    await db.update(curatedPicks).set({ position, updatedAt: new Date() }).where(eq(curatedPicks.id, id))
  }
  await revalidateCuratedPicks()
}
