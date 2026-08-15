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
    TRABAJO_INICIADO,
    TRABAJO_COMPLETADO,
    PAGO_RECIBIDO,
    CALIFICACION_RECIBIDA,
    SERVICIO_CANCELADO,
    VERIFICACION_APROBADA,
    VERIFICACION_RECHAZADA
}
