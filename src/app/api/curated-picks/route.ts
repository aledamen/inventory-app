import { NextResponse } from 'next/server'
import { getCuratedPicks } from '@/actions/curated-picks'
import { buildComboEntries } from '@/actions/catalog-combos'

export const revalidate = 0

export async function GET() {
  const picks = await getCuratedPicks()

  const comboEntries = await buildComboEntries(picks.map(p => p.comboSku))

  const data = picks
    .map(pick => {
      const product = comboEntries[`combo__${pick.comboSku}`]
      if (!product) return null
      return {
        position: pick.position,
        headline: pick.headline,
        subheadline: pick.subheadline,
        description: pick.description,
        product,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
