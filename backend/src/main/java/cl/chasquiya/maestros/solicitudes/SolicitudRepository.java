package cl.chasquiya.maestros.solicitudes;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

    List<Solicitud> findByClienteIdOrderByFechaCreacionDesc(Long clienteId);

    List<Solicitud> findByMaestroIdOrderByFechaCreacionDesc(Long maestroId);

    /** Trabajos de varios maestros a la vez, para contar los terminados sin N+1 consultas. */
    List<Solicitud> findByMaestroIdIn(Collection<Long> maestroIds);

    /** Para el panel de disputas del admin. */
    List<Solicitud> findByEstadoOrderByFechaActualizacionDesc(EstadoServicio estado);

    /**
     * Solicitudes abiertas del oficio que el maestro atiende y que le quedan
     * cerca. "Abierta" = sin maestro elegido y todavía en SOLICITADO.
     *
     * <p>Las que no tienen ubicación se incluyen igual: el cliente pudo no dar
     * permiso de GPS, y dejarlas fuera seria castigarlo por eso.
     */
    @Query(value = """
            SELECT * FROM solicitudes s
            WHERE s.maestro_id IS NULL
              AND s.estado = 'SOLICITADO'
              AND s.oficio = :oficio
              AND s.cliente_id <> :maestroId
              AND (
                    s.ubicacion IS NULL
                 OR ST_DWithin(s.ubicacion, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radioM)
              )
            ORDER BY s.fecha_creacion DESC
            LIMIT 50
            """, nativeQuery = true)
    List<Solicitud> buscarAbiertasCerca(@Param("oficio") String oficio,
                                        @Param("lat") double lat,
                                        @Param("lon") double lon,
                                        @Param("radioM") double radioM,
                                        @Param("maestroId") Long maestroId);

    /** Cuando el maestro no tiene ubicación registrada: calce solo por oficio. */
    @Query(value = """
            SELECT * FROM solicitudes s
            WHERE s.maestro_id IS NULL
              AND s.estado = 'SOLICITADO'
              AND s.oficio = :oficio
              AND s.cliente_id <> :maestroId
            ORDER BY s.fecha_creacion DESC
            LIMIT 50
            """, nativeQuery = true)
    List<Solicitud> buscarAbiertasPorOficio(@Param("oficio") String oficio,
                                            @Param("maestroId") Long maestroId);
}
