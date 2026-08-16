-- Fase 4d — Cotizacion honesta: precio cerrado o estimado con visita
--
-- Problema que resuelve: el maestro cotiza sin haber visto el trabajo. Si al
-- llegar resulta ser otra cosa, hoy no hay forma limpia de reajustar el precio
-- ni de cobrar el traslado.
--
-- Regla que se hace cumplir: NADA se cobra si no estaba en la cotizacion que el
-- cliente acepto. Por eso el costo de visita vive en la cotizacion, no aparece
-- despues.

ALTER TABLE cotizaciones
    ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'CERRADO';

-- Cuanto cobra el maestro por ir a diagnosticar. Solo tiene sentido en las
-- estimadas, y se DESCUENTA si el trabajo se hace: asi al maestro le conviene
-- quedarse con el trabajo, no con la visita.
ALTER TABLE cotizaciones
    ADD COLUMN costo_visita INT;

-- Precio nuevo propuesto tras ver el trabajo, a la espera de que el cliente lo
-- apruebe. Se guarda aparte del acordado: mientras no haya aprobacion, el
-- precio vigente sigue siendo el original.
ALTER TABLE solicitudes ADD COLUMN monto_ajustado   INT;
ALTER TABLE solicitudes ADD COLUMN mensaje_ajuste   VARCHAR(500);

-- Lo unico cobrable cuando el cliente rechaza el ajuste. Queda escrito en la
-- solicitud para que el monto no dependa de lo que alguien diga despues.
ALTER TABLE solicitudes ADD COLUMN monto_visita_cobrado INT;
