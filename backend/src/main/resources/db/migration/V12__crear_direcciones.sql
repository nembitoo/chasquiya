-- Fase 1 — Direcciones guardadas del cliente
-- Evita reescribir la dirección en cada solicitud.
CREATE TABLE direcciones (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    etiqueta       VARCHAR(40)  NOT NULL,   -- "Casa", "Trabajo", "Depto de mamá"...
    direccion      VARCHAR(255) NOT NULL,
    comuna         VARCHAR(120),
    referencia     VARCHAR(255),            -- "Portón negro, tocar el timbre 2"
    es_principal   BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_direcciones_usuario ON direcciones (usuario_id);
