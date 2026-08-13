package cl.chasquiya.maestros.documentos;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoMaestroRepository extends JpaRepository<DocumentoMaestro, Long> {

    List<DocumentoMaestro> findByUsuarioId(Long usuarioId);

    Optional<DocumentoMaestro> findByIdAndUsuarioId(Long id, Long usuarioId);
}
