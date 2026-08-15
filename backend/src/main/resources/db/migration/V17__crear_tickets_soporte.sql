-- Fase 3f — Soporte y reclamos
-- Las disputas cubren problemas DE UN SERVICIO. Esto cubre lo demas: cobros
-- que no cuadran, problemas de la cuenta, sugerencias, denuncias.
CREATE TABLE tickets_soporte (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria      VARCHAR(30)  NOT NULL,
    asunto         VARCHAR(120) NOT NULL,
    mensaje        VARCHAR(2000) NOT NULL,
    -- NUEVO -> EN_REVISION -> RESUELTO
    estado         VARCHAR(20)  NOT NULL DEFAULT 'NUEVO',
    respuesta      VARCHAR(2000),
    -- Opcional: si el reclamo es sobre un servicio concreto.
    solicitud_id   BIGINT       REFERENCES solicitudes(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_usuario ON tickets_soporte (usuario_id);
CREATE INDEX idx_tickets_estado ON tickets_soporte (estado, fecha_creacion DESC);
