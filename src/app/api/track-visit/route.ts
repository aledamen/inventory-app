import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { catalogViews, blockedIps } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { path, ip, userAgent } = await req.json() as { path: string; ip: string; userAgent: string }
    if (!ip || !path) return NextResponse.json({ ok: false })

    // Check if IP is blocked
    const blocked = await db.select().from(blockedIps).where(eq(blockedIps.ip, ip)).limit(1)
    if (blocked.length > 0) return NextResponse.json({ ok: false, blocked: true })

    await db.insert(catalogViews).values({ path, ip, userAgent })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
