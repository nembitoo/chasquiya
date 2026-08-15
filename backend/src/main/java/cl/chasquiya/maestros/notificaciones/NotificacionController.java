package cl.chasquiya.maestros.notificaciones;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.notificaciones.dto.BandejaResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Bandeja de avisos del usuario autenticado. */
@RestController
@RequestMapping("/notificaciones")
public class NotificacionController {

    private final NotificacionService servicio;
    private final UsuarioRepository usuarios;

    public NotificacionController(NotificacionService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping
    public BandejaResponse bandeja(Authentication auth) {
        return servicio.bandeja(idAutenticado(auth));
    }

    @PostMapping("/{id}/leer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leer(Authentication auth, @PathVariable Long id) {
        servicio.marcarLeida(idAutenticado(auth), id);
    }

    @PostMapping("/leer-todas")
    public Map<String, Integer> leerTodas(Authentication auth) {
        return Map.of("marcadas", servicio.marcarTodasLeidas(idAutenticado(auth)));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
