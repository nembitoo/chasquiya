-- Hito 7 — Confianza
-- Calificación mutua al terminar el servicio. Cada parte califica UNA vez.
CREATE TABLE calificaciones (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id    BIGINT      NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    autor_id        BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_id BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estrellas       SMALLINT    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario      VARCHAR(500),
    -- Aspectos: solo se llenan cuando se califica a un maestro.
    puntualidad     SMALLINT CHECK (puntualidad BETWEEN 1 AND 5),
    calidad         SMALLINT CHECK (calidad BETWEEN 1 AND 5),
    trato           SMALLINT CHECK (trato BETWEEN 1 AND 5),
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Una calificación por persona y servicio.
    CONSTRAINT uk_calificacion_por_autor UNIQUE (solicitud_id, autor_id)
);

CREATE INDEX idx_calificaciones_destinatario ON calificaciones (destinatario_id);

-- Resolución de disputas por el admin (queda registrada en la solicitud).
ALTER TABLE solicitudes ADD COLUMN resolucion_disputa VARCHAR(500);
