import { getSuppliers } from '@/actions/suppliers'
import { SuppliersTable } from '@/components/suppliers/suppliers-table'
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog'

export default async function SuppliersPage() {
  const suppliersData = await getSuppliers()

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de proveedores e historial de compras</p>
        </div>
        <SupplierFormDialog mode="create" />
      </div>
      <SuppliersTable suppliers={suppliersData} />
    </div>
  )
}
