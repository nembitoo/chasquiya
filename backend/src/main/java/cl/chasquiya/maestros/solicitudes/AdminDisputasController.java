package cl.chasquiya.maestros.solicitudes;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;

/** Mediación de disputas. Solo rol ADMIN (ver SecurityConfig: /admin/**). */
@RestController
@RequestMapping("/admin/disputas")
public class AdminDisputasController {

    private final SolicitudService servicio;

    public AdminDisputasController(SolicitudService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<SolicitudResponse> abiertas() {
        return servicio.disputasAbiertas();
    }

    /** Cuerpo: { "aFavorDelCliente": true|false, "resolucion": "texto" } */
    @PostMapping("/{id}/resolver")
    public SolicitudResponse resolver(@PathVariable Long id, @RequestBody Map<String, Object> cuerpo) {
        boolean aFavorDelCliente = Boolean.TRUE.equals(cuerpo.get("aFavorDelCliente"));
        Object resolucion = cuerpo.get("resolucion");
        return servicio.resolverDisputa(id, aFavorDelCliente, resolucion != null ? resolucion.toString() : null);
    }
}
