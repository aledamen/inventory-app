import { pgTable, serial, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'
import { paymentMethods } from './lookups'

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  movementNumber: integer('movement_number').notNull(),
  type: text('type').notNull().default('entrada'),
  productId: integer('product_id').references(() => products.id).notNull(),
  supplierId: integer('supplier_id'),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  quantity: integer('quantity').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }),
  paymentMethodId: integer('payment_method_id').references(() => paymentMethods.id),
  note: text('note'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  saleNumber: integer('sale_number').notNull(),
  type: text('type').notNull().default('salida'),
  productId: integer('product_id').references(() => products.id).notNull(),
  clientId: integer('client_id'),
  totalCost: numeric('total_cost', { precision: 12, scale: 2 }),
  effectivePrice: numeric('effective_price', { precision: 12, scale: 2 }),
  quantity: integer('quantity').notNull(),
  saleValue: numeric('sale_value', { precision: 12, scale: 2 }),
  totalSale: numeric('total_sale', { precision: 12, scale: 2 }),
  paymentMethodId: integer('payment_method_id').references(() => paymentMethods.id),
  netProfit: numeric('net_profit', { precision: 12, scale: 2 }),
  grossProfit: numeric('gross_profit', { precision: 12, scale: 2 }),
  notes: text('notes'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').defaultNow(),
})
