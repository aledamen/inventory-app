'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecontactTable } from '@/components/recontacto/recontact-table'
import { RecontactHistoryTable } from '@/components/recontacto/recontact-history-table'
import type { RecontactRow } from '@/actions/recontacto'

export function RecontactoTabs({ rows }: { rows: RecontactRow[] }) {
  return (
    <Tabs defaultValue="activos">
      <TabsList>
        <TabsTrigger value="activos">Activos</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>

      <TabsContent value="activos" className="mt-4">
        <RecontactTable rows={rows} />
      </TabsContent>

      <TabsContent value="historial" className="mt-4">
        <RecontactHistoryTable />
      </TabsContent>
    </Tabs>
  )
}
