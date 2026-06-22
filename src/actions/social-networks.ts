'use server'

import { db } from '@/db'
import { socialNetworks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type SocialNetwork = {
  id: number
  name: string
  active: boolean
  createdAt: Date | null
}

export async function getSocialNetworks(): Promise<SocialNetwork[]> {
  return db.select().from(socialNetworks).orderBy(socialNetworks.name)
}

export async function createSocialNetwork(name: string) {
  await db.insert(socialNetworks).values({ name: name.trim() })
  revalidatePath('/dashboard', 'layout')
}

export async function updateSocialNetwork(id: number, data: { name?: string; active?: boolean }) {
  await db.update(socialNetworks).set(data).where(eq(socialNetworks.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteSocialNetwork(id: number) {
  await db.delete(socialNetworks).where(eq(socialNetworks.id, id))
  revalidatePath('/dashboard', 'layout')
}
