'use client'

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
} from 'lucide-react'

const navItems = [
  { group: 'Principal', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/analytics', label: 'Analítica', icon: BarChart3 },
  ]},
  { group: 'Inventario', items: [
    { href: '/dashboard/products', label: 'Productos', icon: Package },
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
  { group: 'Finanzas', items: [
    { href: '/dashboard/expenses', label: 'Gastos', icon: Receipt },
  ]},
  { group: 'Sistema', items: [
    { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
      className="w-56 shrink-0 flex flex-col"
    >
      {/* Logo */}
      <div className="px-5 py-5 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Stock Manager</span>
        </div>
      </div>

      {/* Nav */}
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

      {/* User */}
      <div
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
        className="px-4 py-4 flex items-center gap-3"
      >
        <UserButton />
        <span style={{ color: 'var(--sidebar-foreground)' }} className="text-xs truncate">
          Mi cuenta
        </span>
      </div>
    </aside>
  )
}
