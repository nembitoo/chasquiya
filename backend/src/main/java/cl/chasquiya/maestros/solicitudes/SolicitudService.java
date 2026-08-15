package cl.chasquiya.maestros.solicitudes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.Calificacion;
import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.notificaciones.NotificacionService;
import cl.chasquiya.maestros.notificaciones.TipoNotificacion;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.dto.CotizarRequest;
import cl.chasquiya.maestros.solicitudes.dto.CrearSolicitudRequest;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Lógica de la transacción: crear solicitud, cotizar, aceptar y avanzar estados.
 * Cada acción valida DOS cosas: que el usuario tenga derecho a hacerla,
 * y que la transición de estado sea válida (ver {@link EstadoServicio}).
 */
@Service
public class SolicitudService {

    private final SolicitudRepository solicitudes;
    private final CotizacionRepository cotizaciones;
    private final PerfilMaestroRepository perfiles;
    private final UsuarioRepository usuarios;
    private final CalificacionRepository calificaciones;
    private final NotificacionService notificaciones;
    private final FotoSolicitudRepository fotos;

    public SolicitudService(SolicitudRepository solicitudes, CotizacionRepository cotizaciones,
                            PerfilMaestroRepository perfiles, UsuarioRepository usuarios,
                            CalificacionRepository calificaciones, NotificacionService notificaciones,
                            FotoSolicitudRepository fotos) {
        this.fotos = fotos;
        this.solicitudes = solicitudes;
        this.cotizaciones = cotizaciones;
        this.perfiles = perfiles;
        this.usuarios = usuarios;
        this.calificaciones = calificaciones;
        this.notificaciones = notificaciones;
    }

    // --- Acciones del cliente ---

    public SolicitudResponse crear(Long clienteId, CrearSolicitudRequest req) {
        if (clienteId.equals(req.maestroId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes solicitarte un servicio a ti mismo");
        }
        // Solo se puede solicitar a un maestro aprobado (regla del Hito 2).
        perfiles.findByUsuarioId(req.maestroId())
                .filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));

