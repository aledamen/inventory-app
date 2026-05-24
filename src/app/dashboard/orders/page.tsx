import { getOrders } from '@/actions/orders'
import { getProducts } from '@/actions/products'
import { getClients } from '@/actions/clients'
import { OrdersTable } from '@/components/orders/orders-table'
import { OrderFormDialog } from '@/components/orders/order-form-dialog'

export default async function OrdersPage() {
  const [ordersData, productsData, clientsData] = await Promise.all([
    getOrders(),
    getProducts(),
    getClients(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">Pedidos pendientes — del presupuesto a la entrega</p>
        </div>
        <OrderFormDialog products={productsData} clients={clientsData} />
      </div>
      <OrdersTable orders={ordersData} />
    </div>
  )
}
