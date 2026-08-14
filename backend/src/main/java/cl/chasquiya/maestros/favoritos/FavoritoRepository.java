package cl.chasquiya.maestros.favoritos;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoritoRepository extends JpaRepository<Favorito, Long> {

    List<Favorito> findByClienteIdOrderByFechaCreacionDesc(Long clienteId);

    Optional<Favorito> findByClienteIdAndMaestroId(Long clienteId, Long maestroId);

    boolean existsByClienteIdAndMaestroId(Long clienteId, Long maestroId);
}
