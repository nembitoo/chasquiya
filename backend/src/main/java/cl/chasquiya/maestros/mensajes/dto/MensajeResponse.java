package cl.chasquiya.maestros.mensajes.dto;

import java.time.Instant;

/** Mensaje tal como lo ve la app. */
public record MensajeResponse(
        Long id,
        Long solicitudId,
        Long autorId,
        String autorNombre,
        String texto,
        boolean leido,
        Instant fechaCreacion) {
}
