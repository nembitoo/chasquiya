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
        // Sin precio general: los precios van en el catálogo, cada uno con su
        // servicio. Se piden aparte en /catalogo/{maestroId}.
        String zonaCobertura,
        double calificacionPromedio,
        long cantidadCalificaciones,
        boolean esFavorito,
        boolean tieneAvatar,
        /** Trabajos que ya terminó: señal de confianza más concreta que las estrellas. */
        long trabajosCompletados) {
}
