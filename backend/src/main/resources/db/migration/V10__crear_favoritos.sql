-- Fase 1 — Favoritos
-- Un cliente guarda maestros para volver a contratarlos.
CREATE TABLE favoritos (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id     BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    maestro_id     BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_favorito UNIQUE (cliente_id, maestro_id)
);

CREATE INDEX idx_favoritos_cliente ON favoritos (cliente_id);
