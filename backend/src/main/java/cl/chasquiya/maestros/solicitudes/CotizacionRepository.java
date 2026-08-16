package cl.chasquiya.maestros.solicitudes;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CotizacionRepository extends JpaRepository<Cotizacion, Long> {

    /** Todas las que recibió una solicitud: en una abierta compiten varias. */
    List<Cotizacion> findBySolicitudIdOrderByMontoAsc(Long solicitudId);

    Optional<Cotizacion> findBySolicitudIdAndMaestroId(Long solicitudId, Long maestroId);

    List<Cotizacion> findBySolicitudIdIn(Collection<Long> solicitudIds);

    boolean existsBySolicitudIdAndMaestroId(Long solicitudId, Long maestroId);
}
