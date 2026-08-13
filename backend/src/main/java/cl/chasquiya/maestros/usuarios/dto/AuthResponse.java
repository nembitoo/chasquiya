package cl.chasquiya.maestros.usuarios.dto;

import cl.chasquiya.maestros.usuarios.RolUsuario;

/** Respuesta al registrarse o iniciar sesión: el token y datos básicos del usuario. */
public record AuthResponse(
        String token,
        Long id,
        String nombre,
        String email,
        RolUsuario rol) {
}
