-- ============================================
-- AGREGAR CAMPOS DE EDICIÓN A LA TABLA ACTA
-- Sistema Electoral - Colcapirhua 2026
-- ============================================

-- Agregar columnas para rastrear ediciones
ALTER TABLE acta ADD COLUMN IF NOT EXISTS editada BOOLEAN DEFAULT FALSE;
ALTER TABLE acta ADD COLUMN IF NOT EXISTS fecha_ultima_edicion TIMESTAMP;

-- Crear índice para búsquedas eficientes por estado de edición
CREATE INDEX IF NOT EXISTS idx_acta_editada ON acta(editada);

-- Comentarios descriptivos
COMMENT ON COLUMN acta.editada IS 'Indica si el acta ha sido editada después de su registro inicial';
COMMENT ON COLUMN acta.fecha_ultima_edicion IS 'Fecha y hora de la última edición del acta';

-- Mostrar resultado
SELECT 'Campos de edición agregados exitosamente a la tabla acta' as mensaje;
