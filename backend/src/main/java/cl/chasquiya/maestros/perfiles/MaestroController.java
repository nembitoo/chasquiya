package cl.chasquiya.maestros.perfiles;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroRequest;
import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Perfil del maestro autenticado. Solo accesible con rol MAESTRO (ver SecurityConfig). */
@RestController
@RequestMapping("/maestros")
public class MaestroController {

    private final PerfilMaestroService servicio;
    private final UsuarioRepository usuarios;

    public MaestroController(PerfilMaestroService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping("/mi-perfil")
    public PerfilMaestroResponse miPerfil(Authentication auth) {
        return servicio.obtenerPorUsuario(idAutenticado(auth));
    }

    @PutMapping("/mi-perfil")
    public PerfilMaestroResponse guardarMiPerfil(Authentication auth,
                                                 @Valid @RequestBody PerfilMaestroRequest req) {
        return servicio.guardar(idAutenticado(auth), req);
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
