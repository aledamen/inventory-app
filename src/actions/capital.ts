'use server'

import { db } from '@/db'
import { capitalMovements, sales, stockMovements, expenses } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type CapitalMovement = {
  id: number
  type: string
  amount: string
  notes: string | null
  date: Date
  createdAt: Date | null
}

export async function getCapitalMovements(): Promise<CapitalMovement[]> {
  return db.select().from(capitalMovements).orderBy(capitalMovements.date) as Promise<CapitalMovement[]>
}

export async function getCajaBalance() {
  const [aportesRow, ventasRow, stockRow, gastosRow] = await Promise.all([
    db.select({
      aportes: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'aporte' then ${capitalMovements.amount} else 0 end), 0)`,
      retiros: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'retiro' then ${capitalMovements.amount} else 0 end), 0)`,
    }).from(capitalMovements),

    db.select({
      total: sql<string>`coalesce(sum(coalesce(${sales.saleValue}, ${sales.effectivePrice} * ${sales.quantity})), 0)`,
    }).from(sales),

    db.select({
      total: sql<string>`coalesce(sum(${stockMovements.total}), 0)`,
    }).from(stockMovements),

    db.select({
      total: sql<string>`coalesce(sum(${expenses.total}), 0)`,
    }).from(expenses),
  ])

  const aportes = Number(aportesRow[0]?.aportes ?? 0)
  const retiros = Number(aportesRow[0]?.retiros ?? 0)
  const ventas = Number(ventasRow[0]?.total ?? 0)
  const stockComprado = Number(stockRow[0]?.total ?? 0)
  const gastosTotal = Number(gastosRow[0]?.total ?? 0)

  const balance = aportes + ventas - stockComprado - gastosTotal - retiros

  return { aportes, retiros, ventas, stockComprado, gastosTotal, balance }
}

export async function createCapitalMovement(data: {
  type: 'aporte' | 'retiro'
  amount: number
  notes?: string
  date: Date
}) {
  await db.insert(capitalMovements).values({
    type: data.type,
    amount: String(data.amount),
    notes: data.notes ?? null,
    date: data.date,
  })
  revalidatePath('/dashboard/caja')
  revalidatePath('/dashboard')
}

export async function deleteCapitalMovement(id: number) {
  await db.delete(capitalMovements).where(eq(capitalMovements.id, id))
  revalidatePath('/dashboard/caja')
  revalidatePath('/dashboard')
}
