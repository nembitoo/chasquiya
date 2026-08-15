package cl.chasquiya.maestros.soporte;

import java.util.List;

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

import cl.chasquiya.maestros.soporte.dto.CrearTicketRequest;
import cl.chasquiya.maestros.soporte.dto.ResponderTicketRequest;
import cl.chasquiya.maestros.soporte.dto.TicketResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;
import jakarta.validation.Valid;

/** Reclamos y soporte del usuario autenticado. */
@RestController
@RequestMapping("/soporte")
public class SoporteController {

    private final SoporteService servicio;
    private final UsuarioRepository usuarios;

    public SoporteController(SoporteService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @PostMapping("/reclamos")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse crear(Authentication auth, @Valid @RequestBody CrearTicketRequest req) {
        return servicio.crear(idAutenticado(auth), req);
    }

    @GetMapping("/reclamos")
    public List<TicketResponse> mios(Authentication auth) {
        return servicio.mios(idAutenticado(auth));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}

/** Gestión de reclamos desde el backoffice (protegido por /admin/**). */
@RestController
@RequestMapping("/admin/reclamos")
class AdminSoporteController {

    private final SoporteService servicio;

    AdminSoporteController(SoporteService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<TicketResponse> todos() {
        return servicio.todos();
    }

    @PostMapping("/{id}")
    public TicketResponse responder(@PathVariable Long id, @Valid @RequestBody ResponderTicketRequest req) {
        return servicio.responder(id, req);
    }
}
