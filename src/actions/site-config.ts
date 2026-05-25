'use server'

import { db } from '@/db'
import { siteConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const DEFAULTS: Record<string, string> = {
  store_name: 'Fase-Beta',
  accent_color: '#2CC8E0',
  accent_deep_color: '#169FB6',
  hero_overline: 'Catálogo completo',
  hero_title: 'Todo lo que necesitás.',
  hero_subtitle: 'Elegí los productos, armá tu carrito y enviá el pedido por WhatsApp en segundos.',
  announcement_enabled: 'false',
  announcement_text: '',
  announcement_bg: '#2CC8E0',
  announcement_text_color: '#ffffff',
  whatsapp_number: '',
  instagram_handle: '',
  header_bg: '#ffffff',
  header_text_color: '#0A0A0A',
  nav_catalogo_label: 'Catálogo',
  nav_carrito_label: 'Carrito',
  nav_checkout_label: 'Checkout',
  logo_url: '',
  logo_width: '340',
}

export async function getSiteConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteConfig)
  const config = { ...DEFAULTS }
  for (const row of rows) {
    if (row.value !== null && row.key in DEFAULTS) {
      config[row.key] = row.value
    }
  }
  return config
}

export async function setSiteConfigBulk(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    const existing = await db
      .select({ id: siteConfig.id })
      .from(siteConfig)
      .where(eq(siteConfig.key, key))
      .limit(1)

    if (existing.length > 0) {
      await db.update(siteConfig).set({ value }).where(eq(siteConfig.key, key))
    } else {
      await db.insert(siteConfig).values({ key, value })
    }
  }
  revalidatePath('/dashboard/cms')
  revalidatePath('/api/site-config')
}
