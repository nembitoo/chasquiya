-- Reclamos 2.0, corte 2: evidencias del reclamo.
--
-- Espejo de fotos_solicitud (V16): el archivo vive en MinIO y aqui solo quedan
-- los metadatos. Tabla propia y no una columna en fotos_solicitud porque son
-- dos cosas distintas: una foto del problema la ven las dos partes del
-- servicio, una evidencia del reclamo la ven quien reclama y el admin.
CREATE TABLE fotos_ticket (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      BIGINT       NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
    objeto         VARCHAR(200) NOT NULL,   -- clave del archivo en MinIO
    tipo_contenido VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_fotos_ticket ON fotos_ticket (ticket_id);
