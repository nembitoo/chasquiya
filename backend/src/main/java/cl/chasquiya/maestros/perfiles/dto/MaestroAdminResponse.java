package cl.chasquiya.maestros.perfiles.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.Oficio;

/**
 * Vista que el admin ve de un maestro (perfil + datos del usuario).
 *
 * <p>Trae con qué decidir, no solo con qué identificar: aprobar a alguien sin
 * ver su experiencia, sus trabajos y su reputación es aprobar a ciegas.
 */
public record MaestroAdminResponse(
        Long usuarioId,
        String nombre,
        String apellido,
        String email,
        String telefono,
        Set<Oficio> oficios,
        String descripcion,
        String zonaCobertura,
        int aniosExperiencia,
        EstadoVerificacion estadoVerificacion,
        boolean tieneAvatar,
        long trabajosCompletados,
        double calificacionPromedio,
        long cantidadCalificaciones) {
}
