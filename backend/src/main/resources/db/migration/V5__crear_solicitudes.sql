-- Hito 4 — Transacción (núcleo)
-- Una solicitud es un servicio pedido por un cliente a un maestro concreto.
-- Su 'estado' recorre la máquina de estados del negocio (lógica crítica).

CREATE TABLE solicitudes (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id           BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    maestro_id           BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    oficio               VARCHAR(30)  NOT NULL,
    descripcion          TEXT         NOT NULL,
    direccion            VARCHAR(255) NOT NULL,
    fecha_preferida      VARCHAR(30),                  -- texto libre por ahora (ej. "2026-08-20 15:00")
    presupuesto_estimado INT,                          -- CLP, opcional
    estado               VARCHAR(20)  NOT NULL DEFAULT 'SOLICITADO',
    motivo_cancelacion   VARCHAR(255),
    fecha_creacion       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_actualizacion  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitudes_cliente ON solicitudes (cliente_id);
CREATE INDEX idx_solicitudes_maestro ON solicitudes (maestro_id);

-- Cotización que el maestro hace sobre una solicitud (una por solicitud).
CREATE TABLE cotizaciones (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id   BIGINT      NOT NULL UNIQUE REFERENCES solicitudes(id) ON DELETE CASCADE,
    monto          INT         NOT NULL,               -- CLP
    mensaje        VARCHAR(500),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);
