package cl.chasquiya.maestros.solicitudes;

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
 * Fotos del problema que el cliente adjunta a su solicitud.
 *
 * <p>Quién puede qué:
 * <ul>
 *   <li><b>Ver</b>: las dos partes del servicio. El maestro necesita verlas para
 *       cotizar bien.</li>
 *   <li><b>Subir y borrar</b>: solo el cliente, y solo mientras el servicio siga
 *       abierto. Cambiar las fotos de un trabajo ya cerrado alteraría la
 *       evidencia de lo que se acordó.</li>
 * </ul>
 */
@Service
public class FotoSolicitudService {

    /** Tope por solicitud: suficiente para explicar un problema, y acota el almacenamiento. */
    private static final int MAXIMO_FOTOS = 5;
    private static final long MAXIMO_BYTES = 8L * 1024 * 1024;

    private final FotoSolicitudRepository fotos;
    private final SolicitudRepository solicitudes;
    private final AlmacenamientoMinio almacen;

    public FotoSolicitudService(FotoSolicitudRepository fotos, SolicitudRepository solicitudes,
                                AlmacenamientoMinio almacen) {
        this.fotos = fotos;
        this.solicitudes = solicitudes;
        this.almacen = almacen;
    }

    public List<Long> listar(Long usuarioId, Long solicitudId) {
        deParte(usuarioId, solicitudId);
        return fotos.findBySolicitudIdOrderByFechaCreacionAsc(solicitudId).stream()
                .map(FotoSolicitud::getId)
                .toList();
    }

    public Long subir(Long clienteId, Long solicitudId, MultipartFile archivo) {
        Solicitud s = deCliente(clienteId, solicitudId);
        exigirServicioAbierto(s);

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
        if (fotos.countBySolicitudId(solicitudId) >= MAXIMO_FOTOS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Puedes adjuntar hasta " + MAXIMO_FOTOS + " fotos por solicitud");
        }

        byte[] datos;
        try {
            datos = archivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la foto");
        }
        String objeto = "solicitudes/" + solicitudId + "/" + UUID.randomUUID();
        almacen.subir(objeto, datos, tipo);

        FotoSolicitud foto = new FotoSolicitud(solicitudId, objeto, tipo);
        fotos.save(foto);
        return foto.getId();
    }

    public ArchivoDescarga descargar(Long usuarioId, Long solicitudId, Long fotoId) {
        deParte(usuarioId, solicitudId);
        FotoSolicitud foto = fotos.findByIdAndSolicitudId(fotoId, solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada"));
        return new ArchivoDescarga(almacen.descargar(foto.getObjeto()), foto.getTipoContenido(), "foto");
    }

    public void eliminar(Long clienteId, Long solicitudId, Long fotoId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        exigirServicioAbierto(s);
        FotoSolicitud foto = fotos.findByIdAndSolicitudId(fotoId, solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto no encontrada"));
        fotos.delete(foto);
    }

    private void exigirServicioAbierto(Solicitud s) {
        if (s.getEstado() == EstadoServicio.CANCELADO
                || s.getEstado() == EstadoServicio.PAGADO
                || s.getEstado() == EstadoServicio.CALIFICADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este servicio ya está cerrado: sus fotos no se pueden cambiar");
        }
    }

    private Solicitud buscar(Long solicitudId) {
        return solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    private Solicitud deCliente(Long clienteId, Long solicitudId) {
        Solicitud s = buscar(solicitudId);
        if (!s.getClienteId().equals(clienteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }

    private Solicitud deParte(Long usuarioId, Long solicitudId) {
        Solicitud s = buscar(solicitudId);
        if (!s.getClienteId().equals(usuarioId) && !s.getMaestroId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }
}
