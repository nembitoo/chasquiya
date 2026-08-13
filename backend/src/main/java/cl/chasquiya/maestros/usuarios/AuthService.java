package cl.chasquiya.maestros.usuarios;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.seguridad.JwtService;
import cl.chasquiya.maestros.usuarios.dto.AuthResponse;
import cl.chasquiya.maestros.usuarios.dto.LoginRequest;
import cl.chasquiya.maestros.usuarios.dto.RegistroRequest;

/** Lógica de registro e inicio de sesión. */
@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwtService) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public AuthResponse registrar(RegistroRequest req) {
        String email = normalizar(req.email());
        if (usuarios.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuenta con ese correo");
        }
        Usuario usuario = new Usuario(
                req.nombre().trim(),
                req.apellido().trim(),
                email,
                req.telefono().trim(),
                encoder.encode(req.password()),
                req.rol(),
                req.aceptoTerminos());
        usuarios.save(usuario);
        return construirRespuesta(usuario);
    }

    public AuthResponse login(LoginRequest req) {
        String email = normalizar(req.email());
        Usuario usuario = usuarios.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos"));
        if (!encoder.matches(req.password(), usuario.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        return construirRespuesta(usuario);
    }

    private String normalizar(String email) {
        return email.trim().toLowerCase();
    }

    private AuthResponse construirRespuesta(Usuario u) {
        String token = jwtService.generarToken(u);
        return new AuthResponse(token, u.getId(), u.getNombre(), u.getEmail(), u.getRol());
    }
}
