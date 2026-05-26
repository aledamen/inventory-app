'use server'

import { db } from '@/db'
import { products, sales, stockMovements, pricing, expenses, flavors, brands, paymentMethods } from '@/db/schema'
import { eq, desc, gte, lte, and, sql, sum, count, avg } from 'drizzle-orm'

function dateFilters(from?: string, to?: string) {
  const conds = []
  if (from) conds.push(gte(sales.date, new Date(from)))
  if (to) {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    conds.push(lte(sales.date, end))
  }
  return conds.length ? and(...conds) : undefined
}

function expenseDateFilters(from?: string, to?: string) {
  const conds = []
  if (from) conds.push(gte(expenses.date, new Date(from)))
  if (to) {
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    conds.push(lte(expenses.date, end))
  }
  return conds.length ? and(...conds) : undefined
}

export async function getAnalyticsSummary(from?: string, to?: string) {
  const where = dateFilters(from, to)
  const expensesWhere = expenseDateFilters(from, to)

  const [salesRow, expensesRow] = await Promise.all([
    db.select({
      // sale_value = precio_efectivo × cantidad por fila (no total_sale que duplica)
      totalRevenue: sql<string>`coalesce(sum(${sales.saleValue}), 0)`,
      totalNetProfitStored: sql<string>`coalesce(sum(${sales.netProfit}), 0)`,
      totalCost: sql<string>`coalesce(sum(${sales.totalCost}), 0)`,
      totalUnits: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
      txCount: sql<number>`count(distinct ${sales.saleNumber})`,
      // margen = ganancia / facturación (sobre revenue, no markup sobre costo)
      avgMargin: sql<string>`coalesce(sum(${sales.netProfit}) / nullif(sum(${sales.saleValue}), 0), 0)`,
    }).from(sales).where(where),
    db.select({ total: sql<string>`coalesce(sum(${expenses.total}), 0)` }).from(expenses).where(expensesWhere),
  ])

  const rev = Number(salesRow[0]?.totalRevenue ?? 0)
  const storedNetProfit = Number(salesRow[0]?.totalNetProfitStored ?? 0)
  const totalExp = Number(expensesRow[0]?.total ?? 0)

  return {
    totalRevenue: rev,
    // ganancia de ventas (antes de gastos) = SUM(net_profit per row)
    totalGrossProfit: storedNetProfit,
    totalExpenses: totalExp,
    // ganancia actual = ganancia ventas - gastos operativos
    totalNetProfit: storedNetProfit - totalExp,
    avgMargin: Number(salesRow[0]?.avgMargin ?? 0),
    totalUnits: Number(salesRow[0]?.totalUnits ?? 0),
    txCount: Number(salesRow[0]?.txCount ?? 0),
    totalCost: Number(salesRow[0]?.totalCost ?? 0),
  }
}

export async function getSalesRanking(from?: string, to?: string) {
  const conds: ReturnType<typeof and>[] = []
  if (from) conds.push(gte(sales.date, new Date(from)) as any)
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999)
    conds.push(lte(sales.date, end) as any)
  }

  return db.select({
    productId: sales.productId,
    productName: products.name,
    productSku: products.sku,
    productFlavor: flavors.name,
    totalUnits: sql<number>`sum(${sales.quantity})`,
    totalRevenue: sql<string>`sum(${sales.saleValue})`,
    totalProfit: sql<string>`sum(${sales.netProfit})`,
    txCount: sql<number>`count(distinct ${sales.saleNumber})`,
    avgMargin: sql<string>`sum(${sales.netProfit}) / nullif(sum(${sales.saleValue}), 0)`,
  })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(sales.productId, products.name, products.sku, flavors.name)
    .orderBy(desc(sql`sum(${sales.saleValue})`))
}

export type PeriodGroup = 'day' | 'week' | 'month' | 'year'

export async function getSalesByPeriod(groupBy: PeriodGroup, from?: string, to?: string) {
  const conds: any[] = []
  if (from) conds.push(gte(sales.date, new Date(from)))
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999)
    conds.push(lte(sales.date, end))
  }

  // Use db.execute + GROUP BY 1 to avoid Drizzle generating mismatched
  // column qualification between SELECT and GROUP BY (causes Postgres error 42803)
  const whereClause = conds.length ? sql`WHERE ${and(...conds)}` : sql``

  type Row = { period: string; revenue: string; profit: string; units: string; tx_count: string; avg_margin: string }
  const result = await db.execute<Row>(sql`
    SELECT
      date_trunc(${groupBy}, "sales"."date") AS period,
      coalesce(sum(sale_value), 0)           AS revenue,
      coalesce(sum(net_profit), 0)           AS profit,
      coalesce(sum(quantity), 0)             AS units,
      count(distinct sale_number)            AS tx_count,
      coalesce(sum(net_profit) / nullif(sum(sale_value), 0), 0) AS avg_margin
    FROM sales
    ${whereClause}
    GROUP BY 1
    ORDER BY 1
  `)

  return result.rows.map(r => ({
    period: r.period,
    revenue: r.revenue,
    profit: r.profit,
    units: Number(r.units),
    txCount: Number(r.tx_count),
    avgMargin: r.avg_margin,
  }))
}

export async function getStockInventoryValue() {
  return db.select({
    productId: products.id,
    sku: products.sku,
    name: products.name,
    flavor: flavors.name,
    brand: brands.name,
    stock: products.stock,
    totalCost: pricing.totalCost,
    priceCashRounded: pricing.priceCashRounded,
    priceListRounded: pricing.priceListRounded,
    valueAtCost: sql<string>`${products.stock} * coalesce(${pricing.totalCost}::numeric, 0)`,
    valueAtCash: sql<string>`${products.stock} * coalesce(${pricing.priceCashRounded}, 0)`,
    valueAtList: sql<string>`${products.stock} * coalesce(${pricing.priceListRounded}, 0)`,
    potentialProfit: sql<string>`(${products.stock} * coalesce(${pricing.priceCashRounded}, 0)) - (${products.stock} * coalesce(${pricing.totalCost}::numeric, 0))`,
  })
    .from(products)
    .leftJoin(pricing, eq(products.id, pricing.productId))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(sql`${products.stock} > 0`)
    .orderBy(desc(sql`${products.stock} * coalesce(${pricing.totalCost}::numeric, 0)`))
}

export async function getStockHistory(from?: string, to?: string) {
  const conds: any[] = []
  if (from) conds.push(gte(stockMovements.date, new Date(from)))
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999)
    conds.push(lte(stockMovements.date, end))
  }

  return db.select({
    id: stockMovements.id,
    movementNumber: stockMovements.movementNumber,
    date: stockMovements.date,
    productName: products.name,
    productSku: products.sku,
    productFlavor: flavors.name,
    quantity: stockMovements.quantity,
    unitCost: stockMovements.unitCost,
    total: stockMovements.total,
    paymentMethod: paymentMethods.name,
    note: stockMovements.note,
  })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(flavors, eq(products.flavorId, flavors.id))
    .leftJoin(paymentMethods, eq(stockMovements.paymentMethodId, paymentMethods.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockMovements.date))
}

export async function getExpensesByType(from?: string, to?: string) {
  const conds: any[] = []
  if (from) conds.push(gte(expenses.date, new Date(from)))
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999)
    conds.push(lte(expenses.date, end))
  }

  return db.select({
    type: expenses.type,
    total: sql<string>`sum(${expenses.total})`,
    count: sql<number>`count(*)`,
  })
    .from(expenses)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(expenses.type)
    .orderBy(desc(sql`sum(${expenses.total})`))
}
