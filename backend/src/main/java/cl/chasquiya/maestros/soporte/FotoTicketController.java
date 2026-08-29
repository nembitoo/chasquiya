package cl.chasquiya.maestros.soporte;

import java.util.List;
import java.util.Map;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.ArchivoDescarga;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Evidencias adjuntas a un reclamo, para quien lo escribió. */
@RestController
@RequestMapping("/soporte/reclamos/{ticketId}/fotos")
public class FotoTicketController {

    private final FotoTicketService servicio;
    private final UsuarioRepository usuarios;

    public FotoTicketController(FotoTicketService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /** Devuelve los ids; el contenido se pide por separado para poder cachearlo. */
    @GetMapping
    public List<Long> listar(Authentication auth, @PathVariable Long ticketId) {
        return servicio.listar(idAutenticado(auth), ticketId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> subir(Authentication auth, @PathVariable Long ticketId,
                                   @RequestParam("archivo") MultipartFile archivo) {
        return Map.of("id", servicio.subir(idAutenticado(auth), ticketId, archivo));
    }

    @GetMapping("/{fotoId}/contenido")
    public ResponseEntity<Resource> contenido(Authentication auth, @PathVariable Long ticketId,
                                              @PathVariable Long fotoId) {
        return archivo(servicio.descargar(idAutenticado(auth), ticketId, fotoId));
    }

    @DeleteMapping("/{fotoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(Authentication auth, @PathVariable Long ticketId, @PathVariable Long fotoId) {
        servicio.eliminar(idAutenticado(auth), ticketId, fotoId);
    }

    static ResponseEntity<Resource> archivo(ArchivoDescarga a) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipoContenido()))
                .body(new ByteArrayResource(a.datos()));
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}

/** Las mismas evidencias para el backoffice (protegido por /admin/**). */
@RestController
@RequestMapping("/admin/reclamos/{ticketId}/fotos")
class AdminFotoTicketController {

    private final FotoTicketService servicio;

    AdminFotoTicketController(FotoTicketService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<Long> listar(@PathVariable Long ticketId) {
        return servicio.listarComoAdmin(ticketId);
    }

    @GetMapping("/{fotoId}/contenido")
    public ResponseEntity<Resource> contenido(@PathVariable Long ticketId, @PathVariable Long fotoId) {
        return FotoTicketController.archivo(servicio.descargarComoAdmin(ticketId, fotoId));
    }
}
