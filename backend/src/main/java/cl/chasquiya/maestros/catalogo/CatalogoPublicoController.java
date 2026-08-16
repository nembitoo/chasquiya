package cl.chasquiya.maestros.catalogo;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cl.chasquiya.maestros.catalogo.dto.ServicioResponse;

/**
 * El catálogo de un maestro visto por un cliente.
 *
 * <p>Va separado del controlador del maestro a propósito: aquí solo se lee, y
 * solo lo que está publicado. Tampoco cuelga de {@code /maestros/**}, que está
 * reservado a quien tiene rol MAESTRO.
 */
@RestController
@RequestMapping("/catalogo")
public class CatalogoPublicoController {

    private final CatalogoService servicio;

    public CatalogoPublicoController(CatalogoService servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/{maestroId}")
    public List<ServicioResponse> deMaestro(@PathVariable Long maestroId) {
        return servicio.publicosDe(maestroId);
    }
}
