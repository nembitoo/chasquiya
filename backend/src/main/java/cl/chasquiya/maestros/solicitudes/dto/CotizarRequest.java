package cl.chasquiya.maestros.solicitudes.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** El maestro cotiza una solicitud. */
public record CotizarRequest(
        @NotNull @Positive Integer monto,
        @Size(max = 500) String mensaje) {
}
