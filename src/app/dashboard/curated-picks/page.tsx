import { getCuratedPicks } from '@/actions/curated-picks'
import { getCombosFull } from '@/actions/combos'
import { CuratedPicksClient } from '@/components/curated-picks/curated-picks-client'

export default async function CuratedPicksPage() {
  const [picks, combos] = await Promise.all([getCuratedPicks(), getCombosFull()])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empezá por acá</h1>
        <p className="text-sm text-muted-foreground mt-1">Combos destacados en la sección de arriba del catálogo. Se recomiendan 3, pero podés tener menos o más.</p>
      </div>
      <CuratedPicksClient picks={picks} combos={combos} />
    </div>
  )
}
