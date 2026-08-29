export async function triggerCatalogRevalidate() {
  const catalogUrl = process.env.CATALOG_APP_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!catalogUrl || !secret) return

  await fetch(`${catalogUrl}/api/revalidate`, {
    method: 'POST',
    headers: { 'x-revalidate-secret': secret },
  }).catch(() => null)
}
