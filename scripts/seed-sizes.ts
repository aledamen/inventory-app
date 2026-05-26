/**
 * Seed: carga el campo `size` para todos los productos existentes.
 * Uso: node --env-file=.env.local ./node_modules/.bin/tsx scripts/seed-sizes.ts
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const sizes: Record<string, string> = {
  STCREAT150P:    '150g',
  STCREAT300B:    '300g',
  STCREATFR300B:  '300g',
  STCREAT500P:    '500g',
  STCREAT1000P:   '1000g',
  STPROTC2B:      '2lb',
  STPROTCNC2B:    '2lb',
  STPROTF2B:      '2lb',
  STPROTV2B:      '2lb',
  STPROTB2B:      '2lb',
  STPROTC3000B:   '3kg',
  STPROTCNC3000B: '3kg',
  STPROTF3000B:   '3kg',
  STPROTV3000B:   '3kg',
  STMAGN500P:     '500g',
  STMAGNFR500P:   '500g',
  STO3FISH60P:    '60 caps',
  STCOLHFR210P:   '210g',
  STCOLHL210P:    '210g',
  STCOLPL360P:    '360g',
  STPMPV8A285P:   '285g',
  STPMPV8G285P:   '285g',
  STPMPV8LL285P:  '285g',
  STPMPV8W285P:   '285g',
  ST3DRIPL315P:   '315g',
  ST3DRIPSL315P:  '315g',
  STCAFE20030P:   '30 caps',
  EVSHAKNYCR1500: '500ml',
  EVSHAKNYCG1500: '500ml',
  EVSHAKA2450:    '450ml',
  EVSHAKG2450:    '450ml',
}

async function main() {
  let updated = 0
  let notFound = 0

  for (const [sku, size] of Object.entries(sizes)) {
    const result = await db
      .update(schema.products)
      .set({ size })
      .where(eq(schema.products.sku, sku))

    if (result.rowCount === 0) {
      console.warn(`  SKU no encontrado: ${sku}`)
      notFound++
    } else {
      console.log(`  ✓ ${sku} → ${size}`)
      updated++
    }
  }

  console.log(`\nListo: ${updated} actualizados, ${notFound} no encontrados.`)
}

main().catch(console.error)
