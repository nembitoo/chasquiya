package cl.chasquiya.maestros.direcciones.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos para crear o editar una dirección guardada. */
public record DireccionRequest(
        @NotBlank @Size(max = 40) String etiqueta,
        @NotBlank @Size(max = 255) String direccion,
        @Size(max = 120) String comuna,
        @Size(max = 255) String referencia,
        boolean esPrincipal) {
}
