package cl.chasquiya.maestros.documentos;

import java.util.List;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.dto.DocumentoResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Documentos de verificación del maestro autenticado (solo rol MAESTRO). */
@RestController
@RequestMapping("/maestros/mi-perfil/documentos")
public class DocumentoMaestroController {

    private final DocumentoMaestroService servicio;
    private final UsuarioRepository usuarios;

    public DocumentoMaestroController(DocumentoMaestroService servicio, UsuarioRepository usuarios) {
        this.servicio = servicio;
        this.usuarios = usuarios;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentoResponse subir(Authentication auth, @RequestParam("archivo") MultipartFile archivo) {
        return servicio.subir(idAutenticado(auth), archivo);
    }

    @GetMapping
    public List<DocumentoResponse> listar(Authentication auth) {
        return servicio.listar(idAutenticado(auth));
    }

    @GetMapping("/{id}/contenido")
    public ResponseEntity<Resource> contenido(Authentication auth, @PathVariable Long id) {
        ArchivoDescarga a = servicio.descargar(idAutenticado(auth), id);
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
