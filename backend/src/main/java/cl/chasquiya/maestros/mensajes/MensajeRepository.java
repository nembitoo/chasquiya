package cl.chasquiya.maestros.mensajes;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.transaction.Transactional;

public interface MensajeRepository extends JpaRepository<Mensaje, Long> {

    List<Mensaje> findBySolicitudIdOrderByFechaCreacionAsc(Long solicitudId);

    /** Mensajes que le escribieron a este usuario y aún no ha leído, agrupados por solicitud. */
    @Query("""
            SELECT m.solicitudId AS solicitudId, COUNT(m) AS cantidad
            FROM Mensaje m
            WHERE m.autorId <> :usuarioId AND m.leido = false
              AND m.solicitudId IN :solicitudIds
            GROUP BY m.solicitudId
            """)
    List<NoLeidosPorSolicitud> contarNoLeidos(@Param("usuarioId") Long usuarioId,
                                              @Param("solicitudIds") List<Long> solicitudIds);

    /** Marca como leídos los mensajes que el usuario recibió en esa solicitud. */
    @Modifying
    @Transactional
    @Query("UPDATE Mensaje m SET m.leido = true WHERE m.solicitudId = :solicitudId AND m.autorId <> :usuarioId")
    int marcarLeidos(@Param("solicitudId") Long solicitudId, @Param("usuarioId") Long usuarioId);

    interface NoLeidosPorSolicitud {
        Long getSolicitudId();

        Long getCantidad();
    }
}
