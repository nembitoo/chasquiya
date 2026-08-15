package cl.chasquiya.maestros.usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Datos que el usuario puede cambiar de su cuenta (el correo no, es su identificador). */
public record ActualizarPerfilRequest(
        @NotBlank @Size(max = 80) String nombre,
        @NotBlank @Size(max = 80) String apellido,
        @Size(max = 30) String telefono) {
}
