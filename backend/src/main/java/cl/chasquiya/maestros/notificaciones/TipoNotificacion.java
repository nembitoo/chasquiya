package cl.chasquiya.maestros.notificaciones;

/**
 * Motivo del aviso. La app lo usa para elegir el icono y a dónde navegar
 * cuando se toca la notificación.
 */
public enum TipoNotificacion {
    SOLICITUD_NUEVA,
    COTIZACION_RECIBIDA,
    COTIZACION_ACEPTADA,
    COTIZACION_RECHAZADA,
    AJUSTE_PROPUESTO,
    AJUSTE_APROBADO,
    AJUSTE_RECHAZADO,
    TRABAJO_INICIADO,
    TRABAJO_COMPLETADO,
    PAGO_RECIBIDO,
    CALIFICACION_RECIBIDA,
    SERVICIO_CANCELADO,
    VERIFICACION_APROBADA,
    VERIFICACION_RECHAZADA,
    /**
     * Soporte escribió en un reclamo. Va a la pantalla de Ayuda, no a la de
     * solicitudes: el reclamo puede colgar de un servicio, pero de lo que habla
     * el aviso es del reclamo.
     */
    RECLAMO_RESPONDIDO
}
