package cl.chasquiya.maestros.direcciones;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.direcciones.dto.DireccionRequest;
import cl.chasquiya.maestros.direcciones.dto.DireccionResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Direcciones guardadas del usuario autenticado. */
@RestController
@RequestMapping("/mis-direcciones")
public class DireccionController {

    private final DireccionService servicio;
    private final UsuarioRepository usuarios;

    public DireccionController(DireccionService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping
    public List<DireccionResponse> listar(Authentication auth) {
        return servicio.listar(idAutenticado(auth));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DireccionResponse crear(Authentication auth, @Valid @RequestBody DireccionRequest req) {
        return servicio.crear(idAutenticado(auth), req);
    }

    @PutMapping("/{id}")
    public DireccionResponse actualizar(Authentication auth, @PathVariable Long id,
                                        @Valid @RequestBody DireccionRequest req) {
        return servicio.actualizar(idAutenticado(auth), id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(Authentication auth, @PathVariable Long id) {
        servicio.eliminar(idAutenticado(auth), id);
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
