import { pgTable, serial, varchar } from 'drizzle-orm/pg-core'

export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }).notNull().default('#EF4444'),
  textColor: varchar('text_color', { length: 20 }).notNull().default('#FFFFFF'),
  position: varchar('position', { length: 20 }).notNull().default('bottom'),
})
