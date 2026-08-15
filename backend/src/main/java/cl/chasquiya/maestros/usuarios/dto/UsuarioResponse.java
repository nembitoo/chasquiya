package cl.chasquiya.maestros.usuarios.dto;

import cl.chasquiya.maestros.usuarios.RolUsuario;

/** Datos públicos del usuario autenticado (nunca incluye el hash de la contraseña). */
public record UsuarioResponse(
        Long id,
        String nombre,
        String apellido,
        String email,
        String telefono,
        RolUsuario rol,
        boolean tieneAvatar) {
}
