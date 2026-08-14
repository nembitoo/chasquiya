package cl.chasquiya.maestros.mensajes;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.mensajes.dto.EnviarMensajeRequest;
import cl.chasquiya.maestros.mensajes.dto.MensajeResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Chat de una solicitud (solo sus dos partes). */
@RestController
@RequestMapping
public class MensajeController {

    private final MensajeService servicio;
    private final UsuarioRepository usuarios;

    public MensajeController(MensajeService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping("/solicitudes/{id}/mensajes")
    public List<MensajeResponse> listar(Authentication auth, @PathVariable Long id) {
        return servicio.listar(idAutenticado(auth), id);
    }

    @PostMapping("/solicitudes/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    public MensajeResponse enviar(Authentication auth, @PathVariable Long id,
                                  @Valid @RequestBody EnviarMensajeRequest req) {
        return servicio.enviar(idAutenticado(auth), id, req.texto());
    }

    @PostMapping("/solicitudes/{id}/mensajes/leidos")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarLeidos(Authentication auth, @PathVariable Long id) {
        servicio.marcarLeidos(idAutenticado(auth), id);
    }

    /** Mapa { solicitudId: cantidadNoLeidos } para pintar los badges en las listas. */
    @GetMapping("/mensajes/no-leidos")
    public Map<Long, Long> noLeidos(Authentication auth) {
        return servicio.noLeidosPorSolicitud(idAutenticado(auth));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
