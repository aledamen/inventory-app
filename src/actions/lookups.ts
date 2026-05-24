'use server'

import { db } from '@/db'
import { categories, brands, flavors, paymentMethods } from '@/db/schema'

export async function getAllLookups() {
  const [cats, brnds, flvrs, payments] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(brands).orderBy(brands.name),
    db.select().from(flavors).orderBy(flavors.name),
    db.select().from(paymentMethods).orderBy(paymentMethods.name),
  ])
  return { categories: cats, brands: brnds, flavors: flvrs, paymentMethods: payments }
}
