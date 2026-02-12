-- ============================================
-- AGREGAR CAMPO DE IMAGEN A LA TABLA ACTA
-- Sistema Electoral - Colcapirhua 2026
-- ============================================

-- Agregar columna para imagen del acta escaneada
ALTER TABLE acta ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);

-- Comentario descriptivo
COMMENT ON COLUMN acta.imagen_url IS 'URL o ruta de la imagen escaneada del acta física';

-- Mostrar resultado
SELECT 'Campo imagen_url agregado exitosamente a la tabla acta' as mensaje;
