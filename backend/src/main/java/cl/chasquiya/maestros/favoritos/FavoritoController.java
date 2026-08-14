package cl.chasquiya.maestros.favoritos;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Maestros guardados por el cliente. */
@RestController
@RequestMapping("/favoritos")
public class FavoritoController {

    private final FavoritoService servicio;
    private final UsuarioRepository usuarios;

    public FavoritoController(FavoritoService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping
    public List<MaestroCercanoResponse> mios(Authentication auth) {
        return servicio.listar(idAutenticado(auth));
    }

    /** Guarda o quita el maestro. Devuelve { "esFavorito": true|false }. */
    @PostMapping("/{maestroId}")
    public Map<String, Boolean> alternar(Authentication auth, @PathVariable Long maestroId) {
        return Map.of("esFavorito", servicio.alternar(idAutenticado(auth), maestroId));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
