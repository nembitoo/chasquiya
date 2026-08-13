package cl.chasquiya.maestros.perfiles.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.Oficio;

/** Vista que el admin ve de un maestro (perfil + datos del usuario). */
public record MaestroAdminResponse(
        Long usuarioId,
        String nombre,
        String apellido,
        String email,
        Set<Oficio> oficios,
        String zonaCobertura,
        int aniosExperiencia,
        EstadoVerificacion estadoVerificacion) {
}
