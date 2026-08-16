package cl.chasquiya.maestros.catalogo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicioMaestroRepository extends JpaRepository<ServicioMaestro, Long> {

    /** El catálogo completo del maestro, incluidos los pausados (solo lo ve él). */
    List<ServicioMaestro> findByMaestroIdOrderByOficioAscTituloAsc(Long maestroId);

    /** Lo que ve un cliente: solo lo que el maestro tiene publicado. */
    List<ServicioMaestro> findByMaestroIdAndActivoTrueOrderByOficioAscTituloAsc(Long maestroId);

    Optional<ServicioMaestro> findByIdAndMaestroId(Long id, Long maestroId);

    long countByMaestroId(Long maestroId);
}
