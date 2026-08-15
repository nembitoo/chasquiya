package cl.chasquiya.maestros.direcciones;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DireccionRepository extends JpaRepository<Direccion, Long> {

    List<Direccion> findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(Long usuarioId);

    Optional<Direccion> findByIdAndUsuarioId(Long id, Long usuarioId);
}
