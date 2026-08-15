package cl.chasquiya.maestros.soporte;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.soporte.dto.CrearTicketRequest;
import cl.chasquiya.maestros.soporte.dto.ResponderTicketRequest;
import cl.chasquiya.maestros.soporte.dto.TicketResponse;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Canal de soporte y reclamos.
 *
 * <p>Complementa a las disputas: una disputa es un problema <em>de un servicio</em>
 * y afecta su máquina de estados. Un ticket es cualquier otra cosa (un cobro que
 * no cuadra, un problema de la cuenta, una denuncia) y no toca ningún servicio.
 *
 * <p>Ley 19.496: el reclamo del consumidor tiene que quedar registrado y
 * responderse. Por eso el ticket guarda la respuesta y no se borra.
 */
@Service
public class SoporteService {

    /** Tope defensivo: evita que una sola cuenta llene la bandeja del admin. */
    private static final int MAXIMO_ABIERTOS = 10;

    private final TicketSoporteRepository tickets;
    private final UsuarioRepository usuarios;

    public SoporteService(TicketSoporteRepository tickets, UsuarioRepository usuarios) {
        this.tickets = tickets;
        this.usuarios = usuarios;
    }

    // --- Usuario ---

    public TicketResponse crear(Long usuarioId, CrearTicketRequest req) {
        long abiertos = tickets.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId).stream()
                .filter(t -> t.getEstado() != EstadoTicket.RESUELTO)
                .count();
        if (abiertos >= MAXIMO_ABIERTOS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tienes " + abiertos + " reclamos sin resolver. Espera respuesta antes de abrir otro.");
        }
        TicketSoporte t = new TicketSoporte(usuarioId, req.categoria(), req.asunto().trim(),
                req.mensaje().trim(), req.solicitudId());
        tickets.save(t);
        return TicketResponse.de(t, null, null);
    }

    public List<TicketResponse> mios(Long usuarioId) {
        return tickets.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId).stream()
                .map(t -> TicketResponse.de(t, null, null))
                .toList();
    }

    // --- Admin ---

    /** Los pendientes primero y, dentro de cada grupo, el más antiguo arriba. */
    public List<TicketResponse> todos() {
        List<TicketSoporte> lista = Stream.of(EstadoTicket.NUEVO, EstadoTicket.EN_REVISION, EstadoTicket.RESUELTO)
                .flatMap(e -> tickets.findByEstadoOrderByFechaCreacionAsc(e).stream())
                .toList();
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, Usuario> personas = usuarios
                .findAllById(lista.stream().map(TicketSoporte::getUsuarioId).distinct().toList()).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));

        return lista.stream()
                .map(t -> {
                    Usuario u = personas.get(t.getUsuarioId());
                    return TicketResponse.de(t,
                            u == null ? "—" : u.getNombre() + " " + u.getApellido(),
                            u == null ? "—" : u.getEmail());
                })
                .toList();
    }

    public TicketResponse responder(Long ticketId, ResponderTicketRequest req) {
        TicketSoporte t = tickets.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reclamo no encontrado"));

        if (t.getEstado() != req.estado() && !t.getEstado().puedePasarA(req.estado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede pasar de " + t.getEstado() + " a " + req.estado());
        }
        // Cerrar sin explicar por qué deja al usuario sin respuesta: no se permite.
        if (req.estado() == EstadoTicket.RESUELTO && (req.respuesta() == null || req.respuesta().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Para cerrar un reclamo hay que escribir una respuesta");
        }
        if (req.respuesta() != null && !req.respuesta().isBlank()) {
            t.setRespuesta(req.respuesta().trim());
        }
        t.setEstado(req.estado());
        tickets.save(t);

        Usuario u = usuarios.findById(t.getUsuarioId()).orElse(null);
        return TicketResponse.de(t,
                u == null ? "—" : u.getNombre() + " " + u.getApellido(),
                u == null ? "—" : u.getEmail());
    }

    /** Reclamos sin resolver, para la alerta del dashboard. */
    public long pendientes() {
        return tickets.countByEstado(EstadoTicket.NUEVO) + tickets.countByEstado(EstadoTicket.EN_REVISION);
    }

    /** El más antiguo sin resolver, en días. 0 si no hay ninguno. */
    public long diasDelMasViejoPendiente() {
        return tickets.findByEstadoOrderByFechaCreacionAsc(EstadoTicket.NUEVO).stream()
                .map(TicketSoporte::getFechaCreacion)
                .min(Comparator.naturalOrder())
                .map(f -> java.time.temporal.ChronoUnit.DAYS.between(f, java.time.Instant.now()))
                .orElse(0L);
    }
}
