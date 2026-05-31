/**
 * Migración: corrige totalSale para ventas multi-ítem agrupadas por saleNumber.
 * Para cada grupo de filas con el mismo saleNumber, totalSale pasa a ser
 * la suma de saleValue de todas las filas del grupo.
 *
 * Uso: node --env-file=.env.local ./node_modules/.bin/tsx scripts/fix-sale-totals.ts
 * Dry run (solo muestra cambios): DRY_RUN=1 node --env-file=.env.local ./node_modules/.bin/tsx scripts/fix-sale-totals.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const { sales } = schema

const client = neon(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no se modificará nada\n' : '🚀 Ejecutando migración\n')

  // Todos los grupos con más de una fila
  const groups = await db
    .select({
      saleNumber: sales.saleNumber,
      rowCount: sql<number>`count(*)::int`,
      groupTotal: sql<string>`sum(${sales.saleValue})`,
    })
    .from(sales)
    .groupBy(sales.saleNumber)
    .having(sql`count(*) > 1`)
    .orderBy(sales.saleNumber)

  if (groups.length === 0) {
    console.log('No hay grupos multi-ítem. Nada que migrar.')
    return
  }

  console.log(`Grupos encontrados con múltiples filas: ${groups.length}\n`)

  let totalUpdated = 0

  for (const group of groups) {
    const rows = await db
      .select({
        id: sales.id,
        productId: sales.productId,
        saleValue: sales.saleValue,
        totalSale: sales.totalSale,
        netProfit: sales.netProfit,
      })
      .from(sales)
      .where(eq(sales.saleNumber, group.saleNumber))

    const newTotal = group.groupTotal ?? '0'
    const staleRows = rows.filter(r => r.totalSale !== newTotal)

    if (staleRows.length === 0) {
      console.log(`Venta #${group.saleNumber} (${group.rowCount} ítems) — ya está correcto ✓`)
      continue
    }

    console.log(`Venta #${group.saleNumber} (${group.rowCount} ítems) — total correcto: $${Number(newTotal).toLocaleString('es-AR')}`)
    for (const r of rows) {
      const marker = r.totalSale !== newTotal ? '→ ACTUALIZAR' : '✓'
      console.log(`  fila ${r.id}: saleValue=$${Number(r.saleValue ?? 0).toLocaleString('es-AR')}  totalSale actual=$${Number(r.totalSale ?? 0).toLocaleString('es-AR')}  ${marker}`)
    }

    if (!DRY_RUN) {
      await db
        .update(sales)
        .set({ totalSale: newTotal })
        .where(eq(sales.saleNumber, group.saleNumber))
      console.log(`  ✅ Actualizado\n`)
    } else {
      console.log(`  (dry run — no se actualizó)\n`)
    }

    totalUpdated += staleRows.length
  }

  console.log(`\n${DRY_RUN ? 'Filas que se actualizarían' : 'Filas actualizadas'}: ${totalUpdated}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
