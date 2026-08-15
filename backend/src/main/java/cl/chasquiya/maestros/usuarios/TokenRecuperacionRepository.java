package cl.chasquiya.maestros.usuarios;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenRecuperacionRepository extends JpaRepository<TokenRecuperacion, Long> {

    List<TokenRecuperacion> findByUsuarioIdAndUsadoFalse(Long usuarioId);
}
