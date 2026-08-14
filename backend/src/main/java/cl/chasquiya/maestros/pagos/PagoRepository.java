package cl.chasquiya.maestros.pagos;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findBySolicitudId(Long solicitudId);

    List<Pago> findBySolicitudIdIn(Collection<Long> solicitudIds);
}
