/**
 * Script de migración: fasebeta (1).xlsx → PostgreSQL (Neon)
 * Uso: node --env-file=.env.local ./node_modules/.bin/tsx scripts/migrate.ts
 */

import * as XLSX from 'xlsx'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const EXCEL_PATH = process.env.EXCEL_PATH ?? '/mnt/c/Users/ale/Downloads/fasebeta (1).xlsx'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ─── helpers ─────────────────────────────────────────────────────────────────

function excelDateToDate(serial: number): Date {
  // Excel serial date (days since 1900-01-00)
  const epoch = new Date(Date.UTC(1899, 11, 30))
  return new Date(epoch.getTime() + serial * 86400000)
}

function toNum(v: unknown): number | undefined {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return isNaN(n) ? undefined : n
}

function toStr(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s === '' || s === 'undefined' || s === 'null' ? null : s
}

// ─── load workbook ────────────────────────────────────────────────────────────

console.log(`📂 Leyendo: ${EXCEL_PATH}`)
const wb = XLSX.readFile(EXCEL_PATH)

function sheet(name: string): unknown[][] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`Hoja "${name}" no encontrada`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}

// ─── 1. LOOKUPS ───────────────────────────────────────────────────────────────

async function migrateLookups() {
  console.log('\n📋 Migrando lookups...')

  // Categorías — toda la columna A incluyendo encabezado
  const catRows = sheet('categoria').flat().filter(Boolean) as string[]
  for (const name of catRows) {
    await db.insert(schema.categories).values({ name }).onConflictDoNothing()
  }
  console.log(`  ✓ ${catRows.length} categorías`)

  // Marcas
  const brandRows = sheet('marcas').flat().filter(Boolean) as string[]
  for (const name of brandRows) {
    await db.insert(schema.brands).values({ name }).onConflictDoNothing()
  }
  console.log(`  ✓ ${brandRows.length} marcas`)

  // Sabores
  const flavorRows = sheet('sabores').flat().filter(Boolean) as string[]
  for (const name of flavorRows) {
    await db.insert(schema.flavors).values({ name }).onConflictDoNothing()
  }
  console.log(`  ✓ ${flavorRows.length} sabores`)

  // Métodos de pago
  const pmRows = sheet('metodos_pagos').flat().filter(Boolean) as string[]
  for (const name of pmRows) {
    await db.insert(schema.paymentMethods).values({ name }).onConflictDoNothing()
  }
  console.log(`  ✓ ${pmRows.length} métodos de pago`)

  // Configuración
  const configRows = sheet('configuracion').slice(1)
  for (const row of configRows as unknown[][]) {
    const [key, value] = row as [string, unknown]
    if (!key) continue
    await db.insert(schema.config).values({ key: String(key), value: String(value) }).onConflictDoNothing()
  }
  console.log(`  ✓ configuración`)
}

// ─── 2. PRODUCTOS ─────────────────────────────────────────────────────────────

async function migrateProducts() {
  console.log('\n📦 Migrando productos...')

  const [cats, brands, flavors] = await Promise.all([
    db.select().from(schema.categories),
    db.select().from(schema.brands),
    db.select().from(schema.flavors),
  ])

  const catMap = Object.fromEntries(cats.map(c => [c.name, c.id]))
  const brandMap = Object.fromEntries(brands.map(b => [b.name, b.id]))
  const flavorMap = Object.fromEntries(flavors.map(f => [f.name, f.id]))

  const rows = sheet('productos_base').slice(1)
  let count = 0

  for (const row of rows as unknown[][]) {
    const [sku, categoria, marca, nombre, sabor, peso, costo, , tipo, bolsa, stock, stockMin, , , , , , costoTotal, notas] = row as unknown[]

    if (!sku || !nombre) continue

    await db.insert(schema.products).values({
      sku: String(sku),
      categoryId: catMap[String(categoria)] ?? null,
      brandId: brandMap[String(marca)] ?? null,
      name: String(nombre),
      flavorId: flavorMap[String(sabor)] ?? null,
      weightG: toNum(peso) ?? null,
      cost: String(toNum(costo) ?? 0),
      type: toStr(tipo) ?? 'estandar',
      bagAssigned: toStr(bolsa),
      stock: Math.round(toNum(stock) ?? 0),
      stockMin: Math.round(toNum(stockMin) ?? 0),
      notas: toStr(notas),
      visible: false,
      updatedAt: new Date(),
    } as any).onConflictDoNothing()

    count++
  }

  console.log(`  ✓ ${count} productos`)
}

