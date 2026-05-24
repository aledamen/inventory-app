import { getExpenses } from '@/actions/expenses'
import { ExpensesTable } from '@/components/expenses/expenses-table'
import { ExpenseFormDialog } from '@/components/expenses/expense-form-dialog'

export default async function ExpensesPage() {
  const data = await getExpenses()
  const total = data.reduce((acc, e) => acc + Number(e.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total acumulado: <strong className="text-foreground">${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
          </p>
        </div>
        <ExpenseFormDialog />
      </div>
      <ExpensesTable expenses={data} />
    </div>
  )
}
