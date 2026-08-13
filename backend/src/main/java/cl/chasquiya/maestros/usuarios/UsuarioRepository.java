package cl.chasquiya.maestros.usuarios;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Acceso a la tabla usuarios. Spring Data implementa estos métodos por su nombre. */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);
}
