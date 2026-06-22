'use server'

import { db } from '@/db'
import { auditLog } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function getAuditLogs(limit = 500) {
  return db.select().from(auditLog).orderBy(desc(auditLog.fecha)).limit(limit)
}
