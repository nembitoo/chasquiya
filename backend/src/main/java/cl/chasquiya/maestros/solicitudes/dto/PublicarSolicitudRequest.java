package cl.chasquiya.maestros.solicitudes.dto;

import cl.chasquiya.maestros.perfiles.Oficio;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Trabajo publicado sin elegir maestro: varios pueden cotizarlo.
 *
 * <p>La ubicación es opcional. Sin ella el trabajo igual se publica, pero llega
 * a todos los maestros del oficio en vez de a los que tiene cerca.
 */
public record PublicarSolicitudRequest(
        @NotNull Oficio oficio,
        @NotBlank @Size(max = 2000) String descripcion,
        @NotBlank @Size(max = 255) String direccion,
        String fechaPreferida,
        @Positive Integer presupuestoEstimado,
        Double latitud,
        Double longitud) {
}
