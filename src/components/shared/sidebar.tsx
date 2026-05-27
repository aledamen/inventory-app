'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  ArrowDownToLine,
  Receipt,
  Settings,
  BarChart3,
  Users,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  ClipboardList,
  Menu,
  X,
  Store,
  PackagePlus,
  Eye,
  Wallet,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { group: 'Principal', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/analytics', label: 'Analítica', icon: BarChart3 },
  ]},
  { group: 'Inventario', items: [
    { href: '/dashboard/products', label: 'Productos', icon: Package },
    { href: '/dashboard/combos', label: 'Combos', icon: PackagePlus },
    { href: '/dashboard/stock', label: 'Entradas', icon: ArrowDownToLine },
    { href: '/dashboard/adjustments', label: 'Ajustes', icon: SlidersHorizontal },
    { href: '/dashboard/pricing', label: 'Precios', icon: TrendingUp },
  ]},
  { group: 'Operaciones', items: [
    { href: '/dashboard/sales', label: 'Ventas', icon: ShoppingCart },
    { href: '/dashboard/orders', label: 'Pedidos', icon: ClipboardList },
    { href: '/dashboard/returns', label: 'Devoluciones', icon: RotateCcw },
  ]},
  { group: 'CRM', items: [
    { href: '/dashboard/clients', label: 'Clientes', icon: Users },
    { href: '/dashboard/suppliers', label: 'Proveedores', icon: Truck },
  ]},
  { group: 'Catálogo', items: [
    { href: '/dashboard/cms', label: 'CMS', icon: Store },
    { href: '/dashboard/visitors', label: 'Visitantes', icon: Eye },
  ]},
  { group: 'Finanzas', items: [
    { href: '/dashboard/caja', label: 'Caja', icon: Wallet },
    { href: '/dashboard/expenses', label: 'Gastos', icon: Receipt },
  ]},
  { group: 'Sistema', items: [
    { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
  ]},
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <nav className="flex-1 px-3 overflow-y-auto space-y-3 py-1">
        {navItems.map(({ group, items }) => (
          <div key={group}>
            <p
              style={{ color: 'var(--sidebar-foreground)' }}
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest opacity-50"
            >
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    style={{
                      color: isActive ? 'var(--sidebar-primary)' : 'var(--sidebar-foreground)',
                      background: isActive ? 'var(--sidebar-accent)' : 'transparent',
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                      !isActive && 'hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive && 'text-primary')} />
                    {label}
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
        className="px-4 py-4 flex items-center gap-3"
      >
        <UserButton />
        <span style={{ color: 'var(--sidebar-foreground)' }} className="text-xs truncate flex-1">Mi cuenta</span>
        <ThemeToggle />
      </div>
    </>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
        className="hidden lg:flex w-56 shrink-0 flex-col h-screen"
      >
        <div className="px-5 py-5 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Stock Manager</span>
          </div>
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <div
        style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}
        className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
      >
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Package className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Stock Manager</span>
        </div>
        <UserButton />
      </div>

      {/* ── Mobile backdrop ─────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────── */}
      <aside
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-5 py-4 flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Stock Manager</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <NavContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}
