-- Fase 2 — Ley 21.719 (protección de datos)
-- Al eliminar la cuenta NO se borra la fila: se anonimizan los datos personales
-- y se conservan los registros contables (obligación tributaria).
-- Esta marca deja constancia de cuándo se ejerció el derecho de supresión.
ALTER TABLE usuarios ADD COLUMN fecha_anonimizacion TIMESTAMPTZ;
