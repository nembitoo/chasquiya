package cl.chasquiya.maestros.notificaciones.dto;

import java.util.List;

/** Lo que necesita la campanita: el historial y cuántas faltan por leer. */
public record BandejaResponse(List<NotificacionResponse> notificaciones, long noLeidas) {
}
