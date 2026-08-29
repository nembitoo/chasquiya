package cl.chasquiya.maestros.soporte;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
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
    private final SolicitudRepository solicitudes;
    private final FotoTicketRepository fotos;

    public SoporteService(TicketSoporteRepository tickets, UsuarioRepository usuarios,
                          SolicitudRepository solicitudes, FotoTicketRepository fotos) {
        this.tickets = tickets;
        this.usuarios = usuarios;
        this.solicitudes = solicitudes;
        this.fotos = fotos;
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
        Solicitud servicio = servicioPropio(usuarioId, req.solicitudId());
        TicketSoporte t = new TicketSoporte(usuarioId, req.categoria(), req.asunto().trim(),
                req.mensaje().trim(), req.solicitudId());
        tickets.save(t);
        // Sin fotos todavía: se suben después, cuando el reclamo ya existe.
        return TicketResponse.de(t, null, null, servicio, maestroDe(servicio), 0);
    }

    public List<TicketResponse> mios(Long usuarioId) {
        // El autor ya sabe quién es: solo hay que resolver el servicio del que habla.
        return conContexto(tickets.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId), false);
    }

    /**
     * Un reclamo solo puede colgarse de un servicio propio.
     *
     * <p>Sin esto cualquiera podría etiquetar el servicio de otro, y su
     * descripción, su maestro y su fecha aparecerían en la ficha del admin. El
     * campo existía desde V17 y nunca se validó porque la app no lo mandaba.
     */
    private Solicitud servicioPropio(Long usuarioId, Long solicitudId) {
        if (solicitudId == null) {
            return null;
        }
        Solicitud s = solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        // usuarioId primero: el maestro es null mientras la solicitud está abierta.
        if (!usuarioId.equals(s.getClienteId()) && !usuarioId.equals(s.getMaestroId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ese servicio no es tuyo");
        }
        return s;
    }

    // --- Admin ---

    /** Los pendientes primero y, dentro de cada grupo, el más antiguo arriba. */
    public List<TicketResponse> todos() {
        List<TicketSoporte> lista = Stream.of(EstadoTicket.NUEVO, EstadoTicket.EN_REVISION, EstadoTicket.RESUELTO)
                .flatMap(e -> tickets.findByEstadoOrderByFechaCreacionAsc(e).stream())
                .toList();
        return conContexto(lista, true);
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

        return conContexto(List.of(t), true).get(0);
    }

    /**
     * Resuelve de qué servicio habla cada reclamo en dos consultas, no una por
     * ticket. {@code conAutor} separa las dos vistas: el admin necesita saber
     * quién escribió, el propio usuario no.
     */
    private List<TicketResponse> conContexto(List<TicketSoporte> lista, boolean conAutor) {
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, Solicitud> servicios = solicitudes.findAllById(lista.stream()
                        .map(TicketSoporte::getSolicitudId)
                        .filter(Objects::nonNull)
                        .distinct().toList()).stream()
                .collect(Collectors.toMap(Solicitud::getId, Function.identity()));

        Map<Long, Long> fotosPorTicket = new HashMap<>();
        fotos.findByTicketIdIn(lista.stream().map(TicketSoporte::getId).toList())
                .forEach(f -> fotosPorTicket.merge(f.getTicketId(), 1L, Long::sum));

        // Autores y maestros salen del mismo lote: todos son usuarios.
        Stream<Long> autores = conAutor ? lista.stream().map(TicketSoporte::getUsuarioId) : Stream.<Long>empty();
        Map<Long, Usuario> personas = usuarios.findAllById(
                        Stream.concat(autores, servicios.values().stream().map(Solicitud::getMaestroId))
                                .filter(Objects::nonNull)
                                .distinct().toList()).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));

        return lista.stream()
                .map(t -> {
                    // El servicio pudo borrarse: el ticket sobrevive sin él.
                    Solicitud s = t.getSolicitudId() == null ? null : servicios.get(t.getSolicitudId());
                    Usuario autor = conAutor ? personas.get(t.getUsuarioId()) : null;
                    String maestro = s == null || s.getMaestroId() == null
                            ? null
                            : nombreDe(personas.get(s.getMaestroId()));
                    return TicketResponse.de(t,
                            conAutor ? nombreDe(autor) : null,
                            conAutor ? (autor == null ? "—" : autor.getEmail()) : null,
                            s, maestro, fotosPorTicket.getOrDefault(t.getId(), 0L));
                })
                .toList();
    }

    private String nombreDe(Usuario u) {
        return u == null ? "—" : u.getNombre() + " " + u.getApellido();
    }

    /** Para el ticket recién creado, donde el servicio ya viene cargado. */
    private String maestroDe(Solicitud s) {
        if (s == null || s.getMaestroId() == null) {
            return null;
        }
        return usuarios.findById(s.getMaestroId()).map(this::nombreDe).orElse(null);
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
