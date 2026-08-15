package cl.chasquiya.maestros.descubrimiento.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.Oficio;

/** Tarjeta de un maestro cercano para la lista de búsqueda. */
public record MaestroCercanoResponse(
        Long usuarioId,
        String nombre,
        String apellido,
        Set<Oficio> oficios,
        String zonaCobertura,
        int aniosExperiencia,
        Integer tarifaReferencial,
        double distanciaKm,
        double calificacionPromedio,
        long cantidadCalificaciones,
        /** Si quien consulta lo tiene guardado en sus favoritos. */
        boolean esFavorito,
        boolean tieneAvatar,
        /** Trabajos que ya terminó: señal de confianza más concreta que las estrellas. */
        long trabajosCompletados,
        /**
         * Posición APROXIMADA para el mapa (ver {@code UbicacionAproximada}).
         * Nunca es la coordenada exacta que registró el maestro.
         */
        Double latitudAprox,
        Double longitudAprox) {
}
