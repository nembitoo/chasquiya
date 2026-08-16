package cl.chasquiya.maestros.catalogo;

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

import cl.chasquiya.maestros.catalogo.dto.ServicioRequest;
import cl.chasquiya.maestros.catalogo.dto.ServicioResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** El catálogo del maestro autenticado: lo suyo, incluido lo pausado. */
@RestController
@RequestMapping("/mi-catalogo")
public class CatalogoController {

    private final CatalogoService servicio;
    private final UsuarioRepository usuarios;

    public CatalogoController(CatalogoService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping
    public List<ServicioResponse> mios(Authentication auth) {
        return servicio.mios(idAutenticado(auth));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServicioResponse crear(Authentication auth, @Valid @RequestBody ServicioRequest req) {
        return servicio.crear(idAutenticado(auth), req);
    }

    @PutMapping("/{id}")
    public ServicioResponse actualizar(Authentication auth, @PathVariable Long id,
                                       @Valid @RequestBody ServicioRequest req) {
        return servicio.actualizar(idAutenticado(auth), id, req);
    }

    /** Publicar o pausar el servicio sin perder lo escrito. */
    @PostMapping("/{id}/alternar")
    public ServicioResponse alternar(Authentication auth, @PathVariable Long id) {
        return servicio.alternar(idAutenticado(auth), id);
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
