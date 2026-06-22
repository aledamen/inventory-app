import { getInfluencers } from '@/actions/influencers'
import { getSocialNetworks } from '@/actions/social-networks'
import { InfluencersClient } from '@/components/influencers/influencers-client'

export default async function InfluencersPage() {
  const [influencers, socialNetworks] = await Promise.all([
    getInfluencers(),
    getSocialNetworks(),
  ])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Influencers</h1>
        <p className="text-sm text-muted-foreground mt-1">Administrá los influencers asociados a cupones</p>
      </div>
      <InfluencersClient influencers={influencers} socialNetworks={socialNetworks} />
    </div>
  )
}
