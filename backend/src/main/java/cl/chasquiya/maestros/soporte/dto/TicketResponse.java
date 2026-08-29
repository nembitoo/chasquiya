package cl.chasquiya.maestros.soporte.dto;

import java.time.Instant;

import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.soporte.CategoriaTicket;
import cl.chasquiya.maestros.soporte.EstadoTicket;
import cl.chasquiya.maestros.soporte.TicketSoporte;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;

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
        /**
         * De qué servicio habla el reclamo. Null si no eligió ninguno, o si el
         * servicio se borró: el ticket sobrevive igual (ON DELETE SET NULL).
         */
        Oficio servicioOficio,
        String servicioDescripcion,
        EstadoServicio servicioEstado,
        String servicioMaestro,
        Instant servicioFecha,
        Instant fechaCreacion,
        Instant fechaActualizacion) {

    public static TicketResponse de(TicketSoporte t, String nombre, String email) {
        return conServicio(t, nombre, email, null, null);
    }

    /** Con el servicio resuelto, para que quien lee el reclamo sepa de qué habla. */
    public static TicketResponse conServicio(TicketSoporte t, String nombre, String email,
                                             Solicitud s, String maestro) {
        return new TicketResponse(t.getId(), t.getUsuarioId(), nombre, email, t.getCategoria(),
                t.getAsunto(), t.getMensaje(), t.getEstado(), t.getRespuesta(), t.getSolicitudId(),
                s == null ? null : s.getOficio(),
                s == null ? null : s.getDescripcion(),
                s == null ? null : s.getEstado(),
                s == null ? null : maestro,
                s == null ? null : s.getFechaCreacion(),
                t.getFechaCreacion(), t.getFechaActualizacion());
    }
}
