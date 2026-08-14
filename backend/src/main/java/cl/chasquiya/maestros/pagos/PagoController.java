package cl.chasquiya.maestros.pagos;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.pagos.dto.IngresosResponse;
import cl.chasquiya.maestros.pagos.dto.PagoResponse;
import cl.chasquiya.maestros.pagos.dto.ResumenPagoResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Pago simulado del servicio e ingresos del maestro. */
@RestController
public class PagoController {

    private final PagoService servicio;
    private final UsuarioRepository usuarios;

    public PagoController(PagoService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /** Desglose antes de pagar (lo ve el cliente). */
    @GetMapping("/solicitudes/{id}/pago")
    public ResumenPagoResponse resumen(Authentication auth, @PathVariable Long id) {
        return servicio.resumen(idAutenticado(auth), id);
    }

    @PostMapping("/solicitudes/{id}/pago")
    @ResponseStatus(HttpStatus.CREATED)
    public PagoResponse pagar(Authentication auth, @PathVariable Long id) {
        return servicio.pagar(idAutenticado(auth), id);
    }

    /** Panel de ingresos del maestro autenticado. */
    @GetMapping("/maestros/mis-ingresos")
    public IngresosResponse misIngresos(Authentication auth) {
        return servicio.ingresosDe(idAutenticado(auth));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
