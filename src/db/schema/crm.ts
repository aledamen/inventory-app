import { pgTable, serial, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'
import { paymentMethods } from './lookups'

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  contactName: text('contact_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const returns = pgTable('returns', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id'),
  productId: integer('product_id').references(() => products.id).notNull(),
  clientId: integer('client_id').references(() => clients.id),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  refundAmount: numeric('refund_amount', { precision: 12, scale: 2 }),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const stockAdjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const priceHistory = pgTable('price_history', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  marginCash: numeric('margin_cash', { precision: 6, scale: 4 }),
  marginTransfer: numeric('margin_transfer', { precision: 6, scale: 4 }),
  marginList: numeric('margin_list', { precision: 6, scale: 4 }),
  priceCashRounded: integer('price_cash_rounded'),
  priceTransferRounded: integer('price_transfer_rounded'),
  priceListRounded: integer('price_list_rounded'),
  changedAt: timestamp('changed_at').defaultNow(),
})

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: integer('order_number').notNull(),
  clientId: integer('client_id').references(() => clients.id),
  status: text('status').notNull().default('pendiente'),
  notes: text('notes'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
  paymentMethodId: integer('payment_method_id').references(() => paymentMethods.id),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }),
})

export const salesTargets = pgTable('sales_targets', {
  id: serial('id').primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  targetRevenue: numeric('target_revenue', { precision: 12, scale: 2 }),
  targetUnits: integer('target_units'),
})
