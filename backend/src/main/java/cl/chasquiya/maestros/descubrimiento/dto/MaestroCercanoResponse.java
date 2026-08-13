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
        double distanciaKm) {
}
