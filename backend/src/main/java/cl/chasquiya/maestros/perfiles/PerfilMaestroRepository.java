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

    @Query(value = """
            SELECT p.usuario_id AS "usuarioId",
                   ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS "distanciaM"
            FROM perfiles_maestro p
            WHERE p.estado_verificacion = 'APROBADO'
              AND p.ubicacion IS NOT NULL
              AND ST_DWithin(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radioM)
            ORDER BY "distanciaM" ASC
            LIMIT 50
            """, nativeQuery = true)
    List<MaestroCercanoProjection> buscarCercanos(@Param("lat") double lat,
                                                  @Param("lon") double lon,
                                                  @Param("radioM") double radioM);

    @Query(value = """
            SELECT p.usuario_id AS "usuarioId",
                   ST_Distance(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS "distanciaM"
            FROM perfiles_maestro p
            WHERE p.estado_verificacion = 'APROBADO'
              AND p.ubicacion IS NOT NULL
              AND ST_DWithin(p.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radioM)
              AND EXISTS (SELECT 1 FROM perfil_maestro_oficios o
                          WHERE o.perfil_id = p.id AND o.oficio = :oficio)
            ORDER BY "distanciaM" ASC
            LIMIT 50
            """, nativeQuery = true)
    List<MaestroCercanoProjection> buscarCercanosPorOficio(@Param("lat") double lat,
                                                           @Param("lon") double lon,
                                                           @Param("radioM") double radioM,
                                                           @Param("oficio") String oficio);
}
