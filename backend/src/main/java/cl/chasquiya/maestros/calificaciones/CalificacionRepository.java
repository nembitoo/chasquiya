package cl.chasquiya.maestros.calificaciones;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CalificacionRepository extends JpaRepository<Calificacion, Long> {

    boolean existsBySolicitudIdAndAutorId(Long solicitudId, Long autorId);

    List<Calificacion> findBySolicitudId(Long solicitudId);

    List<Calificacion> findByDestinatarioIdOrderByFechaCreacionDesc(Long destinatarioId);

    /** Promedio y cantidad de calificaciones recibidas, para varios usuarios de una vez. */
    @Query("""
            SELECT c.destinatarioId AS usuarioId,
                   AVG(c.estrellas) AS promedio,
                   COUNT(c) AS cantidad
            FROM Calificacion c
            WHERE c.destinatarioId IN :usuarioIds
            GROUP BY c.destinatarioId
            """)
    List<ResumenReputacion> resumenDe(@Param("usuarioIds") Collection<Long> usuarioIds);

    interface ResumenReputacion {
        Long getUsuarioId();

        Double getPromedio();

        Long getCantidad();
    }
}
