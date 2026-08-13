package cl.chasquiya.maestros.descubrimiento;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroPublicoResponse;
import cl.chasquiya.maestros.perfiles.Oficio;

/** Descubrimiento de maestros para clientes (requiere estar autenticado). */
@RestController
@RequestMapping("/descubrimiento")
public class DescubrimientoController {

    private final DescubrimientoService servicio;

    public DescubrimientoController(DescubrimientoService servicio) {
        this.servicio = servicio;
    }

    /** Maestros aprobados cerca de (lat, lon), opcionalmente filtrados por oficio. */
    @GetMapping("/maestros")
    public List<MaestroCercanoResponse> buscar(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(required = false) Double radioKm,
            @RequestParam(required = false) Oficio oficio) {
        return servicio.buscar(lat, lon, radioKm, oficio);
    }

    @GetMapping("/maestros/{usuarioId}")
    public MaestroPublicoResponse maestro(@PathVariable Long usuarioId) {
        return servicio.obtenerPublico(usuarioId);
    }
}
