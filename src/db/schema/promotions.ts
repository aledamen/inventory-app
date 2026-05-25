import { pgTable, serial, integer, decimal, varchar, date, boolean, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'

export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  promoPrice: decimal('promo_price', { precision: 10, scale: 2 }).notNull(),
  label: varchar('label', { length: 50 }),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
