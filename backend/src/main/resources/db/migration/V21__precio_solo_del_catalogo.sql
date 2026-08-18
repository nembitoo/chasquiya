-- Fase 5b — El precio sale del catalogo, no del perfil
--
-- Habia dos lugares donde el maestro declaraba cuanto cobra: la "tarifa
-- referencial" del perfil y su catalogo de servicios. Se podian contradecir, y
-- encima la busqueda filtraba y ordenaba por la tarifa, o sea que el precio de
-- verdad -el del catalogo- no influia en nada.
--
-- Ahora el cliente ve el precio del servicio que esta buscando: si filtra
-- gasfiteria, ve lo que ese maestro cobra por gasfiteria. Un numero general que
-- no dice a que trabajo corresponde no sirve para comparar.

ALTER TABLE perfiles_maestro DROP COLUMN tarifa_referencial;
