package cl.chasquiya.maestros.soporte;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MensajeTicketRepository extends JpaRepository<MensajeTicket, Long> {

    List<MensajeTicket> findByTicketIdOrderByFechaCreacionAsc(Long ticketId);

    List<MensajeTicket> findByTicketIdIn(List<Long> ticketIds);

    /** Ley 19.496: un reclamo no se cierra sin que el admin haya escrito algo. */
    boolean existsByTicketIdAndEsAdminTrue(Long ticketId);

    long countByTicketId(Long ticketId);
}
