package cl.chasquiya.maestros.solicitudes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Precio nuevo tras revisar el trabajo en el lugar.
 *
 * <p>El motivo es obligatorio: subir el precio sin explicar por qué es
 * exactamente lo que hace desconfiar al cliente.
 */
public record AjustarPrecioRequest(
        @NotNull @Positive Integer monto,
        @NotBlank @Size(max = 500) String motivo) {
}
