package cl.chasquiya.maestros.mensajes;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.mensajes.dto.MensajeResponse;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Chat de una solicitud. El mensaje se guarda por REST (validado aquí) y
 * se difunde por WebSocket a quien esté escuchando esa conversación.
 */
@Service
public class MensajeService {

    private final MensajeRepository mensajes;
    private final SolicitudRepository solicitudes;
    private final UsuarioRepository usuarios;
    private final SimpMessagingTemplate difusor;

    public MensajeService(MensajeRepository mensajes, SolicitudRepository solicitudes,
                          UsuarioRepository usuarios, SimpMessagingTemplate difusor) {
        this.mensajes = mensajes;
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.difusor = difusor;
    }

    public MensajeResponse enviar(Long usuarioId, Long solicitudId, String texto) {
        Solicitud s = deParte(usuarioId, solicitudId);
        Mensaje m = new Mensaje(s.getId(), usuarioId, texto.trim());
        mensajes.save(m);

        MensajeResponse resp = aResponse(m, nombreDe(usuarioId));
        // Entrega instantánea a quien tenga el chat abierto.
        difusor.convertAndSend("/topic/solicitudes/" + solicitudId, resp);
        return resp;
    }

    public List<MensajeResponse> listar(Long usuarioId, Long solicitudId) {
        deParte(usuarioId, solicitudId);
        List<Mensaje> lista = mensajes.findBySolicitudIdOrderByFechaCreacionAsc(solicitudId);
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, String> nombres = nombresDe(lista.stream().map(Mensaje::getAutorId).distinct().toList());
        return lista.stream().map(m -> aResponse(m, nombres.getOrDefault(m.getAutorId(), "—"))).toList();
    }

    /** Marca como leídos los mensajes que este usuario recibió en la conversación. */
    public void marcarLeidos(Long usuarioId, Long solicitudId) {
        deParte(usuarioId, solicitudId);
        mensajes.marcarLeidos(solicitudId, usuarioId);
    }

    /** Cuántos mensajes sin leer tiene el usuario en cada solicitud suya. */
    public Map<Long, Long> noLeidosPorSolicitud(Long usuarioId) {
        List<Long> ids = solicitudes.findByClienteIdOrderByFechaCreacionDesc(usuarioId).stream()
                .map(Solicitud::getId)
                .collect(Collectors.toCollection(ArrayList::new));
        solicitudes.findByMaestroIdOrderByFechaCreacionDesc(usuarioId).forEach(s -> ids.add(s.getId()));
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> salida = new HashMap<>();
        for (MensajeRepository.NoLeidosPorSolicitud fila : mensajes.contarNoLeidos(usuarioId, ids)) {
            salida.put(fila.getSolicitudId(), fila.getCantidad());
        }
        return salida;
    }

    /** Solo el cliente o el maestro de la solicitud pueden ver/escribir en su chat. */
    private Solicitud deParte(Long usuarioId, Long solicitudId) {
        Solicitud s = solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!s.getClienteId().equals(usuarioId) && !s.getMaestroId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este chat no es tuyo");
        }
        return s;
    }

    private Map<Long, String> nombresDe(List<Long> ids) {
        return usuarios.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombre() + " " + u.getApellido(),
                        (a, b) -> a, HashMap::new));
    }

    private String nombreDe(Long usuarioId) {
        return usuarios.findById(usuarioId).map(u -> u.getNombre() + " " + u.getApellido()).orElse("—");
    }

    private MensajeResponse aResponse(Mensaje m, String autorNombre) {
        return new MensajeResponse(m.getId(), m.getSolicitudId(), m.getAutorId(), autorNombre,
                m.getTexto(), m.isLeido(), m.getFechaCreacion());
    }
}
