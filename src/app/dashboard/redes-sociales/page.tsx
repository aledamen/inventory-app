import { getSocialNetworks } from '@/actions/social-networks'
import { SocialNetworksClient } from '@/components/social-networks/social-networks-client'

export default async function RedesSocialesPage() {
  const networks = await getSocialNetworks()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Redes Sociales</h1>
        <p className="text-sm text-muted-foreground mt-1">Administrá las redes sociales disponibles para asociar a influencers</p>
      </div>
      <SocialNetworksClient networks={networks} />
    </div>
  )
}
