'use server'

import { db } from '@/db'
import { products, sales, pricing, expenses, flavors } from '@/db/schema'
import { eq, desc, gte, sql, lt, and } from 'drizzle-orm'

export async function getDashboardStats() {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    allProducts,
    monthlySalesRows,
    recentSalesRows,
    expensesRows,
  ] = await Promise.all([
    db.select({
      stock: products.stock,
      stockMin: products.stockMin,
      totalCost: pricing.totalCost,
      priceCashRounded: pricing.priceCashRounded,
    }).from(products).leftJoin(pricing, eq(products.id, pricing.productId)),

    db.select({
      totalSale: sql<string>`sum(coalesce(${sales.saleValue}, ${sales.effectivePrice} * ${sales.quantity}))`,
      totalNetProfit: sql<string>`sum(${sales.netProfit})`,
      count: sql<number>`count(distinct ${sales.saleNumber})`,
    }).from(sales).where(gte(sales.date, firstOfMonth)),

    db.select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      date: sales.date,
      productName: products.name,
      productFlavor: flavors.name,
      quantity: sales.quantity,
      totalSale: sales.totalSale,
      netProfit: sales.netProfit,
    })
      .from(sales)
      .leftJoin(products, eq(sales.productId, products.id))
      .leftJoin(flavors, eq(products.flavorId, flavors.id))
      .orderBy(desc(sales.date))
      .limit(5),

    db.select({ total: sql<string>`coalesce(sum(${expenses.total}), 0)` }).from(expenses).where(gte(expenses.date, firstOfMonth)),
  ])

  const stockValueAtCost = allProducts.reduce((acc, p) => acc + p.stock * Number(p.totalCost ?? 0), 0)
  const stockValueAtPrice = allProducts.reduce((acc, p) => acc + p.stock * (p.priceCashRounded ?? 0), 0)
  const lowStockCount = allProducts.filter(p => p.stock > 0 && p.stockMin != null && p.stock <= p.stockMin).length
  const outOfStockCount = allProducts.filter(p => p.stock === 0).length

  return {
    stockValueAtCost,
    stockValueAtPrice,
    potentialProfit: stockValueAtPrice - stockValueAtCost,
    monthlyRevenue: Number(monthlySalesRows[0]?.totalSale ?? 0),
    monthlyNetProfit: Number(monthlySalesRows[0]?.totalNetProfit ?? 0) - Number(expensesRows[0]?.total ?? 0),
    monthlySalesCount: Number(monthlySalesRows[0]?.count ?? 0),
    monthlyExpenses: Number(expensesRows[0]?.total ?? 0),
    lowStockCount,
    outOfStockCount,
    recentSales: recentSalesRows,
  }
}
