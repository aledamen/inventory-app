import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getInfluencerProfile } from '@/actions/influencer-compensations'
import { getProducts } from '@/actions/products'
import { getSocialNetworks } from '@/actions/social-networks'
import { InfluencerProfileClient } from '@/components/influencers/influencer-profile-client'

export default async function InfluencerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const influencerId = Number(id)
  if (isNaN(influencerId)) notFound()

  const [profile, products, socialNetworks] = await Promise.all([
    getInfluencerProfile(influencerId),
    getProducts(),
    getSocialNetworks(),
  ])

  if (!profile) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/influencers"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Influencers
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.socialNetworkName && profile.socialUsername
              ? `${profile.socialNetworkName} · @${profile.socialUsername}`
              : profile.socialUsername
              ? `@${profile.socialUsername}`
              : 'Sin red social'}
            {profile.couponCode && (
              <span className="ml-3 font-mono font-semibold text-foreground">
                #{profile.couponCode}
              </span>
            )}
          </p>
        </div>
      </div>

      <InfluencerProfileClient
        profile={profile}
        products={products}
        socialNetworks={socialNetworks}
      />
    </div>
  )
}
