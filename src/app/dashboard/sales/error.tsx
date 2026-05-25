'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function SalesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Sales page error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-muted-foreground">
        {error.message || 'Error al cargar las ventas'}
      </p>
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </div>
  )
}
