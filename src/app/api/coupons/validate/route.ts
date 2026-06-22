import { NextRequest, NextResponse } from 'next/server'
import { validateCoupon } from '@/actions/coupons'

export async function POST(req: NextRequest) {
  try {
    const { code, amount } = await req.json()
    if (!code || typeof amount !== 'number') {
      return NextResponse.json({ valid: false, error: 'Parámetros inválidos' }, { status: 400 })
    }
    const result = await validateCoupon(code, amount)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ valid: false, error: 'Error al validar el cupón' }, { status: 500 })
  }
}
