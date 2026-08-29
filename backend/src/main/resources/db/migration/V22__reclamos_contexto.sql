-- Reclamos 2.0, corte 1: contexto del reclamo.
--
-- La columna solicitud_id existe desde V17, pero nadie la llenaba: la app no
-- ofrecia elegir el servicio y el backoffice no lo mostraba. El admin leia un
-- texto suelto sin saber de que hablaba. Ahora la app la manda y la ficha del
-- admin resuelve el servicio, asi que la busqueda por servicio pasa a existir.
CREATE INDEX idx_tickets_solicitud ON tickets_soporte (solicitud_id);
