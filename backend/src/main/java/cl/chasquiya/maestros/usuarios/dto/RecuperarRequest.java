package cl.chasquiya.maestros.usuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Paso 1: pedir el enlace de recuperación. */
public record RecuperarRequest(@NotBlank @Email String email) {
}
