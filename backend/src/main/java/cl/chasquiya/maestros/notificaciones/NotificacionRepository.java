package cl.chasquiya.maestros.notificaciones;

import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    /** Las más nuevas primero, acotadas para no crecer sin límite en la app. */
    List<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId, Limit limite);

    List<Notificacion> findByUsuarioIdAndLeidaFalse(Long usuarioId);

    long countByUsuarioIdAndLeidaFalse(Long usuarioId);

    List<Notificacion> findByUsuarioId(Long usuarioId);
}
