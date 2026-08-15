package cl.chasquiya.maestros.privacidad;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Derechos del titular de datos (Ley 21.719).
 * Exportar: derecho de acceso y portabilidad. Eliminar: derecho de supresión.
 */
@RestController
@RequestMapping("/privacidad")
public class PrivacidadController {

    private final PrivacidadService servicio;
    private final UsuarioRepository usuarios;

    public PrivacidadController(PrivacidadService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /** Copia completa de los datos personales del usuario autenticado. */
    @GetMapping("/mis-datos")
    public Map<String, Object> misDatos(Authentication auth) {
        return servicio.exportar(idAutenticado(auth));
    }

    @DeleteMapping("/mi-cuenta")
    public Map<String, String> eliminarCuenta(Authentication auth) {
        return servicio.eliminarCuenta(idAutenticado(auth));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
