-- =========================
-- TABLA ROL (FALTABA)
-- =========================
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
);

-- Insertar roles básicos
INSERT INTO rol (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Operador', 'Operador de transcripción de actas');

-- Agregar la foreign key que faltaba en usuario
ALTER TABLE usuario
ADD CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol)
    REFERENCES rol(id_rol)
    ON DELETE SET NULL;
