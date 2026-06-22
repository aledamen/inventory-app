import { pgTable, serial, text, integer, numeric, boolean, timestamp, varchar, date } from 'drizzle-orm/pg-core'

export const socialNetworks = pgTable('social_networks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const influencers = pgTable('influencers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  socialNetworkId: integer('social_network_id').references(() => socialNetworks.id, { onDelete: 'set null' }),
  socialUsername: text('social_username'),
  notes: text('notes'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  description: text('description'),
  discountType: text('discount_type').notNull().default('percentage'), // 'percentage' | 'fixed'
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric('min_order_amount', { precision: 10, scale: 2 }),
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  influencerId: integer('influencer_id').references(() => influencers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const influencerCompensationRules = pgTable('influencer_compensation_rules', {
  id: serial('id').primaryKey(),
  influencerId: integer('influencer_id').references(() => influencers.id, { onDelete: 'cascade' }).notNull(),
  trigger: text('trigger').notNull(), // 'sales_count' | 'revenue_amount' | 'per_post'
  triggerValue: numeric('trigger_value', { precision: 10, scale: 2 }),
  rewardProductId: integer('reward_product_id'), // no FK to avoid circular dep with products
  rewardQuantity: integer('reward_quantity').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const influencerPosts = pgTable('influencer_posts', {
  id: serial('id').primaryKey(),
  influencerId: integer('influencer_id').references(() => influencers.id, { onDelete: 'cascade' }).notNull(),
  postDate: date('post_date').notNull(),
  socialNetworkId: integer('social_network_id').references(() => socialNetworks.id, { onDelete: 'set null' }),
  contentType: text('content_type').notNull().default('post'), // 'story' | 'reel' | 'post' | 'otro'
  url: text('url'),
  notes: text('notes'),
  compensated: boolean('compensated').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const influencerDeliveries = pgTable('influencer_deliveries', {
  id: serial('id').primaryKey(),
  influencerId: integer('influencer_id').references(() => influencers.id, { onDelete: 'cascade' }).notNull(),
  deliveryDate: date('delivery_date').notNull(),
  productId: integer('product_id'), // no FK — preserved for history even if product deleted
  productName: text('product_name').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  trigger: text('trigger').notNull().default('manual'), // 'milestone_sales' | 'milestone_revenue' | 'post' | 'manual'
  triggerRef: text('trigger_ref'),
  status: text('status').notNull().default('pending'), // 'pending' | 'delivered'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// sale_id stored without FK to avoid circular dep with movements.ts
export const couponUses = pgTable('coupon_uses', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
  saleId: integer('sale_id'),
  source: text('source').notNull().default('manual'), // 'catalog' | 'manual'
  originalAmount: numeric('original_amount', { precision: 10, scale: 2 }).notNull(),
  discountApplied: numeric('discount_applied', { precision: 10, scale: 2 }).notNull(),
  finalAmount: numeric('final_amount', { precision: 10, scale: 2 }).notNull(),
  clientName: text('client_name'),
  clientPhone: text('client_phone'),
  usedAt: timestamp('used_at').defaultNow(),
})
