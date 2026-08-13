package cl.chasquiya.maestros.documentos;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.dto.DocumentoResponse;

/** Lógica de los documentos de verificación: subir, listar y descargar. */
@Service
public class DocumentoMaestroService {

    private final DocumentoMaestroRepository repo;
    private final AlmacenamientoMinio almacen;

    public DocumentoMaestroService(DocumentoMaestroRepository repo, AlmacenamientoMinio almacen) {
        this.repo = repo;
        this.almacen = almacen;
    }

    public DocumentoResponse subir(Long usuarioId, MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo está vacío");
        }
        String tipo = archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream";
        // Clave única del objeto en MinIO, agrupada por usuario.
        String objeto = usuarioId + "/" + UUID.randomUUID();

        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer el archivo");
        }
        almacen.subir(objeto, datos, tipo);

        DocumentoMaestro doc = new DocumentoMaestro(usuarioId, nombreSeguro(archivo.getOriginalFilename()), objeto, tipo);
        repo.save(doc);
        return aResponse(doc);
    }

    public List<DocumentoResponse> listar(Long usuarioId) {
        return repo.findByUsuarioId(usuarioId).stream().map(this::aResponse).toList();
    }

    public ArchivoDescarga descargar(Long usuarioId, Long documentoId) {
        DocumentoMaestro doc = repo.findByIdAndUsuarioId(documentoId, usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento no encontrado"));
        return new ArchivoDescarga(almacen.descargar(doc.getObjeto()), doc.getTipoContenido(), doc.getNombreArchivo());
    }

    private String nombreSeguro(String original) {
        if (original == null || original.isBlank()) {
            return "documento";
        }
        return original.length() > 200 ? original.substring(0, 200) : original;
    }

    private DocumentoResponse aResponse(DocumentoMaestro d) {
        return new DocumentoResponse(d.getId(), d.getNombreArchivo(), d.getTipoContenido(), d.getFechaCreacion());
    }
}
