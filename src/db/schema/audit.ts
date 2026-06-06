import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tabla: text('tabla').notNull(),
  accion: text('accion').notNull(),
  registroId: integer('registro_id'),
  datosAnteriores: jsonb('datos_anteriores'),
  datosNuevos: jsonb('datos_nuevos'),
  fecha: timestamp('fecha').notNull().defaultNow(),
})
