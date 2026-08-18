package cl.chasquiya.maestros.perfiles;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PerfilMaestroRepository extends JpaRepository<PerfilMaestro, Long> {

    Optional<PerfilMaestro> findByUsuarioId(Long usuarioId);

    List<PerfilMaestro> findByEstadoVerificacion(EstadoVerificacion estado);

    List<PerfilMaestro> findByUsuarioIdIn(Collection<Long> usuarioIds);

    // --- Búsqueda por cercanía (PostGIS) ---
    // Solo maestros APROBADOS dentro del radio (metros), ordenados por distancia.
    // ST_DWithin usa el índice GIST; ST_Distance calcula la distancia real en metros.
    //
    // Se exige además tener algo publicado en el catálogo: si no, el cliente
    // vería una tarjeta sin precio, que es justo lo que veníamos a eliminar.
    // El filtro va DENTRO de la consulta y no después, porque con el LIMIT 50
    // filtrar en Java descartaría resultados válidos que estaban más lejos.

    @Query(value = """
            SELECT p.usuario_id AS "usuarioId",
                   ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS "distanciaM"
            FROM perfiles_maestro p
            WHERE p.estado_verificacion = 'APROBADO'
              AND p.ubicacion IS NOT NULL
              AND ST_DWithin(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radioM)
              AND EXISTS (SELECT 1 FROM servicios_maestro s
                          WHERE s.maestro_id = p.usuario_id AND s.activo)
            ORDER BY "distanciaM" ASC
            LIMIT 50
            """, nativeQuery = true)
    List<MaestroCercanoProjection> buscarCercanos(@Param("lat") double lat,
                                                  @Param("lon") double lon,
                                                  @Param("radioM") double radioM);

    /**
     * Con oficio se piden las dos cosas: que lo tenga en su perfil verificado y
     * que tenga un servicio publicado de ese oficio. Lo primero evita que un
     * servicio viejo lo siga mostrando en un oficio que ya se sacó del perfil.
     */
    @Query(value = """
            SELECT p.usuario_id AS "usuarioId",
                   ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS "distanciaM"
            FROM perfiles_maestro p
            WHERE p.estado_verificacion = 'APROBADO'
              AND p.ubicacion IS NOT NULL
              AND ST_DWithin(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radioM)
              AND EXISTS (SELECT 1 FROM perfil_maestro_oficios o
                          WHERE o.perfil_id = p.id AND o.oficio = :oficio)
              AND EXISTS (SELECT 1 FROM servicios_maestro s
                          WHERE s.maestro_id = p.usuario_id AND s.activo AND s.oficio = :oficio)
            ORDER BY "distanciaM" ASC
            LIMIT 50
            """, nativeQuery = true)
    List<MaestroCercanoProjection> buscarCercanosPorOficio(@Param("lat") double lat,
                                                           @Param("lon") double lon,
                                                           @Param("radioM") double radioM,
                                                           @Param("oficio") String oficio);
}
