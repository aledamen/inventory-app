import { getCouponAnalytics } from '@/actions/coupons'
import { MarketingAnalyticsClient } from '@/components/marketing/marketing-analytics-client'

export default async function MarketingPage() {
  const { influencerStats, monthlyStats, useDetails } = await getCouponAnalytics()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analítica de Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">Rendimiento de cupones e influencers</p>
      </div>
      <MarketingAnalyticsClient
        influencerStats={influencerStats}
        monthlyStats={monthlyStats}
        useDetails={useDetails}
      />
    </div>
  )
}
