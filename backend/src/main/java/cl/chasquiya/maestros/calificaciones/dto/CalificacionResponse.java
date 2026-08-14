package cl.chasquiya.maestros.calificaciones.dto;

import java.time.Instant;

/** Una calificación (reseña) tal como se muestra en la app. */
public record CalificacionResponse(
        Long id,
        Long solicitudId,
        Long autorId,
        String autorNombre,
        short estrellas,
        String comentario,
        Short puntualidad,
        Short calidad,
        Short trato,
        Instant fechaCreacion) {
}
