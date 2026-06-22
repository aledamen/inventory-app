'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  createCompensationRule, deleteCompensationRule, updateCompensationRule,
  createPost, deletePost,
  createDelivery, markDeliveryDelivered, deleteDelivery,
} from '@/actions/influencer-compensations'
import type { InfluencerProfile, CompensationRule } from '@/actions/influencer-compensations'
import type { SocialNetwork } from '@/actions/social-networks'
import { Plus, Trash2, CheckCircle2, TrendingUp, Package, FileText } from 'lucide-react'
import { toast } from 'sonner'

type Product = { id: number; name: string; flavor: string | null }

type Props = {
  profile: InfluencerProfile
  products: Product[]
  socialNetworks: SocialNetwork[]
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function triggerLabel(trigger: string) {
  switch (trigger) {
    case 'sales_count': return 'Cantidad de ventas'
    case 'revenue_amount': return 'Monto de ventas'
    case 'per_post': return 'Por posteo'
    default: return trigger
  }
}

function deliveryTriggerLabel(trigger: string) {
  switch (trigger) {
    case 'milestone_sales': return 'Meta ventas'
    case 'milestone_revenue': return 'Meta revenue'
    case 'post': return 'Posteo'
    case 'manual': return 'Manual'
    default: return trigger
  }
}

// ─── Stats header ─────────────────────────────────────────────────────────────

function StatsBar({ profile }: { profile: InfluencerProfile }) {
  const pendingCount = profile.deliveries.filter(d => d.status === 'pending').length
  const uncompensatedPosts = profile.posts.filter(p => !p.compensated).length

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
      {[
        { label: 'Ventas totales', value: profile.totalSalesCount, icon: TrendingUp },
        { label: 'Revenue total', value: fmt(profile.totalRevenue), icon: TrendingUp },
        { label: 'Entregas pendientes', value: pendingCount, icon: Package, alert: pendingCount > 0 },
        { label: 'Posts sin compensar', value: uncompensatedPosts, icon: FileText, alert: uncompensatedPosts > 0 },
      ].map(card => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.alert ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30' : 'border-border bg-card'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.alert ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Rules tab ────────────────────────────────────────────────────────────────

function RuleDialog({
  influencerId,
  rule,
  products,
}: {
  influencerId: number
  rule?: CompensationRule
  products: Product[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trigger, setTrigger] = useState(rule?.trigger ?? 'sales_count')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const triggerVal = fd.get('triggerValue') ? Number(fd.get('triggerValue')) : null
    const rewardProductId = fd.get('rewardProductId') ? Number(fd.get('rewardProductId')) : null
    try {
      if (rule) {
        await updateCompensationRule(rule.id, {
          trigger,
          triggerValue: triggerVal,
          rewardProductId,
          rewardQuantity: Number(fd.get('rewardQuantity') ?? 1),
          notes: (fd.get('notes') as string) || null,
        })
        toast.success('Regla actualizada')
      } else {
        await createCompensationRule({
          influencerId,
          trigger,
          triggerValue: triggerVal,
          rewardProductId,
          rewardQuantity: Number(fd.get('rewardQuantity') ?? 1),
          notes: (fd.get('notes') as string) || null,
        })
        toast.success('Regla creada')
      }
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={rule
        ? <Button variant="ghost" size="sm">Editar</Button>
        : <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva regla</Button>}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo de trigger</Label>
            <Select
              value={trigger}
              onValueChange={(v) => setTrigger(v ?? 'sales_count')}
              items={[
                { value: 'sales_count', label: 'Cantidad de ventas' },
                { value: 'revenue_amount', label: 'Monto de ventas ($)' },
                { value: 'per_post', label: 'Por posteo' },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_count">Cantidad de ventas</SelectItem>
                <SelectItem value="revenue_amount">Monto de ventas ($)</SelectItem>
                <SelectItem value="per_post">Por posteo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trigger !== 'per_post' && (
            <div className="space-y-1.5">
              <Label htmlFor="triggerValue">
                {trigger === 'sales_count' ? 'Cada N ventas' : 'Cada $X en ventas'}
              </Label>
              <Input
                id="triggerValue"
                name="triggerValue"
                type="number"
                min={1}
                required
                defaultValue={rule?.triggerValue ?? ''}
                placeholder={trigger === 'sales_count' ? 'Ej: 10' : 'Ej: 50000'}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Producto a dar</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="rewardQuantity" className="text-muted-foreground">Cantidad</Label>
                <Input
                  id="rewardQuantity"
                  name="rewardQuantity"
                  type="number"
                  min={1}
                  defaultValue={rule?.rewardQuantity ?? 1}
                  className="w-16 text-center"
                />
              </div>
            </div>
            <Select
              name="rewardProductId"
              defaultValue={rule?.rewardProductId ? String(rule.rewardProductId) : ''}
              items={[
                { value: '', label: 'Sin especificar' },
                ...products.map(p => ({ value: String(p.id), label: p.flavor ? `${p.name} (${p.flavor})` : p.name })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent className="max-w-sm">
                <SelectItem value="">Sin especificar</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.flavor ? `${p.name} (${p.flavor})` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={rule?.notes ?? ''} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RulesTab({ profile, products }: { profile: InfluencerProfile; products: Product[] }) {
  const router = useRouter()

  async function handleDeleteRule(id: number) {
    if (!confirm('¿Eliminar esta regla?')) return
    await deleteCompensationRule(id)
    toast.success('Regla eliminada')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">
          {profile.rules.length === 0 ? 'Sin reglas configuradas' : `${profile.rules.length} regla${profile.rules.length > 1 ? 's' : ''}`}
        </p>
        <RuleDialog influencerId={profile.id} products={products} />
      </div>

      {/* Milestone progress */}
      {profile.milestones.length > 0 && (
        <div className="space-y-3">
          {profile.milestones.map(m => {
            const pct = m.triggerValue
              ? Math.min(100, Math.round(
                  (m.trigger === 'sales_count' ? m.currentSalesCount : m.currentRevenue) / m.triggerValue * 100
                ))
              : 0
            return (
              <div key={m.ruleId} className={`rounded-lg border p-4 ${m.reached ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {m.trigger === 'sales_count'
                      ? `${m.currentSalesCount} / ${m.triggerValue} ventas`
                      : `${fmt(m.currentRevenue)} / ${fmt(m.triggerValue ?? 0)} en ventas`}
                  </span>
                  {m.reached && (
                    <Badge className="bg-green-500 text-white">
                      {m.pendingDeliveries > 0 ? `${m.pendingDeliveries} entrega pendiente` : '✓ Meta alcanzada'}
                    </Badge>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${m.reached ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Umbral</TableHead>
              <TableHead>Premio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profile.rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Agregá una regla para empezar a trackear compensaciones
                </TableCell>
              </TableRow>
            )}
            {profile.rules.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{triggerLabel(r.trigger)}</TableCell>
                <TableCell>
                  {r.triggerValue
                    ? r.trigger === 'sales_count'
                      ? `${r.triggerValue} ventas`
                      : fmt(Number(r.triggerValue))
                    : '—'}
                </TableCell>
                <TableCell>
                  {products.find(p => p.id === r.rewardProductId)?.name ?? '—'} × {r.rewardQuantity}
                </TableCell>
                <TableCell>
                  <Badge variant={r.active ? 'default' : 'secondary'}>
                    {r.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <RuleDialog influencerId={profile.id} rule={r} products={products} />
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRule(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Posts tab ────────────────────────────────────────────────────────────────

function PostDialog({
  influencerId,
  socialNetworks,
}: {
  influencerId: number
  socialNetworks: SocialNetwork[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await createPost({
        influencerId,
        postDate: fd.get('postDate') as string,
        socialNetworkId: fd.get('socialNetworkId') ? Number(fd.get('socialNetworkId')) : null,
        contentType: fd.get('contentType') as string,
        url: (fd.get('url') as string) || null,
        notes: (fd.get('notes') as string) || null,
      })
      toast.success('Post registrado')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar post</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Registrar post</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postDate">Fecha *</Label>
              <Input
                id="postDate" name="postDate" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select name="contentType" defaultValue="post"
                items={['post','reel','story','otro'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['post','reel','story','otro'].map(v => (
                    <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Red social</Label>
            <Select name="socialNetworkId" defaultValue=""
              items={[{ value: '', label: 'Sin especificar' }, ...socialNetworks.filter(n => n.active).map(n => ({ value: String(n.id), label: n.name }))]}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin especificar</SelectItem>
                {socialNetworks.filter(n => n.active).map(n => (
                  <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">URL del post</Label>
            <Input id="url" name="url" type="url" placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeliveryFromPostDialog({
  influencerId,
  postId,
  products,
}: {
  influencerId: number
  postId: number
  products: Product[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const productId = fd.get('productId') ? Number(fd.get('productId')) : null
    const product = products.find(p => p.id === productId)
    try {
      await createDelivery({
        influencerId,
        deliveryDate: new Date().toISOString().split('T')[0],
        productId,
        productName: product ? (product.flavor ? `${product.name} (${product.flavor})` : product.name) : (fd.get('productName') as string ?? 'Sin especificar'),
        quantity: Number(fd.get('quantity') ?? 1),
        trigger: 'post',
        triggerRef: `Post #${postId}`,
        notes: (fd.get('notes') as string) || null,
        postId,
      })
      toast.success('Entrega registrada y post marcado como compensado')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">Compensar</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Registrar entrega por post</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Producto</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="qty" className="text-muted-foreground">Cantidad</Label>
                <Input id="qty" name="quantity" type="number" min={1} defaultValue={1} className="w-16 text-center" />
              </div>
            </div>
            <Select name="productId" defaultValue=""
              items={[{ value: '', label: 'Sin especificar' }, ...products.map(p => ({ value: String(p.id), label: p.flavor ? `${p.name} (${p.flavor})` : p.name }))]}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="max-w-sm">
                <SelectItem value="">Sin especificar</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.flavor ? `${p.name} (${p.flavor})` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dnotes">Notas</Label>
            <Textarea id="dnotes" name="notes" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Confirmar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PostsTab({
  profile,
  products,
  socialNetworks,
}: {
  profile: InfluencerProfile
  products: Product[]
  socialNetworks: SocialNetwork[]
}) {
  const router = useRouter()

  async function handleDeletePost(id: number) {
    if (!confirm('¿Eliminar este post?')) return
    await deletePost(id)
    toast.success('Post eliminado')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">
          {profile.posts.filter(p => !p.compensated).length} posts sin compensar · {profile.posts.length} total
        </p>
        <PostDialog influencerId={profile.id} socialNetworks={socialNetworks} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Red</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profile.posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin posts registrados
                </TableCell>
              </TableRow>
            )}
            {profile.posts.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.postDate).toLocaleDateString('es-AR')}</TableCell>
                <TableCell className="capitalize text-sm">{p.contentType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.socialNetworkName ?? '—'}</TableCell>
                <TableCell>
                  {p.url
                    ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">ver</a>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={p.compensated ? 'secondary' : 'outline'} className={p.compensated ? '' : 'border-orange-400 text-orange-600'}>
                    {p.compensated ? 'Compensado' : 'Pendiente'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!p.compensated && (
                      <DeliveryFromPostDialog
                        influencerId={profile.id}
                        postId={p.id}
                        products={products}
                      />
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeletePost(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Deliveries tab ───────────────────────────────────────────────────────────

function ManualDeliveryDialog({ influencerId, products }: { influencerId: number; products: Product[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const productId = fd.get('productId') ? Number(fd.get('productId')) : null
    const product = products.find(p => p.id === productId)
    try {
      await createDelivery({
        influencerId,
        deliveryDate: fd.get('deliveryDate') as string,
        productId,
        productName: product ? (product.flavor ? `${product.name} (${product.flavor})` : product.name) : 'Sin especificar',
        quantity: Number(fd.get('quantity') ?? 1),
        trigger: 'manual',
        triggerRef: (fd.get('triggerRef') as string) || null,
        notes: (fd.get('notes') as string) || null,
      })
      toast.success('Entrega registrada')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Nueva entrega</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Registrar entrega</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Producto</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="dqty" className="text-muted-foreground">Cantidad</Label>
                <Input id="dqty" name="quantity" type="number" min={1} defaultValue={1} className="w-16 text-center" />
              </div>
            </div>
            <Select name="productId" defaultValue=""
              items={[{ value: '', label: 'Sin especificar' }, ...products.map(p => ({ value: String(p.id), label: p.flavor ? `${p.name} (${p.flavor})` : p.name }))]}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="max-w-sm">
                <SelectItem value="">Sin especificar</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.flavor ? `${p.name} (${p.flavor})` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deliveryDate">Fecha</Label>
              <Input
                id="deliveryDate" name="deliveryDate" type="date" required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="triggerRef">Referencia (opcional)</Label>
              <Input id="triggerRef" name="triggerRef" placeholder="Ej: 10 ventas mayo" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dnotes">Notas</Label>
            <Textarea id="dnotes" name="notes" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeliveriesTab({ profile, products }: { profile: InfluencerProfile; products: Product[] }) {
  const router = useRouter()

  async function handleMarkDelivered(id: number) {
    await markDeliveryDelivered(id)
    toast.success('Marcado como entregado')
    router.refresh()
  }

  async function handleDeleteDelivery(id: number) {
    if (!confirm('¿Eliminar esta entrega?')) return
    await deleteDelivery(id)
    toast.success('Entrega eliminada')
    router.refresh()
  }

  const pending = profile.deliveries.filter(d => d.status === 'pending')
  const delivered = profile.deliveries.filter(d => d.status === 'delivered')

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <p className="text-sm text-muted-foreground">
          {pending.length} pendiente{pending.length !== 1 ? 's' : ''} · {delivered.length} entregada{delivered.length !== 1 ? 's' : ''}
        </p>
        <ManualDeliveryDialog influencerId={profile.id} products={products} />
      </div>

      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Pendientes</p>
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.productName}</TableCell>
                    <TableCell>{d.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {deliveryTriggerLabel(d.trigger)}
                      {d.triggerRef && <span className="ml-1 text-xs">· {d.triggerRef}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.deliveryDate).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleMarkDelivered(d.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />Entregar
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDelivery(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {delivered.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Historial</p>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivered.map(d => (
                  <TableRow key={d.id} className="opacity-70">
                    <TableCell className="font-medium">{d.productName}</TableCell>
                    <TableCell>{d.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {deliveryTriggerLabel(d.trigger)}
                      {d.triggerRef && <span className="ml-1 text-xs">· {d.triggerRef}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.deliveryDate).toLocaleDateString('es-AR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {profile.deliveries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Sin entregas registradas todavía
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InfluencerProfileClient({ profile, products, socialNetworks }: Props) {
  const pendingCount = profile.deliveries.filter(d => d.status === 'pending').length
  const uncompensatedPosts = profile.posts.filter(p => !p.compensated).length

  return (
    <div>
      <StatsBar profile={profile} />

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">
            Reglas
            {profile.rules.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{profile.rules.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts">
            Posts
            {uncompensatedPosts > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-100 text-orange-600 px-1.5 py-0.5 text-xs">{uncompensatedPosts}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            Entregas
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-100 text-orange-600 px-1.5 py-0.5 text-xs">{pendingCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="rules">
            <RulesTab profile={profile} products={products} />
          </TabsContent>
          <TabsContent value="posts">
            <PostsTab profile={profile} products={products} socialNetworks={socialNetworks} />
          </TabsContent>
          <TabsContent value="deliveries">
            <DeliveriesTab profile={profile} products={products} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
