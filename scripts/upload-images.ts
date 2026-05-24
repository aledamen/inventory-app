/**
 * Uploads product images from catalogo-app/public/products/ to Vercel Blob
 * and updates products.imageUrl + sets visible=true for matched products.
 *
 * Run: npm run images:upload
 * Requires: BLOB_READ_WRITE_TOKEN set in .env.local
 */

import { put } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'
import { readdir, readFile } from 'fs/promises'
import { join, extname, basename } from 'path'

const db = neon(process.env.DATABASE_URL!)
const IMAGES_DIR = join(process.cwd(), '..', 'catalogo-app', 'public', 'products')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.avif': 'image/avif',
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌  BLOB_READ_WRITE_TOKEN not set in .env.local')
    process.exit(1)
  }

  const files = await readdir(IMAGES_DIR)
  console.log(`Found ${files.length} images in ${IMAGES_DIR}\n`)

  let uploaded = 0
  let skipped = 0
  let notFound = 0

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const sku = basename(file, ext)
    const contentType = MIME[ext] ?? 'image/jpeg'

    // Check if product exists
    const rows = await db`SELECT id, image_url FROM products WHERE sku = ${sku}`
    if (!rows?.length) {
      console.log(`⚠️  SKU not found in DB: ${sku}`)
      notFound++
      continue
    }

    const product = rows[0] as { id: number; image_url: string | null }

    // Skip if already has a blob URL
    if (product.image_url?.includes('blob.vercel-storage.com')) {
      console.log(`⏭️  Already uploaded: ${sku}`)
      skipped++
      continue
    }

    const filePath = join(IMAGES_DIR, file)
    const buffer = await readFile(filePath)
    const blob = new Blob([buffer], { type: contentType })

    process.stdout.write(`⬆️  Uploading ${file}...`)
    const result = await put(`products/${file}`, blob, {
      access: 'public',
      contentType,
    })

    await db`UPDATE products SET image_url = ${result.url}, visible = true WHERE sku = ${sku}`

    console.log(` ✓  ${result.url}`)
    uploaded++
  }

  console.log(`\n✅  Done — uploaded: ${uploaded}, skipped: ${skipped}, SKU not found: ${notFound}`)
}

main().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
