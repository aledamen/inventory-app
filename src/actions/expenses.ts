'use server'

import { db } from '@/db'
import { expenses, paymentMethods } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getExpenses() {
  return db
    .select({
      id: expenses.id,
      type: expenses.type,
      total: expenses.total,
      paymentMethodId: expenses.paymentMethodId,
      paymentMethodName: paymentMethods.name,
      date: expenses.date,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .leftJoin(paymentMethods, eq(expenses.paymentMethodId, paymentMethods.id))
    .orderBy(expenses.date)
}

export async function createExpense(data: { type: string; total: number; paymentMethodId?: number; date?: Date }) {
  await db.insert(expenses).values({
    type: data.type,
    total: String(data.total),
    paymentMethodId: data.paymentMethodId ?? null,
    date: data.date ?? new Date(),
  })
  revalidatePath('/dashboard', 'layout')
}

export async function updateExpense(id: number, data: { type: string; total: number; paymentMethodId?: number | null; date?: Date }) {
  await db.update(expenses).set({
    type: data.type,
    total: String(data.total),
    ...(data.paymentMethodId !== undefined ? { paymentMethodId: data.paymentMethodId } : {}),
    ...(data.date ? { date: data.date } : {}),
    updatedAt: new Date(),
  }).where(eq(expenses.id, id))
  revalidatePath('/dashboard', 'layout')
}

export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id))
  revalidatePath('/dashboard', 'layout')
}
