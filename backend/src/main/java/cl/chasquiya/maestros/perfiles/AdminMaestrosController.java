package cl.chasquiya.maestros.perfiles;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.perfiles.dto.MaestroAdminResponse;
import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroResponse;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Gestión de maestros por el admin. Solo accesible con rol ADMIN (ver SecurityConfig). */
@RestController
@RequestMapping("/admin/maestros")
public class AdminMaestrosController {

    private final PerfilMaestroService servicio;
    private final UsuarioRepository usuarios;

    public AdminMaestrosController(PerfilMaestroService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @GetMapping("/pendientes")
    public List<MaestroAdminResponse> pendientes() {
        return servicio.listarPorEstado(EstadoVerificacion.PENDIENTE).stream()
                .map(this::aAdminResponse)
                .toList();
    }

    @PostMapping("/{usuarioId}/aprobar")
    public PerfilMaestroResponse aprobar(@PathVariable Long usuarioId) {
        return servicio.cambiarEstado(usuarioId, EstadoVerificacion.APROBADO);
    }

    @PostMapping("/{usuarioId}/rechazar")
    public PerfilMaestroResponse rechazar(@PathVariable Long usuarioId) {
        return servicio.cambiarEstado(usuarioId, EstadoVerificacion.RECHAZADO);
    }

    private MaestroAdminResponse aAdminResponse(PerfilMaestro p) {
        Usuario u = usuarios.findById(p.getUsuarioId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        return new MaestroAdminResponse(p.getUsuarioId(), u.getNombre(), u.getApellido(), u.getEmail(),
                p.getOficios(), p.getZonaCobertura(), p.getAniosExperiencia(), p.getEstadoVerificacion());
    }
}
