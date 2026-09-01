'use server'

import { db } from '@/db'
import { recontactActions } from '@/db/schema'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { addDays, computeCascade, type CascadeResult } from '@/lib/recontact-cascade'

type RawRow = {
  client_id: number
  product_id: number
  sale_id: number
  sale_number: number
  last_sale_date: string
  sale_value: string | null
  contact_after_days: number
  product_name: string
  client_name: string
  client_phone: string | null
  status: string
  contacted_at: string | null
  notes: string | null
  purchase_count: string
}

export type RecontactRow = {
  clientId: number
  productId: number
  saleId: number
  saleNumber: number
  clientName: string
  clientPhone: string | null
  productName: string
  lastSaleDate: Date
  saleValue: number
  contactAfterDays: number
  dueDate: Date
  purchaseCount: number
  status: 'pendiente' | 'contactado' | 'no_quiere'
  contactedAt: Date | null
  notes: string | null
  cascade: CascadeResult
}

export type RecontactKpis = {
  escribirleYa: number
  estaSemana: number
  seguirlo: number
  clientesActivos: number
  recompras: number
  revenueTotal: number
}

export async function getRecontactData(): Promise<{ rows: RecontactRow[]; kpis: RecontactKpis }> {
  const result = await db.execute<RawRow>(sql`
    WITH latest AS (
      SELECT DISTINCT ON (s.client_id, p.name)
        s.client_id AS client_id, s.product_id AS product_id, s.id AS sale_id, s.sale_number AS sale_number,
        s.date AS last_sale_date, s.sale_value AS sale_value,
        p.contact_after_days AS contact_after_days, p.name AS product_name
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.client_id IS NOT NULL
        AND p.contact_after_days IS NOT NULL AND p.contact_after_days > 0
      ORDER BY s.client_id, p.name, s.date DESC, s.id DESC
    )
    SELECT l.client_id, l.product_id, l.sale_id, l.sale_number, l.last_sale_date, l.sale_value, l.contact_after_days, l.product_name,
           c.name AS client_name, c.phone AS client_phone,
           coalesce(ra.status, 'pendiente') AS status, ra.contacted_at AS contacted_at,
           coalesce(
             ra.notes,
             (SELECT ra2.notes FROM recontact_actions ra2
                JOIN sales s2 ON s2.id = ra2.sale_id
                JOIN products p2 ON p2.id = s2.product_id
               WHERE s2.client_id = l.client_id AND p2.name = l.product_name
                 AND ra2.notes IS NOT NULL
               ORDER BY s2.date DESC, s2.id DESC
               LIMIT 1)
           ) AS notes,
           (SELECT count(*) FROM sales s2
              JOIN products p2 ON p2.id = s2.product_id
              WHERE s2.client_id = l.client_id AND p2.name = l.product_name
                AND s2.client_id IS NOT NULL) AS purchase_count
    FROM latest l
    JOIN clients c ON c.id = l.client_id
    LEFT JOIN recontact_actions ra ON ra.sale_id = l.sale_id
    ORDER BY l.last_sale_date DESC
  `)

  const now = new Date()

  const rows: RecontactRow[] = result.rows.map(r => {
    const lastSaleDate = new Date(r.last_sale_date)
    const dueDate = addDays(lastSaleDate, r.contact_after_days)
    const status = r.status as RecontactRow['status']
    const contactedAt = r.contacted_at ? new Date(r.contacted_at) : null
    const cascade = computeCascade({ status, contactedAt, dueDate }, now)

    return {
      clientId: r.client_id,
      productId: r.product_id,
      saleId: r.sale_id,
      saleNumber: r.sale_number,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      productName: r.product_name,
      lastSaleDate,
      saleValue: Number(r.sale_value ?? 0),
      contactAfterDays: r.contact_after_days,
      dueDate,
      purchaseCount: Number(r.purchase_count),
      status,
      contactedAt,
      notes: r.notes,
      cascade,
    }
  })

  const active = rows.filter(r => r.cascade.kind !== 'closed')
  const kpis: RecontactKpis = {
    escribirleYa: rows.filter(r => r.cascade.kind === 'escribirle_ya').length,
    estaSemana: rows.filter(r => r.cascade.kind === 'esta_semana').length,
    seguirlo: rows.filter(r => r.cascade.kind === 'seguirlo').length,
    clientesActivos: new Set(active.map(r => r.clientId)).size,
    recompras: rows.filter(r => r.purchaseCount > 1).length,
    revenueTotal: rows.reduce((sum, r) => sum + r.saleValue, 0),
  }

  return { rows, kpis }
}

