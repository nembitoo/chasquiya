package cl.chasquiya.maestros.usuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Datos para iniciar sesión. */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password) {
}
