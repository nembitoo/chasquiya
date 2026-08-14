-- Hito 5 — Comunicación
-- Mensajes del chat, siempre ligados a una solicitud (mantiene el contexto y la privacidad).
CREATE TABLE mensajes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id   BIGINT      NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    autor_id       BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    texto          VARCHAR(1000) NOT NULL,
    leido          BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Para listar la conversación en orden y contar no leídos rápido.
CREATE INDEX idx_mensajes_solicitud ON mensajes (solicitud_id, fecha_creacion);
