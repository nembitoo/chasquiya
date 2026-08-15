package cl.chasquiya.maestros.solicitudes;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoSolicitudRepository extends JpaRepository<FotoSolicitud, Long> {

    List<FotoSolicitud> findBySolicitudIdOrderByFechaCreacionAsc(Long solicitudId);

    List<FotoSolicitud> findBySolicitudIdIn(List<Long> solicitudIds);

    Optional<FotoSolicitud> findByIdAndSolicitudId(Long id, Long solicitudId);

    long countBySolicitudId(Long solicitudId);
}
