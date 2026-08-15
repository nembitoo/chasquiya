package cl.chasquiya.maestros.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Paso 2: usar el código recibido para poner una contraseña nueva. */
public record RestablecerRequest(
        @NotBlank String codigo,
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String passwordNueva) {
}
