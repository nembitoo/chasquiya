package cl.chasquiya.maestros.solicitudes;

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

import cl.chasquiya.maestros.solicitudes.dto.CotizarRequest;
import cl.chasquiya.maestros.solicitudes.dto.CrearSolicitudRequest;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Transacción: solicitudes, cotizaciones y avance de estados. */
@RestController
@RequestMapping("/solicitudes")
public class SolicitudController {

    private final SolicitudService servicio;
    private final UsuarioRepository usuarios;

    public SolicitudController(SolicitudService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    // --- Cliente ---

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SolicitudResponse crear(Authentication auth, @Valid @RequestBody CrearSolicitudRequest req) {
        return servicio.crear(idAutenticado(auth), req);
    }

    @GetMapping("/mias")
    public List<SolicitudResponse> mias(Authentication auth) {
        return servicio.misSolicitudesComoCliente(idAutenticado(auth));
    }

    @PostMapping("/{id}/aceptar")
    public SolicitudResponse aceptar(Authentication auth, @PathVariable Long id) {
        return servicio.aceptar(idAutenticado(auth), id);
    }

    @PostMapping("/{id}/rechazar")
    public SolicitudResponse rechazar(Authentication auth, @PathVariable Long id) {
        return servicio.rechazarCotizacion(idAutenticado(auth), id);
    }

    // --- Maestro ---

    @GetMapping("/recibidas")
    public List<SolicitudResponse> recibidas(Authentication auth) {
        return servicio.misSolicitudesComoMaestro(idAutenticado(auth));
    }

    @PostMapping("/{id}/cotizar")
    public SolicitudResponse cotizar(Authentication auth, @PathVariable Long id,
                                     @Valid @RequestBody CotizarRequest req) {
        return servicio.cotizar(idAutenticado(auth), id, req);
    }

    @PostMapping("/{id}/iniciar")
    public SolicitudResponse iniciar(Authentication auth, @PathVariable Long id) {
        return servicio.iniciar(idAutenticado(auth), id);
    }

    @PostMapping("/{id}/completar")
    public SolicitudResponse completar(Authentication auth, @PathVariable Long id) {
        return servicio.completar(idAutenticado(auth), id);
    }

    // --- Ambas partes ---

    @GetMapping("/{id}")
    public SolicitudResponse obtener(Authentication auth, @PathVariable Long id) {
        return servicio.obtener(idAutenticado(auth), id);
    }

    @PostMapping("/{id}/cancelar")
    public SolicitudResponse cancelar(Authentication auth, @PathVariable Long id,
                                      @RequestBody(required = false) Map<String, String> cuerpo) {
        return servicio.cancelar(idAutenticado(auth), id, cuerpo != null ? cuerpo.get("motivo") : null);
    }

    @PostMapping("/{id}/disputa")
    public SolicitudResponse disputa(Authentication auth, @PathVariable Long id,
                                     @RequestBody(required = false) Map<String, String> cuerpo) {
        return servicio.abrirDisputa(idAutenticado(auth), id, cuerpo != null ? cuerpo.get("motivo") : null);
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
