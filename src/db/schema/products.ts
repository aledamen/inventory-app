import { pgTable, serial, text, integer, numeric, boolean, timestamp } from 'drizzle-orm/pg-core'
import { categories, brands, flavors } from './lookups'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  categoryId: integer('category_id').references(() => categories.id),
  brandId: integer('brand_id').references(() => brands.id),
  name: text('name').notNull(),
  flavorId: integer('flavor_id').references(() => flavors.id),
  weightG: integer('weight_g'),
  cost: numeric('cost', { precision: 12, scale: 2 }).notNull(),
  type: text('type').default('estandar'),
  bagAssigned: text('bag_assigned'),
  stock: integer('stock').default(0).notNull(),
  stockMin: integer('stock_min').default(0),
  imageUrl: text('image_url'),
  visible: boolean('visible').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const pricing = pgTable('pricing', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }),
  packagingCost: numeric('packaging_cost', { precision: 12, scale: 2 }),
  totalCost: numeric('total_cost', { precision: 12, scale: 2 }),
  marginCash: numeric('margin_cash', { precision: 6, scale: 4 }),
  marginTransfer: numeric('margin_transfer', { precision: 6, scale: 4 }),
  marginList: numeric('margin_list', { precision: 6, scale: 4 }),
  priceCash: numeric('price_cash', { precision: 12, scale: 2 }),
  priceCashRounded: integer('price_cash_rounded'),
  priceTransfer: numeric('price_transfer', { precision: 12, scale: 2 }),
  priceTransferRounded: integer('price_transfer_rounded'),
  priceList: numeric('price_list', { precision: 12, scale: 2 }),
  priceListRounded: integer('price_list_rounded'),
  clientShipping: integer('client_shipping'),
  priceCashWithShipping: integer('price_cash_with_shipping'),
  priceListWithShipping: integer('price_list_with_shipping'),
  profit: numeric('profit', { precision: 12, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const packagingCosts = pgTable('packaging_costs', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  bagAssigned: text('bag_assigned'),
  bagCost: numeric('bag_cost', { precision: 10, scale: 2 }),
  stickerCost: numeric('sticker_cost', { precision: 10, scale: 2 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
})

export const shippingSupplyCosts = pgTable('shipping_supply_costs', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  weightG: integer('weight_g'),
  costPerGram: numeric('cost_per_gram', { precision: 10, scale: 4 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
})
