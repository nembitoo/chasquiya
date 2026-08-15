package cl.chasquiya.maestros.soporte.dto;

import java.time.Instant;

import cl.chasquiya.maestros.soporte.CategoriaTicket;
import cl.chasquiya.maestros.soporte.EstadoTicket;
import cl.chasquiya.maestros.soporte.TicketSoporte;

public record TicketResponse(
        Long id,
        Long usuarioId,
        /** Solo se rellena en la vista del admin. */
        String usuarioNombre,
        String usuarioEmail,
        CategoriaTicket categoria,
        String asunto,
        String mensaje,
        EstadoTicket estado,
        String respuesta,
        Long solicitudId,
        Instant fechaCreacion,
        Instant fechaActualizacion) {

    public static TicketResponse de(TicketSoporte t, String nombre, String email) {
        return new TicketResponse(t.getId(), t.getUsuarioId(), nombre, email, t.getCategoria(),
                t.getAsunto(), t.getMensaje(), t.getEstado(), t.getRespuesta(), t.getSolicitudId(),
                t.getFechaCreacion(), t.getFechaActualizacion());
    }
}
