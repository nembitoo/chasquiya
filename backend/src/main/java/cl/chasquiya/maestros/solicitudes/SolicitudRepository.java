package cl.chasquiya.maestros.solicitudes;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

    List<Solicitud> findByClienteIdOrderByFechaCreacionDesc(Long clienteId);

    List<Solicitud> findByMaestroIdOrderByFechaCreacionDesc(Long maestroId);

    /** Trabajos de varios maestros a la vez, para contar los terminados sin N+1 consultas. */
    List<Solicitud> findByMaestroIdIn(Collection<Long> maestroIds);

    /** Para el panel de disputas del admin. */
    List<Solicitud> findByEstadoOrderByFechaActualizacionDesc(EstadoServicio estado);
}
