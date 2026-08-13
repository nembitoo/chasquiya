-- Hito 2d — Documentos de verificación del maestro
-- Los archivos viven en MinIO; aquí guardamos solo los metadatos y la clave del objeto.
CREATE TABLE documentos_maestro (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_archivo  VARCHAR(255) NOT NULL,
    objeto          VARCHAR(255) NOT NULL,          -- clave del archivo en el bucket de MinIO
    tipo_contenido  VARCHAR(100) NOT NULL,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_maestro_usuario ON documentos_maestro (usuario_id);
