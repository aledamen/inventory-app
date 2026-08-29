import { pgTable, serial, integer, text, varchar, timestamp } from 'drizzle-orm/pg-core'

export const curatedPicks = pgTable('curated_picks', {
  id: serial('id').primaryKey(),
  position: integer('position').notNull(),
  headline: text('headline').notNull(),
  description: text('description'),
  comboSku: varchar('combo_sku', { length: 100 }).notNull(), // soft ref, no FK — forward-refs to not-yet-created combos must stay valid (proposal scope-out)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
