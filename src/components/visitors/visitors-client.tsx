'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addBlockedIp, updateBlockedIp, removeBlockedIp } from '@/actions/visitors'
import type { VisitorStats } from '@/actions/visitors'
import { Pencil, Trash2, Check, X, ShieldBan } from 'lucide-react'
import { toast } from 'sonner'

type BlockedIp = {
  id: number
  ip: string
  label: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

type Props = {
  stats: VisitorStats
  blockedIps: BlockedIp[]
  currentIp: string
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value.toLocaleString('es-AR')}</p>
    </div>
  )
}

export function VisitorsClient({ stats, blockedIps, currentIp }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editIp, setEditIp] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [newIp, setNewIp] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAddManual() {
    if (!newIp.trim()) return
    setAdding(true)
    try {
      await addBlockedIp(newIp.trim(), newLabel.trim() || undefined)
      toast.success(`IP ${newIp.trim()} bloqueada`)
      setNewIp('')
      setNewLabel('')
      router.refresh()
    } catch {
      toast.error('Error al bloquear IP')
    } finally {
      setAdding(false)
    }
  }

  const isCurrentIpBlocked = blockedIps.some(b => b.ip === currentIp)

  async function handleBlock(ip: string, label?: string) {
    try {
      await addBlockedIp(ip, label)
      toast.success(`IP ${ip} bloqueada`)
      router.refresh()
    } catch {
      toast.error('Error al bloquear IP')
    }
  }

  function startEdit(entry: BlockedIp) {
    setEditingId(entry.id)
    setEditIp(entry.ip)
    setEditLabel(entry.label ?? '')
  }

  async function saveEdit(id: number) {
    try {
      await updateBlockedIp(id, { ip: editIp, label: editLabel || undefined })
      toast.success('IP actualizada')
      setEditingId(null)
      router.refresh()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  async function handleRemove(id: number, ip: string) {
    if (!confirm(`¿Desbloquear ${ip}?`)) return
    try {
      await removeBlockedIp(id)
      toast.success('IP desbloqueada')
      router.refresh()
    } catch {
      toast.error('Error al desbloquear')
    }
  }

  return (
    <Tabs defaultValue="stats">
      <TabsList>
        <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        <TabsTrigger value="blocked">IPs bloqueadas</TabsTrigger>
      </TabsList>

      {/* ── Estadísticas tab ─────────────────────────────── */}
      <TabsContent value="stats" className="space-y-6 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Total vistas" value={stats.totalViews} />
          <KpiCard label="IPs únicas" value={stats.uniqueIps} />
          <KpiCard label="Hoy" value={stats.todayViews} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent views */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Últimas 50 visitas</h2>
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentViews.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Sin visitas registradas
                      </TableCell>
                    </TableRow>
                  )}
                  {stats.recentViews.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.ip ?? '—'}</TableCell>
                      <TableCell className="text-xs">{v.path}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(v.visitedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell>
                        {v.ip && !blockedIps.some(b => b.ip === v.ip) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Bloquear IP"
                            onClick={() => v.ip && handleBlock(v.ip)}
                          >
                            <ShieldBan className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Top paths */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Top paths</h2>
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Visitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topPaths.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                        Sin datos
                      </TableCell>
                    </TableRow>
                  )}
                  {stats.topPaths.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{p.path}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{p.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ── IPs bloqueadas tab ───────────────────────────── */}
      <TabsContent value="blocked" className="space-y-4 mt-4">
        {/* Current IP banner */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Tu IP actual</p>
            <p className="font-mono text-sm font-medium">{currentIp}</p>
          </div>
          {isCurrentIpBlocked
            ? <Badge className="bg-green-100 text-green-700 border-green-200">Ya bloqueada</Badge>
            : (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => handleBlock(currentIp, 'Mi IP')}
              >
                <ShieldBan className="h-3.5 w-3.5 mr-1.5" />Bloquear esta IP
              </Button>
            )
          }
        </div>

        {/* Add IP manually */}
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">IP a bloquear</p>
            <Input
              value={newIp}
              onChange={e => setNewIp(e.target.value)}
              placeholder="192.168.1.1"
              className="h-9 text-sm font-mono w-44"
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Label (opcional)</p>
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ej: Casa, Oficina..."
              className="h-9 text-sm w-40"
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            />
          </div>
          <Button size="sm" onClick={handleAddManual} disabled={adding || !newIp.trim()}>
            <ShieldBan className="h-3.5 w-3.5 mr-1.5" />Bloquear
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedIps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No hay IPs bloqueadas
                  </TableCell>
                </TableRow>
              )}
              {blockedIps.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">
                    {editingId === entry.id
                      ? <Input value={editIp} onChange={e => setEditIp(e.target.value)} className="h-7 text-xs w-36" />
                      : entry.ip
                    }
                  </TableCell>
                  <TableCell className="text-xs">
                    {editingId === entry.id
                      ? <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label..." className="h-7 text-xs w-28" />
                      : (entry.label ?? <span className="text-muted-foreground">—</span>)
                    }
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('es-AR') : '—'}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => saveEdit(entry.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemove(entry.id, entry.ip)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  )
}
