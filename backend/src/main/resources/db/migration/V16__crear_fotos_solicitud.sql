-- Fase 3a — Fotos del problema en la solicitud
-- Una foto ahorra media conversacion: el maestro cotiza mejor y el cliente
-- explica menos. El archivo vive en MinIO; aqui solo quedan los metadatos,
-- igual que en documentos_maestro.
CREATE TABLE fotos_solicitud (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id   BIGINT       NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    objeto         VARCHAR(200) NOT NULL,   -- clave del archivo en MinIO
    tipo_contenido VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_fotos_solicitud ON fotos_solicitud (solicitud_id);
