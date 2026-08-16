-- Fase 5 — Catalogo de servicios del maestro
--
-- Problema que resuelve: hasta ahora TODO trabajo pasaba por describir un
-- problema y esperar cotizacion. Para algo chico y estandar ("cambiar un
-- enchufe") eso es friccion pura, y el cliente entra a ciegas sin saber si le
-- van a cobrar 10 mil o 60 mil.
--
-- Quien pone los precios: el MAESTRO. La plataforma NO publica un tarifario
-- propio, porque eso seria fijar tarifas y el maestro es independiente
-- (Ley 21.431). Cada uno arma su lista con sus precios.

CREATE TABLE servicios_maestro (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    maestro_id     BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    oficio         VARCHAR(30)  NOT NULL,
    titulo         VARCHAR(80)  NOT NULL,   -- "Cambio de enchufe", "Destape de lavaplatos"
    descripcion    VARCHAR(500),            -- que incluye y que no
    precio         INT          NOT NULL CHECK (precio > 0),

    -- TRUE  -> "cuesta esto, sin sorpresas": al pedirlo se genera una cotizacion
    --          CERRADA con este monto, asi el cliente sabe el precio de antemano.
    -- FALSE -> "parte en esto": el maestro cotiza igual, con el monto sugerido.
    precio_fijo    BOOLEAN      NOT NULL DEFAULT FALSE,

    unidad         VARCHAR(30),             -- "por punto", "por m2", "la hora"...
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,  -- pausar sin borrar
    fecha_creacion TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_servicios_maestro ON servicios_maestro (maestro_id, activo);

-- De que servicio del catalogo nacio la solicitud. Es solo trazabilidad: el
-- precio ya quedo congelado en la cotizacion, asi que editar o borrar el
-- servicio despues no cambia nada de lo que las partes acordaron.
ALTER TABLE solicitudes
    ADD COLUMN servicio_id BIGINT REFERENCES servicios_maestro(id) ON DELETE SET NULL;
