import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const catalogViews = pgTable('catalog_views', {
  id: serial('id').primaryKey(),
  path: varchar('path', { length: 500 }).notNull(),
  ip: varchar('ip', { length: 100 }),
  userAgent: text('user_agent'),
  visitedAt: timestamp('visited_at').defaultNow().notNull(),
})

export const blockedIps = pgTable('blocked_ips', {
  id: serial('id').primaryKey(),
  ip: varchar('ip', { length: 100 }).unique().notNull(),
  label: varchar('label', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