export async function upsertRecontactAction(data: {
  saleId: number
  clientId: number
  productId: number
  status: 'pendiente' | 'contactado' | 'no_quiere'
  contactedAt?: Date | null
  notes?: string | null
}) {
  await db.insert(recontactActions)
    .values({
      saleId: data.saleId,
      clientId: data.clientId,
      productId: data.productId,
      status: data.status,
      contactedAt: data.contactedAt ?? null,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [recontactActions.saleId],
      set: {
        status: data.status,
        contactedAt: data.contactedAt ?? null,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        updatedAt: new Date(),
      },
    })

  revalidatePath('/dashboard/recontacto')
  revalidatePath('/dashboard')
}

export async function markContactado(saleId: number, clientId: number, productId: number) {
  await upsertRecontactAction({ saleId, clientId, productId, status: 'contactado', contactedAt: new Date() })
}

export async function markNoQuiere(saleId: number, clientId: number, productId: number) {
  await upsertRecontactAction({ saleId, clientId, productId, status: 'no_quiere' })
}

export async function reopenPair(saleId: number, clientId: number, productId: number) {
  await upsertRecontactAction({ saleId, clientId, productId, status: 'pendiente', contactedAt: null })
}

export async function updateNotes(saleId: number, clientId: number, productId: number, notes: string | null) {
  await db.insert(recontactActions)
    .values({
      saleId,
      clientId,
      productId,
      status: 'pendiente',
      notes,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [recontactActions.saleId],
      set: {
        notes,
        updatedAt: new Date(),
      },
    })

  revalidatePath('/dashboard/recontacto')
  revalidatePath('/dashboard')
}

export type HistoryRow = {
  saleId: number
  clientName: string
  productName: string
  saleDate: Date
  saleValue: number
  status: 'pendiente' | 'contactado' | 'no_quiere'
  contactedAt: Date | null
  notes: string | null
}

type RawHistoryRow = {
  sale_id: number
  sale_date: string
  sale_value: string | null
  client_name: string
  product_name: string
  status: string
  contacted_at: string | null
  notes: string | null
  total_count: string
}

export async function getRecontactHistory({ page, pageSize }: { page: number; pageSize: number }): Promise<{ rows: HistoryRow[]; total: number }> {
  const offset = (page - 1) * pageSize

  const result = await db.execute<RawHistoryRow>(sql`
    WITH eligible AS (
      SELECT s.id AS sale_id, s.client_id, s.product_id, s.date AS sale_date, s.sale_value AS sale_value,
             c.name AS client_name, p.name AS product_name
      FROM sales s
      JOIN products p ON p.id = s.product_id
      JOIN clients c ON c.id = s.client_id
      WHERE s.client_id IS NOT NULL
        AND p.contact_after_days IS NOT NULL AND p.contact_after_days > 0
    ),
    latest_ids AS (
      SELECT DISTINCT ON (client_id, product_name) sale_id
      FROM eligible
      ORDER BY client_id, product_name, sale_date DESC, sale_id DESC
    )
    SELECT e.sale_id, e.sale_date, e.sale_value, e.client_name, e.product_name,
           coalesce(ra.status, 'pendiente') AS status, ra.contacted_at AS contacted_at, ra.notes AS notes,
           count(*) OVER() AS total_count
    FROM eligible e
    LEFT JOIN recontact_actions ra ON ra.sale_id = e.sale_id
    WHERE e.sale_id NOT IN (SELECT sale_id FROM latest_ids)
    ORDER BY e.sale_date DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `)

  const rows: HistoryRow[] = result.rows.map(r => ({
    saleId: r.sale_id,
    clientName: r.client_name,
    productName: r.product_name,
    saleDate: new Date(r.sale_date),
    saleValue: Number(r.sale_value ?? 0),
    status: r.status as HistoryRow['status'],
    contactedAt: r.contacted_at ? new Date(r.contacted_at) : null,
    notes: r.notes,
  }))

  const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0

  return { rows, total }
}
