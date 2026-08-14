package cl.chasquiya.maestros.descubrimiento.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.Oficio;

/** Perfil público de un maestro (lo que ve un cliente). */
public record MaestroPublicoResponse(
        Long usuarioId,
        String nombre,
        String apellido,
        Set<Oficio> oficios,
        String descripcion,
        int aniosExperiencia,
        Integer tarifaReferencial,
        String zonaCobertura,
        double calificacionPromedio,
        long cantidadCalificaciones,
        boolean esFavorito) {
}
