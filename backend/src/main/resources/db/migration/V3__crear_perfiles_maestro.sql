-- Hito 2 — Perfil + verificación del maestro

CREATE TABLE perfiles_maestro (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id          BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion         TEXT,
    anios_experiencia   INT          NOT NULL DEFAULT 0,
    tarifa_referencial  INT,                          -- en pesos chilenos (CLP)
    zona_cobertura      VARCHAR(120),
    latitud             DOUBLE PRECISION,
    longitud            DOUBLE PRECISION,
    -- Columna GENERADA: PostGIS calcula el punto geográfico a partir de lat/lon.
    -- Es la base para las búsquedas por cercanía del Hito 3.
    ubicacion           geography(Point, 4326)
                        GENERATED ALWAYS AS (
                            ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography
                        ) STORED,
    estado_verificacion VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE|APROBADO|RECHAZADO
    fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índice geoespacial para consultas de cercanía rápidas (se usará en el Hito 3).
CREATE INDEX idx_perfiles_maestro_ubicacion ON perfiles_maestro USING GIST (ubicacion);

CREATE TABLE perfil_maestro_oficios (
    perfil_id BIGINT      NOT NULL REFERENCES perfiles_maestro(id) ON DELETE CASCADE,
    oficio    VARCHAR(30) NOT NULL,
    PRIMARY KEY (perfil_id, oficio)
);
