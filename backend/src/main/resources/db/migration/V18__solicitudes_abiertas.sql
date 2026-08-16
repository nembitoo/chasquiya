-- Fase 4 — Solicitud abierta a varios maestros
--
-- Hasta ahora el cliente elegia UN maestro y le pedia el trabajo. Esto permite
-- publicar el trabajo una vez y recibir varias cotizaciones para comparar.
--
-- El flujo directo de siempre (elegir un maestro puntual) sigue funcionando
-- igual: lo abierto se agrega al lado, no lo reemplaza.

-- 1. Una solicitud abierta todavia no tiene maestro: se define al aceptar una
--    cotizacion.
ALTER TABLE solicitudes ALTER COLUMN maestro_id DROP NOT NULL;

-- 2. Coordenadas del trabajo, para saber a que maestros les queda cerca.
--    Son opcionales: si el cliente no da ubicacion, el calce es solo por oficio.
ALTER TABLE solicitudes ADD COLUMN latitud  DOUBLE PRECISION;
ALTER TABLE solicitudes ADD COLUMN longitud DOUBLE PRECISION;

-- Misma tecnica que en perfiles_maestro: la columna geografica se calcula sola
-- a partir de lat/lon, asi no puede quedar desincronizada.
ALTER TABLE solicitudes ADD COLUMN ubicacion geography(Point, 4326)
    GENERATED ALWAYS AS (
        CASE WHEN latitud IS NOT NULL AND longitud IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(longitud, latitud), 4326)::geography
        END
    ) STORED;

CREATE INDEX idx_solicitudes_ubicacion ON solicitudes USING GIST (ubicacion);

-- 3. Varias cotizaciones por solicitud, una por maestro.
--    El UNIQUE de solicitud_id era justo lo que lo impedia.
ALTER TABLE cotizaciones DROP CONSTRAINT cotizaciones_solicitud_id_key;

ALTER TABLE cotizaciones ADD COLUMN maestro_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE;

-- Las cotizaciones que ya existen son del maestro de su solicitud.
UPDATE cotizaciones c
   SET maestro_id = s.maestro_id
  FROM solicitudes s
 WHERE s.id = c.solicitud_id;

-- Si quedara alguna sin dueno (solicitud sin maestro, imposible hasta ahora),
-- se descarta: una cotizacion sin autor no sirve para nada.
DELETE FROM cotizaciones WHERE maestro_id IS NULL;

ALTER TABLE cotizaciones ALTER COLUMN maestro_id SET NOT NULL;

-- Un maestro cotiza una sola vez por solicitud (puede corregir la suya).
ALTER TABLE cotizaciones ADD CONSTRAINT uq_cotizacion_solicitud_maestro
    UNIQUE (solicitud_id, maestro_id);

CREATE INDEX idx_cotizaciones_solicitud ON cotizaciones (solicitud_id);