// ─── 3. PRICING ───────────────────────────────────────────────────────────────

async function migratePricing() {
  console.log('\n💰 Migrando precios...')

  const products = await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products)
  const prodMap = Object.fromEntries(products.map(p => [p.sku, p.id]))

  const rows = sheet('calculo_final').slice(1)
  let count = 0

  for (const row of rows as unknown[][]) {
    const [sku, , costo, , envio, packaging, costoTotal, margenEf, margenTrans, margenLista,
      precioEf, precioEfRed, precioTrans, precioTransRed, precioLista, precioListaRed,
      envioCliente, precioEfEnvio, precioListaEnvio, ganancia] = row as unknown[]

    if (!sku || !prodMap[String(sku)]) continue

    await db.insert(schema.pricing).values({
      productId: prodMap[String(sku)],
      shippingCost: String(toNum(envio) ?? 0),
      packagingCost: String(toNum(packaging) ?? 0),
      totalCost: String(toNum(costoTotal) ?? 0),
      marginCash: String(toNum(margenEf) ?? 0),
      marginTransfer: String(toNum(margenTrans) ?? 0),
      marginList: String(toNum(margenLista) ?? 0),
      priceCash: String(toNum(precioEf) ?? 0),
      priceCashRounded: Math.round(toNum(precioEfRed) ?? 0),
      priceTransfer: String(toNum(precioTrans) ?? 0),
      priceTransferRounded: Math.round(toNum(precioTransRed) ?? 0),
      priceList: String(toNum(precioLista) ?? 0),
      priceListRounded: Math.round(toNum(precioListaRed) ?? 0),
      clientShipping: Math.round(toNum(envioCliente) ?? 0),
      priceCashWithShipping: Math.round(toNum(precioEfEnvio) ?? 0),
      priceListWithShipping: Math.round(toNum(precioListaEnvio) ?? 0),
      profit: String(toNum(ganancia) ?? 0),
    }).onConflictDoNothing()

    count++
  }

  console.log(`  ✓ ${count} filas de precios`)
}

// ─── 4. PACKAGING & ENVÍOS ────────────────────────────────────────────────────

async function migratePackagingAndShipping() {
  console.log('\n📦 Migrando packaging y envíos...')

  const products = await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products)
  const prodMap = Object.fromEntries(products.map(p => [p.sku, p.id]))

  // Packaging
  const packRows = sheet('packaging').slice(1)
  let packCount = 0
  for (const row of packRows as unknown[][]) {
    const [sku, bolsa, costoBolsa, sticker, total] = row as unknown[]
    if (!sku || !prodMap[String(sku)]) continue
    await db.insert(schema.packagingCosts).values({
      productId: prodMap[String(sku)],
      bagAssigned: toStr(bolsa),
      bagCost: String(toNum(costoBolsa) ?? 0),
      stickerCost: String(toNum(sticker) ?? 0),
      totalCost: String(toNum(total) ?? 0),
    }).onConflictDoNothing()
    packCount++
  }
  console.log(`  ✓ ${packCount} packaging`)

  // Envíos
  const shippRows = sheet('envios').slice(1)
  let shippCount = 0
  for (const row of shippRows as unknown[][]) {
    const [sku, peso, costoPorGramo] = row as unknown[]
    if (!sku || !prodMap[String(sku)]) continue
    const total = (toNum(peso) ?? 0) * (toNum(costoPorGramo) ?? 0)
    await db.insert(schema.shippingSupplyCosts).values({
      productId: prodMap[String(sku)],
      weightG: Math.round(toNum(peso) ?? 0),
      costPerGram: String(toNum(costoPorGramo) ?? 0),
      totalCost: String(total),
    }).onConflictDoNothing()
    shippCount++
  }
  console.log(`  ✓ ${shippCount} costos de envío`)
}

