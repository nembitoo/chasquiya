package cl.chasquiya.maestros.soporte.dto;

import java.time.Instant;

import cl.chasquiya.maestros.soporte.MensajeTicket;

/** Un mensaje del hilo, listo para pintar como burbuja. */
public record MensajeTicketResponse(
        Long id,
        /** De qué lado viene. Es lo único que la app necesita para ubicarlo. */
        boolean esAdmin,
        /** "Soporte ChasquiYa!" o el nombre de quien reclama. */
        String autor,
        String cuerpo,
        Instant fechaCreacion) {

    public static MensajeTicketResponse de(MensajeTicket m, String autor) {
        return new MensajeTicketResponse(m.getId(), m.isEsAdmin(), autor, m.getCuerpo(), m.getFechaCreacion());
    }
}
