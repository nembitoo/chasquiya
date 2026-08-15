package cl.chasquiya.maestros.notificaciones.dto;

import java.time.Instant;

import cl.chasquiya.maestros.notificaciones.Notificacion;
import cl.chasquiya.maestros.notificaciones.TipoNotificacion;

public record NotificacionResponse(
        Long id,
        TipoNotificacion tipo,
        String titulo,
        String cuerpo,
        Long solicitudId,
        boolean leida,
        Instant fechaCreacion) {

    public static NotificacionResponse de(Notificacion n) {
        return new NotificacionResponse(n.getId(), n.getTipo(), n.getTitulo(), n.getCuerpo(),
                n.getSolicitudId(), n.isLeida(), n.getFechaCreacion());
    }
}
