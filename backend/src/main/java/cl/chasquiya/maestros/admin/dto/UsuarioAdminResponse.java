package cl.chasquiya.maestros.admin.dto;

import java.time.Instant;

import cl.chasquiya.maestros.usuarios.RolUsuario;

/** Fila de la tabla de usuarios del backoffice. */
public record UsuarioAdminResponse(
        Long id,
        String nombre,
        String apellido,
        String email,
        String telefono,
        RolUsuario rol,
        boolean activo,
        long serviciosRealizados,
        Instant fechaCreacion) {
}
