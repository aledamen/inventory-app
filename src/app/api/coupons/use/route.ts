import { NextRequest, NextResponse } from 'next/server'
import { recordCouponUse } from '@/actions/coupons'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.couponId || !data.originalAmount) {
      return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 })
    }
    await recordCouponUse({
      couponId: data.couponId,
      saleId: data.saleId,
      source: 'catalog',
      originalAmount: data.originalAmount,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al registrar el uso'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
