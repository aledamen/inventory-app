-- ============================================================
-- PASO 1: Columnas updated_at en tablas que no las tenían
-- ============================================================

ALTER TABLE stock_movements  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE sales             ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE expenses          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE capital_movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE clients           ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE suppliers         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE returns           ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE orders            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================================
-- PASO 2: Tabla de auditoría
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id             SERIAL PRIMARY KEY,
  tabla          TEXT        NOT NULL,
  accion         TEXT        NOT NULL, -- INSERT | UPDATE | DELETE
  registro_id    INTEGER,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  fecha          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tabla_id ON audit_log (tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_fecha    ON audit_log (fecha DESC);

-- ============================================================
-- PASO 3: Función trigger
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, accion, registro_id, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, accion, registro_id, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, accion, registro_id, datos_anteriores)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PASO 4: Triggers por tabla
-- ============================================================

-- stock_movements
DROP TRIGGER IF EXISTS trg_audit_stock_movements ON stock_movements;
CREATE TRIGGER trg_audit_stock_movements
  AFTER INSERT OR UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- sales
DROP TRIGGER IF EXISTS trg_audit_sales ON sales;
CREATE TRIGGER trg_audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- expenses
DROP TRIGGER IF EXISTS trg_audit_expenses ON expenses;
CREATE TRIGGER trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- capital_movements
DROP TRIGGER IF EXISTS trg_audit_capital_movements ON capital_movements;
CREATE TRIGGER trg_audit_capital_movements
  AFTER INSERT OR UPDATE OR DELETE ON capital_movements
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- clients
DROP TRIGGER IF EXISTS trg_audit_clients ON clients;
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- suppliers
DROP TRIGGER IF EXISTS trg_audit_suppliers ON suppliers;
CREATE TRIGGER trg_audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- returns
DROP TRIGGER IF EXISTS trg_audit_returns ON returns;
CREATE TRIGGER trg_audit_returns
  AFTER INSERT OR UPDATE OR DELETE ON returns
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- products
DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
