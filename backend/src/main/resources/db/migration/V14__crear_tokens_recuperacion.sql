-- Fase 2 — Recuperar contraseña
-- Token de un solo uso con vencimiento. No guardamos el token en claro:
-- solo su hash, igual que con las contraseñas.
CREATE TABLE tokens_recuperacion (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash     VARCHAR(100) NOT NULL,
    expira_en      TIMESTAMPTZ NOT NULL,
    usado          BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tokens_recuperacion_usuario ON tokens_recuperacion (usuario_id);