// ─── 5. STOCK MOVEMENTS ───────────────────────────────────────────────────────

async function migrateStockMovements() {
  console.log('\n📥 Migrando movimientos de stock...')

  const products = await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products)
  const prodMap = Object.fromEntries(products.map(p => [p.sku, p.id]))

  const pms = await db.select().from(schema.paymentMethods)
  const pmMap = Object.fromEntries(pms.map(p => [p.name.toLowerCase(), p.id]))

  const rows = sheet('stock').slice(1)
  let count = 0

  for (const row of rows as unknown[][]) {
    const [fecha, compra, tipo, sku, , , , costoUnit, cantidad, total, metodoPago, nota] = row as unknown[]
    if (!sku || !prodMap[String(sku)]) continue

    const date = typeof fecha === 'number' ? excelDateToDate(fecha) : new Date()
    const pmName = toStr(metodoPago)?.toLowerCase() ?? ''

    await db.insert(schema.stockMovements).values({
      movementNumber: Math.round(toNum(compra) ?? count + 1),
      type: toStr(tipo) ?? 'entrada',
      productId: prodMap[String(sku)],
      unitCost: String(toNum(costoUnit) ?? 0),
      quantity: Math.round(toNum(cantidad) ?? 0),
      total: String(toNum(total) ?? 0),
      paymentMethodId: pmMap[pmName] ?? null,
      note: toStr(nota),
      date,
    }).onConflictDoNothing()
    count++
  }

  console.log(`  ✓ ${count} movimientos de stock`)
}

// ─── 6. VENTAS ────────────────────────────────────────────────────────────────

async function migrateSales() {
  console.log('\n🛒 Migrando ventas...')

  const products = await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products)
  const prodMap = Object.fromEntries(products.map(p => [p.sku, p.id]))

  const pms = await db.select().from(schema.paymentMethods)
  const pmMap = Object.fromEntries(pms.map(p => [p.name.toLowerCase(), p.id]))

  const rows = sheet('ventas').slice(1)
  let count = 0

  for (const row of rows as unknown[][]) {
    const [fecha, venta, tipo, sku, , , , costoTotal, precioEf, cantidad, valorVenta, totalVenta, metodoPago, gananciaNeta, gananciaBruta, notas] = row as unknown[]
    if (!sku || !prodMap[String(sku)]) continue

    const date = typeof fecha === 'number' ? excelDateToDate(fecha) : new Date()
    const pmName = toStr(metodoPago)?.toLowerCase() ?? ''

    await db.insert(schema.sales).values({
      saleNumber: Math.round(toNum(venta) ?? count + 1),
      type: toStr(tipo) ?? 'salida',
      productId: prodMap[String(sku)],
      totalCost: String(toNum(costoTotal) ?? 0),
      effectivePrice: String(toNum(precioEf) ?? 0),
      quantity: Math.round(toNum(cantidad) ?? 0),
      saleValue: String(toNum(valorVenta) ?? 0),
      totalSale: String(toNum(totalVenta) ?? 0),
      netProfit: String(toNum(gananciaNeta) ?? 0),
      grossProfit: String(toNum(gananciaBruta) ?? 0),
      paymentMethodId: pmMap[pmName] ?? null,
      notes: toStr(notas),
      date,
    }).onConflictDoNothing()
    count++
  }

  console.log(`  ✓ ${count} ventas`)
}

// ─── 7. GASTOS ────────────────────────────────────────────────────────────────

async function migrateExpenses() {
  console.log('\n💸 Migrando gastos...')

  const rows = sheet('gastos').slice(1)
  let count = 0

  for (const row of rows as unknown[][]) {
    const [, tipo, total] = row as unknown[]
    if (!tipo || !total) continue
    await db.insert(schema.expenses).values({
      type: String(tipo),
      total: String(toNum(total) ?? 0),
    }).onConflictDoNothing()
    count++
  }

  console.log(`  ✓ ${count} gastos`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando migración...\n')

  await migrateLookups()
  await migrateProducts()
  await migratePricing()
  await migratePackagingAndShipping()
  await migrateStockMovements()
  await migrateSales()
  await migrateExpenses()

  console.log('\n✅ Migración completada')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
