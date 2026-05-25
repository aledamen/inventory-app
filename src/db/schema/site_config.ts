import { pgTable, serial, varchar, text } from 'drizzle-orm/pg-core'

export const siteConfig = pgTable('site_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value'),
})
