package cl.chasquiya.maestros.perfiles;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PerfilMaestroRepository extends JpaRepository<PerfilMaestro, Long> {

    Optional<PerfilMaestro> findByUsuarioId(Long usuarioId);

    List<PerfilMaestro> findByEstadoVerificacion(EstadoVerificacion estado);
}
