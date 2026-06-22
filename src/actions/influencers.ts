'use server'

import { db } from '@/db'
import { influencers, socialNetworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type Influencer = {
  id: number
  name: string
  socialNetworkId: number | null
  socialNetworkName: string | null
  socialUsername: string | null
  notes: string | null
  active: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export async function getInfluencers(): Promise<Influencer[]> {
  return db
    .select({
      id: influencers.id,
      name: influencers.name,
      socialNetworkId: influencers.socialNetworkId,
      socialNetworkName: socialNetworks.name,
      socialUsername: influencers.socialUsername,
      notes: influencers.notes,
      active: influencers.active,
      createdAt: influencers.createdAt,
      updatedAt: influencers.updatedAt,
    })
    .from(influencers)
    .leftJoin(socialNetworks, eq(influencers.socialNetworkId, socialNetworks.id))
    .orderBy(influencers.name)
}

export async function createInfluencer(data: {
  name: string
  socialNetworkId?: number | null
  socialUsername?: string | null
  notes?: string | null
  active?: boolean
}) {
  await db.insert(influencers).values({
    name: data.name,
    socialNetworkId: data.socialNetworkId ?? null,
    socialUsername: data.socialUsername ?? null,
    notes: data.notes ?? null,
    active: data.active ?? true,
  })
  revalidatePath('/dashboard', 'layout')
}

export async function updateInfluencer(id: number, data: {
  name?: string
  socialNetworkId?: number | null
  socialUsername?: string | null
  notes?: string | null
  active?: boolean
}) {
  await db.update(influencers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(influencers.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteInfluencer(id: number) {
  await db.delete(influencers).where(eq(influencers.id, id))
  revalidatePath('/dashboard', 'layout')
}
