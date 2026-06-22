import { getCoupons, getCouponUses } from '@/actions/coupons'
import { getInfluencers } from '@/actions/influencers'
import { CouponsClient } from '@/components/coupons/coupons-client'

export default async function CouponsPage() {
  const [coupons, couponUses, influencers] = await Promise.all([
    getCoupons(),
    getCouponUses(),
    getInfluencers(),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cupones</h1>
        <p className="text-sm text-muted-foreground mt-1">{coupons.length} cupones — {couponUses.length} usos registrados</p>
      </div>
      <CouponsClient coupons={coupons} couponUses={couponUses} influencers={influencers} />
    </div>
  )
}
