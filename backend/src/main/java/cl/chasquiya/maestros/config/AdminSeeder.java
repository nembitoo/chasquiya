package cl.chasquiya.maestros.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import cl.chasquiya.maestros.usuarios.RolUsuario;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Al arrancar, crea un usuario ADMIN si todavía no existe (idempotente).
 * Así hay siempre alguien que puede aprobar maestros, sin tocar la BD a mano.
 * En producción, el email/clave se pasan por variables de entorno.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminSeeder(UsuarioRepository usuarios, PasswordEncoder encoder,
                       @Value("${chasquiya.admin.email}") String email,
                       @Value("${chasquiya.admin.password}") String password) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.email = email.trim().toLowerCase();
        this.password = password;
    }

    @Override
    public void run(String... args) {
        if (usuarios.existsByEmail(email)) {
            return;
        }
        Usuario admin = new Usuario("Admin", "Chasquiya", email, null,
                encoder.encode(password), RolUsuario.ADMIN, true);
        usuarios.save(admin);
        log.info("Usuario ADMIN creado: {}", email);
    }
}
