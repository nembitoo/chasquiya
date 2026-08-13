package cl.chasquiya.maestros.perfiles;

import java.util.List;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.ArchivoDescarga;
import cl.chasquiya.maestros.documentos.DocumentoMaestroService;
import cl.chasquiya.maestros.documentos.dto.DocumentoResponse;
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
    private final DocumentoMaestroService documentos;

    public AdminMaestrosController(PerfilMaestroService servicio, UsuarioRepository usuarios,
                                   DocumentoMaestroService documentos) {
        this.servicio = servicio;
        this.usuarios = usuarios;
        this.documentos = documentos;
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

    @GetMapping("/{usuarioId}/documentos")
    public List<DocumentoResponse> documentos(@PathVariable Long usuarioId) {
        return documentos.listar(usuarioId);
    }

    @GetMapping("/{usuarioId}/documentos/{id}/contenido")
    public ResponseEntity<Resource> documentoContenido(@PathVariable Long usuarioId, @PathVariable Long id) {
        ArchivoDescarga a = documentos.descargar(usuarioId, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipoContenido()))
                .body(new ByteArrayResource(a.datos()));
    }

    private MaestroAdminResponse aAdminResponse(PerfilMaestro p) {
        Usuario u = usuarios.findById(p.getUsuarioId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        return new MaestroAdminResponse(p.getUsuarioId(), u.getNombre(), u.getApellido(), u.getEmail(),
                p.getOficios(), p.getZonaCobertura(), p.getAniosExperiencia(), p.getEstadoVerificacion());
    }
}
