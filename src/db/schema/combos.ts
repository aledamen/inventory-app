import { pgTable, serial, varchar, text, decimal, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'
import { banners } from './banners'

export const combos = pgTable('combos', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  badge: varchar('badge', { length: 50 }),
  featured: boolean('featured').default(false).notNull(),
  visible: boolean('visible').default(false).notNull(),
  imageUrl: text('image_url'),
  priceEffective: decimal('price_effective', { precision: 10, scale: 2 }).notNull(),
  priceTransfer: decimal('price_transfer', { precision: 10, scale: 2 }),
  priceList: decimal('price_list', { precision: 10, scale: 2 }),
  notes: text('notes'),
  bannerId: integer('banner_id').references(() => banners.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const comboItems = pgTable('combo_items', {
  id: serial('id').primaryKey(),
  comboId: integer('combo_id').references(() => combos.id, { onDelete: 'cascade' }).notNull(),
  productId: integer('product_id').references(() => products.id),
  productGroupName: text('product_group_name'),
  quantity: integer('quantity').default(1).notNull(),
})
