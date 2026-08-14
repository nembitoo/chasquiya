package cl.chasquiya.maestros.calificaciones;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.dto.CalificacionResponse;
import cl.chasquiya.maestros.calificaciones.dto.CalificarRequest;
import cl.chasquiya.maestros.calificaciones.dto.ReputacionResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Calificación mutua y reseñas públicas. */
@RestController
public class CalificacionController {

    private final CalificacionService servicio;
    private final UsuarioRepository usuarios;

    public CalificacionController(CalificacionService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @PostMapping("/solicitudes/{id}/calificacion")
    @ResponseStatus(HttpStatus.CREATED)
    public CalificacionResponse calificar(Authentication auth, @PathVariable Long id,
                                          @Valid @RequestBody CalificarRequest req) {
        return servicio.calificar(idAutenticado(auth), id, req);
    }

    /** Reseñas recibidas por un usuario (público entre usuarios autenticados). */
    @GetMapping("/usuarios/{usuarioId}/resenas")
    public List<CalificacionResponse> resenas(@PathVariable Long usuarioId) {
        return servicio.resenasDe(usuarioId);
    }

    @GetMapping("/usuarios/{usuarioId}/reputacion")
    public ReputacionResponse reputacion(@PathVariable Long usuarioId) {
        return servicio.reputacionDe(usuarioId);
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
