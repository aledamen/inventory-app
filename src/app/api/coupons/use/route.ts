import { NextRequest, NextResponse } from 'next/server'
import { recordCouponUse } from '@/actions/coupons'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    if (!data.couponId || !data.originalAmount || !data.discountApplied || !data.finalAmount) {
      return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 })
    }
    await recordCouponUse({
      couponId: data.couponId,
      saleId: data.saleId,
      source: 'catalog',
      originalAmount: data.originalAmount,
      discountApplied: data.discountApplied,
      finalAmount: data.finalAmount,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Error al registrar el uso' }, { status: 500 })
  }
}
