package cl.chasquiya.maestros.solicitudes;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {

    List<Solicitud> findByClienteIdOrderByFechaCreacionDesc(Long clienteId);

    List<Solicitud> findByMaestroIdOrderByFechaCreacionDesc(Long maestroId);

    /** Para el panel de disputas del admin. */
    List<Solicitud> findByEstadoOrderByFechaActualizacionDesc(EstadoServicio estado);
}
