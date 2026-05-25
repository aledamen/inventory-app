import { NextResponse } from 'next/server'
import { getSiteConfig } from '@/actions/site-config'

export const revalidate = 60

export async function GET() {
  const config = await getSiteConfig()
  return NextResponse.json(config, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
