package cl.chasquiya.maestros.solicitudes;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CotizacionRepository extends JpaRepository<Cotizacion, Long> {

    Optional<Cotizacion> findBySolicitudId(Long solicitudId);

    List<Cotizacion> findBySolicitudIdIn(Collection<Long> solicitudIds);
}
