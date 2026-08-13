package cl.chasquiya.maestros.perfiles.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.Oficio;

/** Perfil del maestro que devolvemos a la app. */
public record PerfilMaestroResponse(
        Long id,
        Long usuarioId,
        Set<Oficio> oficios,
        String descripcion,
        int aniosExperiencia,
        Integer tarifaReferencial,
        String zonaCobertura,
        Double latitud,
        Double longitud,
        EstadoVerificacion estadoVerificacion) {
}
