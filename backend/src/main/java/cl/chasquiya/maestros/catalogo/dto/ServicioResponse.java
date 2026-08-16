package cl.chasquiya.maestros.catalogo.dto;

import cl.chasquiya.maestros.catalogo.ServicioMaestro;
import cl.chasquiya.maestros.perfiles.Oficio;

/** Un servicio del catálogo, tal como lo ven el maestro y el cliente. */
public record ServicioResponse(
        Long id,
        Long maestroId,
        Oficio oficio,
        String titulo,
        String descripcion,
        Integer precio,
        boolean precioFijo,
        String unidad,
        boolean activo) {

    public static ServicioResponse de(ServicioMaestro s) {
        return new ServicioResponse(s.getId(), s.getMaestroId(), s.getOficio(), s.getTitulo(),
                s.getDescripcion(), s.getPrecio(), s.isPrecioFijo(), s.getUnidad(), s.isActivo());
    }
}
