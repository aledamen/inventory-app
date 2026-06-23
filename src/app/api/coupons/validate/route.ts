import { NextRequest, NextResponse } from 'next/server'
import { validateCoupon } from '@/actions/coupons'

const CORS = {
  'Access-Control-Allow-Origin': 'https://fase-beta.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const { code, amount } = await req.json()
    if (!code || typeof amount !== 'number') {
      return NextResponse.json({ valid: false, error: 'Parámetros inválidos' }, { status: 400, headers: CORS })
    }
    const result = await validateCoupon(code, amount)
    return NextResponse.json(result, { headers: CORS })
  } catch {
    return NextResponse.json({ valid: false, error: 'Error al validar el cupón' }, { status: 500, headers: CORS })
  }
}
