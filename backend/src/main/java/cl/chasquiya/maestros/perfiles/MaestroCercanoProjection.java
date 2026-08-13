package cl.chasquiya.maestros.perfiles;

/** Resultado crudo de la búsqueda por cercanía: id del maestro y distancia en metros. */
public interface MaestroCercanoProjection {

    Long getUsuarioId();

    Double getDistanciaM();
}
