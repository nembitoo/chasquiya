-- Reclamos 2.0, corte 3: la conversacion del reclamo.
--
-- Hasta ahora un reclamo era un texto y una respuesta: el admin contestaba una
-- vez y se acababa. Si faltaba un dato, no habia donde pedirlo.
--
-- La columna respuesta de tickets_soporte se mantiene: sigue siendo "la ultima
-- palabra del admin" y la usan el backoffice y la app. Las respuestas que ya
-- existen entran al hilo para que ninguna conversacion arranque vacia.
CREATE TABLE mensajes_ticket (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      BIGINT        NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
    -- Queda en NULL si la cuenta se anonimiza (Ley 21.719): el reclamo y su
    -- conversacion se conservan, la persona detras no.
    autor_id       BIGINT        REFERENCES usuarios(id) ON DELETE SET NULL,
    es_admin       BOOLEAN       NOT NULL,
    cuerpo         VARCHAR(2000) NOT NULL,
    fecha_creacion TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_ticket ON mensajes_ticket (ticket_id, fecha_creacion);

INSERT INTO mensajes_ticket (ticket_id, autor_id, es_admin, cuerpo, fecha_creacion)
SELECT id, NULL, TRUE, respuesta, fecha_actualizacion
FROM tickets_soporte
WHERE respuesta IS NOT NULL AND btrim(respuesta) <> '';
