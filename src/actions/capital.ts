'use server'

import { db } from '@/db'
import { capitalMovements, sales, stockMovements, expenses, products, pricing, paymentMethods } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// Cuenta bancaria agrupa transferencia + mercadopago (billeteras que liquidan a una cuenta, no efectivo físico)
const BANK_METHODS = sql`('transferencia', 'mercadopago')`

export type CapitalMovement = {
  id: number
  type: string
  amount: string
  paymentMethodId: number | null
  paymentMethodName: string | null
  notes: string | null
  date: Date
  createdAt: Date | null
}

export async function getCapitalMovements(): Promise<CapitalMovement[]> {
  return db
    .select({
      id: capitalMovements.id,
      type: capitalMovements.type,
      amount: capitalMovements.amount,
      paymentMethodId: capitalMovements.paymentMethodId,
      paymentMethodName: paymentMethods.name,
      notes: capitalMovements.notes,
      date: capitalMovements.date,
      createdAt: capitalMovements.createdAt,
    })
    .from(capitalMovements)
    .leftJoin(paymentMethods, eq(capitalMovements.paymentMethodId, paymentMethods.id))
    .orderBy(capitalMovements.date)
}

export async function getCajaBalance() {
  const [capitalRow, ventasRow, stockRow, gastosRow, stockActualRows] = await Promise.all([
    db.select({
      aportesBanco: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'aporte' and ${paymentMethods.name} in ${BANK_METHODS} then ${capitalMovements.amount} else 0 end), 0)`,
      aportesEfectivo: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'aporte' and (${paymentMethods.name} is null or ${paymentMethods.name} not in ${BANK_METHODS}) then ${capitalMovements.amount} else 0 end), 0)`,
      retirosBanco: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'retiro' and ${paymentMethods.name} in ${BANK_METHODS} then ${capitalMovements.amount} else 0 end), 0)`,
      retirosEfectivo: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'retiro' and (${paymentMethods.name} is null or ${paymentMethods.name} not in ${BANK_METHODS}) then ${capitalMovements.amount} else 0 end), 0)`,
      // traspaso: paymentMethodId marca el DESTINO del traspaso (a dónde va la plata)
      traspasoABanco: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'traspaso' and ${paymentMethods.name} in ${BANK_METHODS} then ${capitalMovements.amount} else 0 end), 0)`,
      traspasoAEfectivo: sql<string>`coalesce(sum(case when ${capitalMovements.type} = 'traspaso' and (${paymentMethods.name} is null or ${paymentMethods.name} not in ${BANK_METHODS}) then ${capitalMovements.amount} else 0 end), 0)`,
    }).from(capitalMovements).leftJoin(paymentMethods, eq(capitalMovements.paymentMethodId, paymentMethods.id)),

    db.select({
      banco: sql<string>`coalesce(sum(case when ${paymentMethods.name} in ${BANK_METHODS} then coalesce(${sales.saleValue}, ${sales.effectivePrice} * ${sales.quantity}) else 0 end), 0)`,
      efectivo: sql<string>`coalesce(sum(case when ${paymentMethods.name} is null or ${paymentMethods.name} not in ${BANK_METHODS} then coalesce(${sales.saleValue}, ${sales.effectivePrice} * ${sales.quantity}) else 0 end), 0)`,
    }).from(sales).leftJoin(paymentMethods, eq(sales.paymentMethodId, paymentMethods.id)),

    db.select({
      banco: sql<string>`coalesce(sum(case when ${paymentMethods.name} in ${BANK_METHODS} then ${stockMovements.total} else 0 end), 0)`,
      efectivo: sql<string>`coalesce(sum(case when ${paymentMethods.name} is null or ${paymentMethods.name} not in ${BANK_METHODS} then ${stockMovements.total} else 0 end), 0)`,
    }).from(stockMovements).leftJoin(paymentMethods, eq(stockMovements.paymentMethodId, paymentMethods.id)),

    db.select({
      total: sql<string>`coalesce(sum(${expenses.total}), 0)`,
    }).from(expenses),

    db.select({
      stock: products.stock,
      totalCost: pricing.totalCost,
    }).from(products).leftJoin(pricing, eq(products.id, pricing.productId)),
  ])

  const aportesBanco = Number(capitalRow[0]?.aportesBanco ?? 0)
  const aportesEfectivo = Number(capitalRow[0]?.aportesEfectivo ?? 0)
  const retirosBanco = Number(capitalRow[0]?.retirosBanco ?? 0)
  const retirosEfectivo = Number(capitalRow[0]?.retirosEfectivo ?? 0)
  const traspasoABanco = Number(capitalRow[0]?.traspasoABanco ?? 0)
  const traspasoAEfectivo = Number(capitalRow[0]?.traspasoAEfectivo ?? 0)
  const ventasBanco = Number(ventasRow[0]?.banco ?? 0)
  const ventasEfectivo = Number(ventasRow[0]?.efectivo ?? 0)
  const stockBanco = Number(stockRow[0]?.banco ?? 0)
  const stockEfectivo = Number(stockRow[0]?.efectivo ?? 0)
  const gastosTotal = Number(gastosRow[0]?.total ?? 0)
  const stockActualCosto = stockActualRows.reduce((acc, p) => acc + p.stock * Number(p.totalCost ?? 0), 0)

  const aportes = aportesBanco + aportesEfectivo
  const retiros = retirosBanco + retirosEfectivo
  const ventas = ventasBanco + ventasEfectivo
  const stockComprado = stockBanco + stockEfectivo

  // Los gastos no tienen método de pago registrado en la base todavía — se descuentan del efectivo por defecto
  // Los traspasos son movimientos internos (efectivo <-> banco): no afectan el total, solo redistribuyen entre buckets
  const cuentaBancaria = aportesBanco + ventasBanco - stockBanco - retirosBanco + traspasoABanco - traspasoAEfectivo
  const efectivo = aportesEfectivo + ventasEfectivo - stockEfectivo - gastosTotal - retirosEfectivo - traspasoABanco + traspasoAEfectivo

  const efectivoLiquido = cuentaBancaria + efectivo
  // aporte sugerido: cuánto pusiste de tu bolsillo asumiendo $0 efectivo en mano
  const aporteSugerido = Math.max(0, -efectivoLiquido)

  return {
    aportes,
    retiros,
    ventas,
    stockComprado,
    gastosTotal,
    cuentaBancaria,
    efectivo,
    efectivoLiquido,
    stockActualCosto,
    capitalTotal: efectivoLiquido + stockActualCosto,
    aporteSugerido,
    // balance legacy
    balance: efectivoLiquido,
  }
}

export async function createCapitalMovement(data: {
  type: 'aporte' | 'retiro' | 'traspaso'
  amount: number
  paymentMethodId: number
  notes?: string
  date: Date
}) {
  await db.insert(capitalMovements).values({
    type: data.type,
    amount: String(data.amount),
    paymentMethodId: data.paymentMethodId,
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
