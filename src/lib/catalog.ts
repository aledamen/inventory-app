export async function revalidateCatalog(): Promise<void> {
  const url = process.env.CATALOG_APP_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!url || !secret) return

  await fetch(`${url}/api/revalidate`, {
    method: 'POST',
    headers: { 'x-revalidate-secret': secret },
  }).catch(() => null)
}
