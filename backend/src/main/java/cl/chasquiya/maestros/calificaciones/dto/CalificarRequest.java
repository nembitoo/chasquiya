package cl.chasquiya.maestros.calificaciones.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Calificación que envía una parte. Los aspectos son opcionales y solo
 * aplican cuando se califica a un maestro.
 */
public record CalificarRequest(
        @NotNull @Min(1) @Max(5) Short estrellas,
        @Size(max = 500) String comentario,
        @Min(1) @Max(5) Short puntualidad,
        @Min(1) @Max(5) Short calidad,
        @Min(1) @Max(5) Short trato) {
}
