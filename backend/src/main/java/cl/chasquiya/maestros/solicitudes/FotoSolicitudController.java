package cl.chasquiya.maestros.solicitudes;

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

/** Fotos del problema adjuntas a una solicitud. */
@RestController
@RequestMapping("/solicitudes/{solicitudId}/fotos")
public class FotoSolicitudController {

    private final FotoSolicitudService servicio;
    private final UsuarioRepository usuarios;

    public FotoSolicitudController(FotoSolicitudService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    /** Devuelve los ids; el contenido se pide por separado para poder cachearlo. */
    @GetMapping
    public List<Long> listar(Authentication auth, @PathVariable Long solicitudId) {
        return servicio.listar(idAutenticado(auth), solicitudId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> subir(Authentication auth, @PathVariable Long solicitudId,
                                   @RequestParam("archivo") MultipartFile archivo) {
        return Map.of("id", servicio.subir(idAutenticado(auth), solicitudId, archivo));
    }

    @GetMapping("/{fotoId}/contenido")
    public ResponseEntity<Resource> contenido(Authentication auth, @PathVariable Long solicitudId,
                                              @PathVariable Long fotoId) {
        ArchivoDescarga a = servicio.descargar(idAutenticado(auth), solicitudId, fotoId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.tipoContenido()))
                .body(new ByteArrayResource(a.datos()));
    }

    @DeleteMapping("/{fotoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(Authentication auth, @PathVariable Long solicitudId, @PathVariable Long fotoId) {
        servicio.eliminar(idAutenticado(auth), solicitudId, fotoId);
    }

    private Long idAutenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"))
                .getId();
    }
}
