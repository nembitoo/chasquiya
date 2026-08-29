package cl.chasquiya.maestros.soporte;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.AlmacenamientoMinio;
import cl.chasquiya.maestros.documentos.ArchivoDescarga;

/**
 * Evidencias que se adjuntan a un reclamo.
 *
 * <p>Quién puede qué:
 * <ul>
 *   <li><b>Ver</b>: quien reclama y el admin, que es quien lo resuelve. Nadie
 *       más: un reclamo puede traer una boleta o una conversación privada.</li>
 *   <li><b>Subir y borrar</b>: solo quien reclama, y solo mientras el reclamo
 *       siga abierto. Cambiar las evidencias de un reclamo ya cerrado alteraría
 *       aquello sobre lo que el admin respondió.</li>
 * </ul>
 *
 * <p>Es el mismo esqueleto que {@code FotoSolicitudService}, con los mismos
 * topes, pero las reglas de acceso son distintas y por eso vive aparte: allá el
 * permiso se reparte entre las dos partes de un servicio, acá entre el autor y
 * el admin.
 */
@Service
public class FotoTicketService {

    /** Tope por reclamo: suficiente para probar un problema, y acota el almacenamiento. */
    private static final int MAXIMO_FOTOS = 5;
    private static final long MAXIMO_BYTES = 8L * 1024 * 1024;

    private final FotoTicketRepository fotos;
    private final TicketSoporteRepository tickets;
    private final AlmacenamientoMinio almacen;

    public FotoTicketService(FotoTicketRepository fotos, TicketSoporteRepository tickets,
                             AlmacenamientoMinio almacen) {
        this.fotos = fotos;
        this.tickets = tickets;
        this.almacen = almacen;
    }

    // --- Quien reclama ---

    public List<Long> listar(Long usuarioId, Long ticketId) {
        delAutor(usuarioId, ticketId);
        return ids(ticketId);
    }

    public Long subir(Long usuarioId, Long ticketId, MultipartFile archivo) {
        TicketSoporte t = delAutor(usuarioId, ticketId);
        exigirReclamoAbierto(t);

        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto está vacía");
        }
        if (archivo.getSize() > MAXIMO_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La foto no puede pesar más de 8 MB");
        }
        String tipo = archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream";
        if (!tipo.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se pueden adjuntar imágenes");
        }
        if (fotos.countByTicketId(ticketId) >= MAXIMO_FOTOS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Puedes adjuntar hasta " + MAXIMO_FOTOS + " fotos por reclamo");
        }

        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la foto");
        }
        String objeto = "reclamos/" + ticketId + "/" + UUID.randomUUID();
        almacen.subir(objeto, datos, tipo);

        FotoTicket foto = new FotoTicket(ticketId, objeto, tipo);
        fotos.save(foto);
        return foto.getId();
    }

    public ArchivoDescarga descargar(Long usuarioId, Long ticketId, Long fotoId) {
        delAutor(usuarioId, ticketId);
        return contenido(ticketId, fotoId);
    }

    public void eliminar(Long usuarioId, Long ticketId, Long fotoId) {
        TicketSoporte t = delAutor(usuarioId, ticketId);
        exigirReclamoAbierto(t);
        fotos.delete(buscarFoto(ticketId, fotoId));
    }

    // --- Admin ---

    /** El admin ve las evidencias de cualquier reclamo: es quien tiene que resolverlo. */
    public List<Long> listarComoAdmin(Long ticketId) {
        buscarTicket(ticketId);
        return ids(ticketId);
    }

    public ArchivoDescarga descargarComoAdmin(Long ticketId, Long fotoId) {
        buscarTicket(ticketId);
        return contenido(ticketId, fotoId);
    }

    // --- Interno ---

    private List<Long> ids(Long ticketId) {
        return fotos.findByTicketIdOrderByFechaCreacionAsc(ticketId).stream()
                .map(FotoTicket::getId)
                .toList();
    }

    private ArchivoDescarga contenido(Long ticketId, Long fotoId) {
        FotoTicket foto = buscarFoto(ticketId, fotoId);
        return new ArchivoDescarga(almacen.descargar(foto.getObjeto()), foto.getTipoContenido(), "evidencia");
    }

    private FotoTicket buscarFoto(Long ticketId, Long fotoId) {
        return fotos.findByIdAndTicketId(fotoId, ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada"));
    }

    private TicketSoporte buscarTicket(Long ticketId) {
        return tickets.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamo no encontrado"));
    }

    private TicketSoporte delAutor(Long usuarioId, Long ticketId) {
        TicketSoporte t = buscarTicket(ticketId);
        // usuarioId primero: nunca es null, y así un tercero recibe 403 y no un 500.
        if (!usuarioId.equals(t.getUsuarioId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este reclamo no es tuyo");
        }
        return t;
    }

    private void exigirReclamoAbierto(TicketSoporte t) {
        if (t.getEstado() == EstadoTicket.RESUELTO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este reclamo ya está cerrado: sus fotos no se pueden cambiar");
        }
    }
}
