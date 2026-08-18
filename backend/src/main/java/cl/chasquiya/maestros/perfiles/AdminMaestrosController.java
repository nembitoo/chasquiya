package cl.chasquiya.maestros.perfiles;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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
import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
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
    private final DescubrimientoService descubrimiento;

    public AdminMaestrosController(PerfilMaestroService servicio, UsuarioRepository usuarios,
                                   DocumentoMaestroService documentos,
                                   DescubrimientoService descubrimiento) {
        this.servicio = servicio;
        this.usuarios = usuarios;
        this.documentos = documentos;
        this.descubrimiento = descubrimiento;
    }

    @GetMapping("/pendientes")
    public List<MaestroAdminResponse> pendientes() {
        return aAdminResponses(servicio.listarPorEstado(EstadoVerificacion.PENDIENTE));
    }

    /** Todos los maestros con perfil, sin importar su estado (tabla del backoffice). */
    @GetMapping
    public List<MaestroAdminResponse> todos() {
        return aAdminResponses(servicio.listarTodos());
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

    /**
     * La reputacion, los trabajos terminados y el avatar salen de la misma
     * ficha que ya arma descubrimiento: se piden en lote para no hacer una
     * consulta por maestro.
     */
    private List<MaestroAdminResponse> aAdminResponses(List<PerfilMaestro> perfiles) {
        if (perfiles.isEmpty()) {
            return List.of();
        }
        List<Long> ids = perfiles.stream().map(PerfilMaestro::getUsuarioId).toList();
        Map<Long, Usuario> personas = usuarios.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));
        Map<Long, MaestroCercanoResponse> fichas = descubrimiento.fichasDe(ids, null, Map.of()).stream()
                .collect(Collectors.toMap(MaestroCercanoResponse::usuarioId, Function.identity()));

        return perfiles.stream()
                .map(p -> {
                    Usuario u = personas.get(p.getUsuarioId());
                    if (u == null) {
                        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado");
                    }
                    MaestroCercanoResponse f = fichas.get(p.getUsuarioId());
                    return new MaestroAdminResponse(
                            p.getUsuarioId(), u.getNombre(), u.getApellido(), u.getEmail(), u.getTelefono(),
                            p.getOficios(), p.getDescripcion(), p.getZonaCobertura(),
                            p.getAniosExperiencia(), p.getEstadoVerificacion(),
                            u.tieneAvatar(),
                            f == null ? 0 : f.trabajosCompletados(),
                            f == null ? 0 : f.calificacionPromedio(),
                            f == null ? 0 : f.cantidadCalificaciones());
                })
                .toList();
    }
}
