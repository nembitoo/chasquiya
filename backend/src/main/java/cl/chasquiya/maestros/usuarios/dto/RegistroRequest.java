package cl.chasquiya.maestros.usuarios.dto;

import cl.chasquiya.maestros.usuarios.RolUsuario;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos que envía la app para registrar una cuenta. Se validan antes de procesar. */
public record RegistroRequest(
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank @Email String email,
        @NotBlank String telefono,
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres") String password,
        @NotNull RolUsuario rol,
        @AssertTrue(message = "Debes aceptar los términos y condiciones") boolean aceptoTerminos) {
}
