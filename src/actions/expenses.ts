'use server'

import { db } from '@/db'
import { expenses } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getExpenses() {
  return db.select().from(expenses).orderBy(expenses.date)
}

export async function createExpense(data: { type: string; total: number; date?: Date }) {
  await db.insert(expenses).values({
    type: data.type,
    total: String(data.total),
    date: data.date ?? new Date(),
  })
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}

export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id))
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard')
}
