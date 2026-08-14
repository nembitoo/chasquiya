package cl.chasquiya.maestros.descubrimiento;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroPublicoResponse;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Descubrimiento de maestros para clientes (requiere estar autenticado). */
@RestController
@RequestMapping("/descubrimiento")
public class DescubrimientoController {

    private final DescubrimientoService servicio;
    private final UsuarioRepository usuarios;

    public DescubrimientoController(DescubrimientoService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /**
     * Maestros aprobados cerca de (lat, lon).
     * Filtros opcionales: oficio, radio, precio máximo y calificación mínima.
     * Orden: "distancia" (por defecto), "calificacion" o "precio".
     */
    @GetMapping("/maestros")
    public List<MaestroCercanoResponse> buscar(
            Authentication auth,
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(required = false) Double radioKm,
            @RequestParam(required = false) Oficio oficio,
            @RequestParam(required = false) Integer precioMaximo,
            @RequestParam(required = false) Double calificacionMinima,
            @RequestParam(required = false) String orden) {
        return servicio.buscar(lat, lon, radioKm, oficio, idAutenticado(auth),
                precioMaximo, calificacionMinima, orden);
    }

    @GetMapping("/maestros/{usuarioId}")
    public MaestroPublicoResponse maestro(Authentication auth, @PathVariable Long usuarioId) {
        return servicio.obtenerPublico(usuarioId, idAutenticado(auth));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
