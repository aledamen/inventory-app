'use client'

import { useEffect, useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getRecontactHistory } from '@/actions/recontacto'
import type { HistoryRow } from '@/actions/recontacto'

const PAGE_SIZE = 20

const $ = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

function statusBadge(status: HistoryRow['status']) {
  switch (status) {
    case 'contactado':
      return <Badge variant="secondary">Contactado</Badge>
    case 'no_quiere':
      return <Badge variant="outline" className="text-muted-foreground">No quiere</Badge>
    case 'pendiente':
      return <Badge variant="outline">Sin acción</Badge>
  }
}

export function RecontactHistoryTable() {
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getRecontactHistory({ page, pageSize: PAGE_SIZE }).then(data => {
      if (cancelled) return
      setRows(data.rows)
      setTotal(data.total)
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setLoading(false)
      toast.error('Error al cargar el historial')
    })
    return () => { cancelled = true }
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function goPrev() {
    setLoading(true)
    setPage(p => Math.max(1, p - 1))
  }

  function goNext() {
    setLoading(true)
    setPage(p => Math.min(totalPages, p + 1))
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Fecha de venta</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado final</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin historial</TableCell>
              </TableRow>
            )}
            {!loading && rows.map(r => (
              <TableRow key={r.saleId}>
                <TableCell className="font-medium">{r.clientName}</TableCell>
                <TableCell className="text-sm">{r.productName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.saleDate.toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="text-sm">{$(r.saleValue)}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-64">{r.notes ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={goPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={goNext}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