        Solicitud s = new Solicitud(clienteId, req.maestroId(), req.oficio(), req.descripcion().trim(),
                req.direccion().trim(), req.fechaPreferida(), req.presupuestoEstimado());
        solicitudes.save(s);
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.SOLICITUD_NUEVA, s.getId(), nombreDe(clienteId));
        return aResponse(s, clienteId);
    }

    public SolicitudResponse aceptar(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        SolicitudResponse r = transicionar(s, EstadoServicio.ACEPTADO, clienteId);
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.COTIZACION_ACEPTADA, s.getId(), nombreDe(clienteId));
        return r;
    }

    /** El cliente rechaza la cotización: la solicitud queda cancelada. */
    public SolicitudResponse rechazarCotizacion(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        if (s.getEstado() != EstadoServicio.COTIZADO) {
            throw transicionInvalida(s.getEstado(), EstadoServicio.CANCELADO);
        }
        s.setMotivoCancelacion("Cotización rechazada por el cliente");
        SolicitudResponse r = transicionar(s, EstadoServicio.CANCELADO, clienteId);
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.COTIZACION_RECHAZADA, s.getId(), nombreDe(clienteId));
        return r;
    }

    // --- Acciones del maestro ---

    public SolicitudResponse cotizar(Long maestroId, Long solicitudId, CotizarRequest req) {
        Solicitud s = deMaestro(maestroId, solicitudId);
        if (s.getEstado() != EstadoServicio.SOLICITADO) {
            throw transicionInvalida(s.getEstado(), EstadoServicio.COTIZADO);
        }
        Cotizacion c = cotizaciones.findBySolicitudId(solicitudId)
                .orElseGet(() -> new Cotizacion(solicitudId, req.monto(), req.mensaje()));
        c.setMonto(req.monto());
        c.setMensaje(req.mensaje());
        cotizaciones.save(c);
        SolicitudResponse r = transicionar(s, EstadoServicio.COTIZADO, maestroId);
        notificaciones.avisar(s.getClienteId(), TipoNotificacion.COTIZACION_RECIBIDA, s.getId(), nombreDe(maestroId));
        return r;
    }

    public SolicitudResponse iniciar(Long maestroId, Long solicitudId) {
        Solicitud s = deMaestro(maestroId, solicitudId);
        SolicitudResponse r = transicionar(s, EstadoServicio.EN_CURSO, maestroId);
        notificaciones.avisar(s.getClienteId(), TipoNotificacion.TRABAJO_INICIADO, s.getId(), nombreDe(maestroId));
        return r;
    }

    public SolicitudResponse completar(Long maestroId, Long solicitudId) {
        Solicitud s = deMaestro(maestroId, solicitudId);
        SolicitudResponse r = transicionar(s, EstadoServicio.COMPLETADO, maestroId);
        notificaciones.avisar(s.getClienteId(), TipoNotificacion.TRABAJO_COMPLETADO, s.getId(), nombreDe(maestroId));
        return r;
    }

    // --- Acciones de ambas partes ---

    /**
     * Cancelar antes de que el trabajo empiece. Tanto el cliente como el maestro pueden:
     * el maestro es independiente y rechazar/cancelar no se penaliza (Ley 21.431).
     */
    public SolicitudResponse cancelar(Long usuarioId, Long solicitudId, String motivo) {
        Solicitud s = deParte(usuarioId, solicitudId);
        s.setMotivoCancelacion(motivo != null && !motivo.isBlank() ? motivo.trim() : "Cancelado por una de las partes");
        SolicitudResponse r = transicionar(s, EstadoServicio.CANCELADO, usuarioId);
        Long otraParte = s.getClienteId().equals(usuarioId) ? s.getMaestroId() : s.getClienteId();
        notificaciones.avisar(otraParte, TipoNotificacion.SERVICIO_CANCELADO, s.getId(), nombreDe(usuarioId));
        return r;
    }

    public SolicitudResponse abrirDisputa(Long usuarioId, Long solicitudId, String motivo) {
        Solicitud s = deParte(usuarioId, solicitudId);
        s.setMotivoCancelacion(motivo != null && !motivo.isBlank() ? motivo.trim() : "Disputa abierta");
        return transicionar(s, EstadoServicio.EN_DISPUTA, usuarioId);
    }

    // --- Mediación del admin (Hito 7) ---

    /** Todas las transacciones de la plataforma (tabla del backoffice). */
    public List<SolicitudResponse> todosLosServicios() {
        return aResponses(solicitudes.findAll(), null);
    }

    /** Solicitudes con disputa abierta, para el panel del admin. */
    public List<SolicitudResponse> disputasAbiertas() {
        return aResponses(solicitudes.findByEstadoOrderByFechaActualizacionDesc(EstadoServicio.EN_DISPUTA), null);
    }

    /**
     * El admin cierra una disputa.
     * A favor del cliente -> el servicio se anula (CANCELADO).
     * A favor del maestro -> el servicio se da por bueno (vuelve a COMPLETADO).
     * Nota: con pago simulado no hay devolución de dinero; eso llega con la pasarela real.
     */
    public SolicitudResponse resolverDisputa(Long solicitudId, boolean aFavorDelCliente, String resolucion) {
        Solicitud s = buscar(solicitudId);
        if (s.getEstado() != EstadoServicio.EN_DISPUTA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta solicitud no tiene una disputa abierta");
        }
        s.setResolucionDisputa(resolucion != null && !resolucion.isBlank()
                ? resolucion.trim()
                : (aFavorDelCliente ? "Resuelta a favor del cliente" : "Resuelta a favor del maestro"));
        return transicionar(s, aFavorDelCliente ? EstadoServicio.CANCELADO : EstadoServicio.COMPLETADO, null);
    }

    // --- Consultas ---

    public List<SolicitudResponse> misSolicitudesComoCliente(Long clienteId) {
        return aResponses(solicitudes.findByClienteIdOrderByFechaCreacionDesc(clienteId), clienteId);
    }

    public List<SolicitudResponse> misSolicitudesComoMaestro(Long maestroId) {
        return aResponses(solicitudes.findByMaestroIdOrderByFechaCreacionDesc(maestroId), maestroId);
    }

    public SolicitudResponse obtener(Long usuarioId, Long solicitudId) {
        return aResponse(deParte(usuarioId, solicitudId), usuarioId);
    }

    // --- Interno ---

    /** Aplica la transición si la máquina de estados la permite; si no, 409. */
    private SolicitudResponse transicionar(Solicitud s, EstadoServicio destino, Long usuarioActual) {
        if (!s.getEstado().puedePasarA(destino)) {
            throw transicionInvalida(s.getEstado(), destino);
        }
        s.setEstado(destino);
        solicitudes.save(s);
        return aResponse(s, usuarioActual);
    }

    private ResponseStatusException transicionInvalida(EstadoServicio actual, EstadoServicio destino) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "No se puede pasar de " + actual + " a " + destino);
    }

    private Solicitud buscar(Long solicitudId) {
        return solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    /** Nombre para el texto de la notificación. Solo el nombre de pila: basta y expone menos. */
    private String nombreDe(Long usuarioId) {
        return usuarios.findById(usuarioId).map(Usuario::getNombre).orElse("La otra parte");
    }

    private Solicitud deCliente(Long clienteId, Long solicitudId) {
        Solicitud s = buscar(solicitudId);
        if (!s.getClienteId().equals(clienteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }

    private Solicitud deMaestro(Long maestroId, Long solicitudId) {
        Solicitud s = buscar(solicitudId);
        if (!s.getMaestroId().equals(maestroId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }

    /** El usuario debe ser el cliente o el maestro de la solicitud. */
    private Solicitud deParte(Long usuarioId, Long solicitudId) {
        Solicitud s = buscar(solicitudId);
        if (!s.getClienteId().equals(usuarioId) && !s.getMaestroId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }

    /**
     * @param usuarioActual quién está consultando (para saber si ya calificó);
     *                      null cuando consulta un admin.
     */
    private List<SolicitudResponse> aResponses(List<Solicitud> lista, Long usuarioActual) {
        if (lista.isEmpty()) {
            return List.of();
        }
        List<Long> ids = lista.stream().map(Solicitud::getId).toList();
        Map<Long, Cotizacion> cotPorSolicitud = cotizaciones.findBySolicitudIdIn(ids).stream()
                .collect(Collectors.toMap(Cotizacion::getSolicitudId, Function.identity()));
        Map<Long, Usuario> personas = usuarios
                .findAllById(lista.stream()
                        .flatMap(s -> Stream.of(s.getClienteId(), s.getMaestroId()))
                        .distinct().toList()).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));
        Set<Long> yaCalificadas = usuarioActual == null
                ? Set.of()
                : calificaciones.findBySolicitudIdInAndAutorId(ids, usuarioActual).stream()
                        .map(Calificacion::getSolicitudId)
                        .collect(Collectors.toSet());

        Map<Long, Integer> fotosPorSolicitud = new HashMap<>();
        fotos.findBySolicitudIdIn(ids).forEach(f -> fotosPorSolicitud.merge(f.getSolicitudId(), 1, Integer::sum));

        return lista.stream()
                .map(s -> construir(s, Optional.ofNullable(cotPorSolicitud.get(s.getId())), personas,
                        yaCalificadas.contains(s.getId()), fotosPorSolicitud.getOrDefault(s.getId(), 0)))
                .toList();
    }

    private SolicitudResponse aResponse(Solicitud s, Long usuarioActual) {
        Map<Long, Usuario> personas = usuarios.findAllById(List.of(s.getClienteId(), s.getMaestroId())).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));
        boolean yaCalifico = usuarioActual != null
                && calificaciones.existsBySolicitudIdAndAutorId(s.getId(), usuarioActual);
        return construir(s, cotizaciones.findBySolicitudId(s.getId()), personas, yaCalifico,
                (int) fotos.countBySolicitudId(s.getId()));
    }

    private SolicitudResponse construir(Solicitud s, Optional<Cotizacion> cot, Map<Long, Usuario> personas,
                                        boolean yaCalifique, int cantidadFotos) {
        return new SolicitudResponse(
                s.getId(),
                s.getClienteId(), nombreDe(personas.get(s.getClienteId())), tieneAvatar(personas.get(s.getClienteId())),
                s.getMaestroId(), nombreDe(personas.get(s.getMaestroId())), tieneAvatar(personas.get(s.getMaestroId())),
                s.getOficio(), s.getDescripcion(), s.getDireccion(), s.getFechaPreferida(),
                s.getPresupuestoEstimado(), s.getEstado(), s.getMotivoCancelacion(), s.getResolucionDisputa(),
                cot.map(Cotizacion::getMonto).orElse(null),
                cot.map(Cotizacion::getMensaje).orElse(null),
                yaCalifique,
                cantidadFotos,
                s.getFechaCreacion());
    }

    private boolean tieneAvatar(Usuario u) {
        return u != null && u.tieneAvatar();
    }

    private String nombreDe(Usuario u) {
        return u == null ? "—" : (u.getNombre() + " " + u.getApellido());
    }
}
