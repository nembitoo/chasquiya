package cl.chasquiya.maestros.usuarios;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.AlmacenamientoMinio;

/**
 * Foto de perfil. La imagen se guarda en MinIO (igual que los documentos) y se
 * sirve a través del backend, así el almacenamiento nunca queda expuesto.
 */
@RestController
@RequestMapping("/usuarios")
public class AvatarController {

    private static final long TAMANO_MAXIMO = 3 * 1024 * 1024; // 3 MB

    private final UsuarioRepository usuarios;
    private final AlmacenamientoMinio almacen;

    public AvatarController(UsuarioRepository usuarios, AlmacenamientoMinio almacen) {
        this.usuarios = usuarios;
        this.almacen = almacen;
    }

    @PostMapping("/mi-avatar")
    public Map<String, Boolean> subir(Authentication auth, @RequestParam("archivo") MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen está vacía");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen no puede pesar más de 3 MB");
        }
        String tipo = archivo.getContentType() != null ? archivo.getContentType() : "image/jpeg";
        if (!tipo.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo debe ser una imagen");
        }

        Usuario u = autenticado(auth);
        String objeto = "avatares/" + u.getId() + "/" + UUID.randomUUID();
        try {
            almacen.subir(objeto, archivo.getBytes(), tipo);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la imagen");
        }
        u.setAvatarObjeto(objeto);
        usuarios.save(u);
        return Map.of("tieneAvatar", true);
    }

    /** Devuelve la foto de un usuario. Cualquier usuario autenticado puede verla. */
    @GetMapping("/{usuarioId}/avatar")
    public ResponseEntity<Resource> obtener(@PathVariable Long usuarioId) {
        Usuario u = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (!u.tieneAvatar()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sin foto de perfil");
        }
        byte[] datos = almacen.descargar(u.getAvatarObjeto());
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                // La clave del objeto cambia en cada subida, así que se puede cachear.
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic())
                .body(new ByteArrayResource(datos));
    }

    private Usuario autenticado(Authentication auth) {
        return usuarios.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }
}
