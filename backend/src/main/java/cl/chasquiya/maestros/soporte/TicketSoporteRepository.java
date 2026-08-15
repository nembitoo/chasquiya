package cl.chasquiya.maestros.soporte;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Long> {

    List<TicketSoporte> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);

    List<TicketSoporte> findByEstadoOrderByFechaCreacionAsc(EstadoTicket estado);

    long countByEstado(EstadoTicket estado);
}
