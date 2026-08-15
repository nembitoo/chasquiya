package cl.chasquiya.maestros.usuarios;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.usuarios.dto.ActualizarPerfilRequest;
import cl.chasquiya.maestros.usuarios.dto.AuthResponse;
import cl.chasquiya.maestros.usuarios.dto.LoginRequest;
import cl.chasquiya.maestros.usuarios.dto.RegistroRequest;
import cl.chasquiya.maestros.usuarios.dto.UsuarioResponse;
import jakarta.validation.Valid;

/** Endpoints de identidad: registro, login y datos del usuario autenticado. */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarios;

    public AuthController(AuthService authService, UsuarioRepository usuarios) {
        this.authService = authService;
        this.usuarios = usuarios;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registro(@Valid @RequestBody RegistroRequest req) {
        return authService.registrar(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    /** Requiere token válido. Devuelve los datos del usuario dueño del token. */
    @GetMapping("/yo")
    public UsuarioResponse yo(Authentication auth) {
        Usuario u = usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        return aResponse(u);
    }

    /** Edita los datos propios. El correo no se cambia: identifica la cuenta. */
    @PutMapping("/yo")
    public UsuarioResponse actualizar(Authentication auth, @Valid @RequestBody ActualizarPerfilRequest req) {
        Usuario u = usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        u.setNombre(req.nombre().trim());
        u.setApellido(req.apellido().trim());
        u.setTelefono(req.telefono() != null && !req.telefono().isBlank() ? req.telefono().trim() : null);
        usuarios.save(u);
        return aResponse(u);
    }

    private UsuarioResponse aResponse(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNombre(), u.getApellido(),
                u.getEmail(), u.getTelefono(), u.getRol(), u.tieneAvatar());
    }
}
