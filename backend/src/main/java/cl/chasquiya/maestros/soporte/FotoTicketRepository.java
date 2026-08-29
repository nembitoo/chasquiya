package cl.chasquiya.maestros.soporte;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FotoTicketRepository extends JpaRepository<FotoTicket, Long> {

    List<FotoTicket> findByTicketIdOrderByFechaCreacionAsc(Long ticketId);

    List<FotoTicket> findByTicketIdIn(List<Long> ticketIds);

    Optional<FotoTicket> findByIdAndTicketId(Long id, Long ticketId);

    long countByTicketId(Long ticketId);
}
