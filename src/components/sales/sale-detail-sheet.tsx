'use client'

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SaleWithProduct } from '@/types'

type Props = {
  sale: SaleWithProduct | null
  onOpenChange: (open: boolean) => void
}

export function SaleDetailSheet({ sale, onOpenChange }: Props) {
  return (
    <Sheet open={sale !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col gap-0 p-0">
        {sale && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle>Venta #{sale.saleNumber}</SheetTitle>
              <SheetDescription>{new Date(sale.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground">Producto</p>
                <p className="text-sm font-medium mt-0.5">
                  {sale.productName}
                  {sale.productFlavor && <span className="text-muted-foreground"> · {sale.productFlavor}</span>}
                </p>
                {sale.productSku && <p className="text-xs text-muted-foreground font-mono mt-0.5">{sale.productSku}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad</p>
                  <p className="text-sm font-medium mt-0.5">{sale.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio unitario</p>
                  <p className="text-sm font-medium mt-0.5">
                    {sale.effectivePrice ? `$${Number(sale.effectivePrice).toLocaleString('es-AR')}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {sale.saleValue ? `$${Number(sale.saleValue).toLocaleString('es-AR')}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ganancia neta</p>
                  <p className={`text-sm font-medium mt-0.5 ${Number(sale.netProfit ?? 0) >= 0 ? 'text-green-700' : 'text-destructive'}`}>
                    {sale.netProfit ? `$${Number(sale.netProfit).toLocaleString('es-AR')}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Método de pago</p>
                  <p className="text-sm font-medium mt-0.5">{sale.paymentMethod ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium mt-0.5">{sale.clientName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge
                    variant={sale.paid ? 'secondary' : 'destructive'}
                    className={cn('mt-0.5', sale.paid && 'text-green-700')}
                  >
                    {sale.paid ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              {sale.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{sale.notes}</p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
