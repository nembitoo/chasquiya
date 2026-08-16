package cl.chasquiya.maestros.solicitudes;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.notificaciones.NotificacionService;
import cl.chasquiya.maestros.notificaciones.TipoNotificacion;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.dto.AjustarPrecioRequest;
import cl.chasquiya.maestros.solicitudes.dto.CotizacionResponse;
import cl.chasquiya.maestros.solicitudes.dto.CotizarRequest;
import cl.chasquiya.maestros.solicitudes.dto.CrearSolicitudRequest;
import cl.chasquiya.maestros.solicitudes.dto.PublicarSolicitudRequest;
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
    private final DescubrimientoService descubrimiento;

    /** Radio para ofrecer trabajos abiertos a un maestro. */
    private static final double RADIO_ABIERTAS_M = 25_000;

    public SolicitudService(SolicitudRepository solicitudes, CotizacionRepository cotizaciones,
                            PerfilMaestroRepository perfiles, UsuarioRepository usuarios,
                            CalificacionRepository calificaciones, NotificacionService notificaciones,
                            FotoSolicitudRepository fotos, DescubrimientoService descubrimiento) {
        this.fotos = fotos;
        this.descubrimiento = descubrimiento;
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

    /**
     * Publica un trabajo sin elegir maestro: lo verán los maestros del oficio
     * que estén cerca y podrán cotizarlo.
     */
    public SolicitudResponse publicarAbierta(Long clienteId, PublicarSolicitudRequest req) {
        Solicitud s = new Solicitud(clienteId, req.oficio(), req.descripcion().trim(),
                req.direccion().trim(), req.fechaPreferida(), req.presupuestoEstimado(),
                req.latitud(), req.longitud());
        solicitudes.save(s);
        // No se avisa a nadie en particular: la solicitud aparece en la lista de
        // trabajos disponibles de cada maestro. Empujarla uno por uno seria
        // presionar a responder, que es justo lo que no queremos (Ley 21.431).
        return aResponse(s, clienteId);
    }

    /**
     * El cliente elige una de las cotizaciones recibidas. Ahí la solicitud deja
     * de estar abierta: ese maestro pasa a ser el del servicio.
     */
    public SolicitudResponse aceptarCotizacion(Long clienteId, Long solicitudId, Long cotizacionId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        Cotizacion elegida = cotizaciones.findById(cotizacionId)
                .filter(c -> c.getSolicitudId().equals(solicitudId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cotización no encontrada"));

        if (!s.estaAbierta() && !s.getMaestroId().equals(elegida.getMaestroId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este servicio ya tiene un maestro asignado");
        }
        s.setMaestroId(elegida.getMaestroId());

        /*
         * Una solicitud abierta se queda en SOLICITADO mientras junta ofertas, y
         * la máquina de estados no permite saltar de ahí a ACEPTADO. Hace bien:
         * aceptar sin un precio acordado no debería existir.
         *
         * Elegir una cotización es, justamente, quedar cotizado y luego aceptar.
         * Así el flujo abierto pasa por los mismos estados que el directo, en vez
         * de abrir un atajo en la regla más crítica del sistema.
         */
        if (s.getEstado() == EstadoServicio.SOLICITADO) {
            transicionar(s, EstadoServicio.COTIZADO, clienteId);
        }
        SolicitudResponse r = transicionar(s, EstadoServicio.ACEPTADO, clienteId);

        notificaciones.avisar(elegida.getMaestroId(), TipoNotificacion.COTIZACION_ACEPTADA,
                s.getId(), nombreDe(clienteId));
        // A los demás se les avisa que no siguieron. Enterarse es mejor que
        // quedar esperando, y el aviso no juzga su trabajo.
        for (Cotizacion otra : cotizaciones.findBySolicitudIdOrderByMontoAsc(solicitudId)) {
            if (!otra.getId().equals(elegida.getId())) {
                notificaciones.avisar(otra.getMaestroId(), TipoNotificacion.COTIZACION_RECHAZADA,
                        s.getId(), nombreDe(clienteId));
            }
        }
        return r;
    }

    public SolicitudResponse aceptar(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        if (s.estaAbierta()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Esta solicitud está abierta: elige una de las cotizaciones que recibiste");
        }
        SolicitudResponse r = transicionar(s, EstadoServicio.ACEPTADO, clienteId);
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.COTIZACION_ACEPTADA, s.getId(), nombreDe(clienteId));
        return r;
    }

    /** Trabajos abiertos que un maestro puede cotizar. */
    public List<SolicitudResponse> abiertasPara(Long maestroId) {
        PerfilMaestro perfil = perfiles.findByUsuarioId(maestroId)
                .filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Tu perfil tiene que estar aprobado para ver trabajos disponibles"));

        boolean tieneUbicacion = perfil.getLatitud() != null && perfil.getLongitud() != null;
        List<Solicitud> encontradas = new ArrayList<>();
        for (Oficio oficio : perfil.getOficios()) {
            encontradas.addAll(tieneUbicacion
                    ? solicitudes.buscarAbiertasCerca(oficio.name(), perfil.getLatitud(),
                            perfil.getLongitud(), RADIO_ABIERTAS_M, maestroId)
                    : solicitudes.buscarAbiertasPorOficio(oficio.name(), maestroId));
        }
        // Un maestro con varios oficios podría ver la misma solicitud dos veces.
        List<Solicitud> unicas = encontradas.stream()
                .collect(Collectors.toMap(Solicitud::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new))
                .values().stream().toList();
        return aResponses(unicas, maestroId);
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

    /**
     * El maestro ofrece su precio. Sirve para los dos caminos: una solicitud
     * dirigida a él, o una abierta donde compite con otros.
     */
    public SolicitudResponse cotizar(Long maestroId, Long solicitudId, CotizarRequest req) {
        Solicitud s = buscar(solicitudId);

        if (s.estaAbierta()) {
            exigirPuedeCotizarAbierta(maestroId, s);
        } else if (!s.getMaestroId().equals(maestroId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        if (s.getEstado() != EstadoServicio.SOLICITADO && s.getEstado() != EstadoServicio.COTIZADO) {
            throw transicionInvalida(s.getEstado(), EstadoServicio.COTIZADO);
        }

        // Una cotización por maestro: si ya tenía, la corrige.
        Cotizacion c = cotizaciones.findBySolicitudIdAndMaestroId(solicitudId, maestroId)
                .orElseGet(() -> new Cotizacion(solicitudId, maestroId, req.monto(), req.mensaje()));
        c.setMonto(req.monto());
        c.setMensaje(req.mensaje());
        c.setTipo(req.tipoOCerrado());
        // Un precio cerrado no cobra visita: si no puede cambiar, no hay
        // diagnóstico que cobrar aparte.
        c.setCostoVisita(req.tipoOCerrado() == TipoCotizacion.ESTIMADO ? req.costoVisita() : null);
        cotizaciones.save(c);

        /*
         * En una solicitud abierta el estado se queda en SOLICITADO: sigue
         * recibiendo ofertas. Pasarla a COTIZADO con la primera cerraría la
         * competencia y dejaría al cliente sin nada que comparar.
         */
        SolicitudResponse r = s.estaAbierta()
                ? aResponse(s, maestroId)
                : transicionar(s, EstadoServicio.COTIZADO, maestroId);

        notificaciones.avisar(s.getClienteId(), TipoNotificacion.COTIZACION_RECIBIDA, s.getId(), nombreDe(maestroId));
        return r;
    }

    /** Solo un maestro aprobado y del oficio pedido puede ofertar. */
    private void exigirPuedeCotizarAbierta(Long maestroId, Solicitud s) {
        if (s.getClienteId().equals(maestroId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes cotizar tu propia solicitud");
        }
        PerfilMaestro perfil = perfiles.findByUsuarioId(maestroId)
                .filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Tu perfil tiene que estar aprobado para cotizar"));
        if (!perfil.getOficios().contains(s.getOficio())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Esta solicitud es de un oficio que no tienes en tu perfil");
        }
    }

    /** Las cotizaciones que recibió una solicitud, para que el cliente compare. */
    public List<CotizacionResponse> cotizacionesDe(Long clienteId, Long solicitudId) {
        deCliente(clienteId, solicitudId);
        List<Cotizacion> lista = cotizaciones.findBySolicitudIdOrderByMontoAsc(solicitudId);
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, Double> sinDistancia = Map.of();
        Map<Long, MaestroCercanoResponse> fichas = descubrimiento
                .fichasDe(lista.stream().map(Cotizacion::getMaestroId).distinct().toList(), clienteId, sinDistancia)
                .stream()
                .collect(Collectors.toMap(MaestroCercanoResponse::usuarioId, Function.identity()));

        return lista.stream()
                .map(c -> CotizacionResponse.de(c, fichas.get(c.getMaestroId())))
                .toList();
    }

    /**
     * El maestro fue al lugar y el trabajo resultó ser otro: propone un precio
     * distinto. El trabajo queda detenido hasta que el cliente decida.
     *
     * <p>Solo aplica a cotizaciones ESTIMADAS: quien ofreció precio cerrado se
     * comprometió a ese monto y no puede cambiarlo después.
     */
    public SolicitudResponse proponerAjuste(Long maestroId, Long solicitudId, AjustarPrecioRequest req) {
        Solicitud s = deMaestro(maestroId, solicitudId);
        Cotizacion c = cotizaciones.findBySolicitudIdAndMaestroId(solicitudId, maestroId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Este servicio no tiene una cotización tuya"));

        if (c.getTipo() != TipoCotizacion.ESTIMADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ofreciste un precio cerrado: ese monto no se puede cambiar");
        }
        s.setMontoAjustado(req.monto());
        s.setMensajeAjuste(req.motivo().trim());
        SolicitudResponse r = transicionar(s, EstadoServicio.AJUSTE_PROPUESTO, maestroId);
        notificaciones.avisar(s.getClienteId(), TipoNotificacion.AJUSTE_PROPUESTO, s.getId(), nombreDe(maestroId));
        return r;
    }

    /** El cliente acepta el precio nuevo: pasa a ser el acordado y el trabajo sigue. */
    public SolicitudResponse aprobarAjuste(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        if (s.getEstado() != EstadoServicio.AJUSTE_PROPUESTO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este servicio no tiene un ajuste pendiente");
        }
        Cotizacion c = cotizaciones.findBySolicitudIdAndMaestroId(solicitudId, s.getMaestroId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No hay cotización"));

        // Recién ahora el monto nuevo reemplaza al anterior: con la aprobación.
        c.setMonto(s.getMontoAjustado());
        cotizaciones.save(c);
        s.setMontoAjustado(null);

        SolicitudResponse r = transicionar(s, EstadoServicio.ACEPTADO, clienteId);
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.AJUSTE_APROBADO, s.getId(), nombreDe(clienteId));
        return r;
    }

    /**
     * El cliente no acepta el precio nuevo. El servicio termina aquí.
     *
     * <p>Si la cotización incluía un costo de visita, se cobra <b>solo eso</b>:
     * el cliente lo aceptó al elegir esa cotización y el maestro sí se trasladó.
     * Si no había visita acordada, no se cobra nada: un cargo que nadie aceptó
     * antes no es exigible.
     */
    public SolicitudResponse rechazarAjuste(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        if (s.getEstado() != EstadoServicio.AJUSTE_PROPUESTO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este servicio no tiene un ajuste pendiente");
        }
        int visita = cotizaciones.findBySolicitudIdAndMaestroId(solicitudId, s.getMaestroId())
                .map(Cotizacion::visitaCobrable)
                .orElse(0);
        s.setMontoAjustado(null);

        SolicitudResponse r;
        if (visita > 0) {
            /*
             * La visita SÍ se hizo: el maestro fue y diagnosticó. Se deja el
             * servicio como completado con ese monto para que se cobre por el
             * mismo camino de siempre, en vez de inventar una vía de pago
             * paralela que nadie más entiende.
             */
            s.setMontoVisitaCobrado(visita);
            s.setMotivoCancelacion("No se acordó el precio final. Se cobra solo la visita de diagnóstico.");
            r = transicionar(s, EstadoServicio.COMPLETADO, clienteId);
        } else {
            s.setMotivoCancelacion("El cliente no aceptó el precio final. Sin costo de visita acordado.");
            r = transicionar(s, EstadoServicio.CANCELADO, clienteId);
        }
        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.AJUSTE_RECHAZADO, s.getId(), nombreDe(clienteId));
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

        // Una solicitud abierta tiene VARIAS cotizaciones: se agrupan y luego se
        // elige la del maestro asignado. Antes esto era un mapa 1 a 1 y con dos
        // ofertas habría reventado.
        Map<Long, List<Cotizacion>> cotsPorSolicitud = cotizaciones.findBySolicitudIdIn(ids).stream()
                .collect(Collectors.groupingBy(Cotizacion::getSolicitudId));

        Map<Long, Usuario> personas = usuarios
                .findAllById(lista.stream()
                        .flatMap(s -> Stream.of(s.getClienteId(), s.getMaestroId()))
                        // El maestro es null mientras la solicitud está abierta.
                        .filter(Objects::nonNull)
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
                .map(s -> {
                    List<Cotizacion> suyas = cotsPorSolicitud.getOrDefault(s.getId(), List.of());
                    return construir(s, laDelMaestro(s, suyas), suyas.size(), personas,
                            yaCalificadas.contains(s.getId()), fotosPorSolicitud.getOrDefault(s.getId(), 0));
                })
                .toList();
    }

    private SolicitudResponse aResponse(Solicitud s, Long usuarioActual) {
        List<Long> partes = s.getMaestroId() == null
                ? List.of(s.getClienteId())
                : List.of(s.getClienteId(), s.getMaestroId());
        Map<Long, Usuario> personas = usuarios.findAllById(partes).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));
        boolean yaCalifico = usuarioActual != null
                && calificaciones.existsBySolicitudIdAndAutorId(s.getId(), usuarioActual);

        List<Cotizacion> suyas = cotizaciones.findBySolicitudIdOrderByMontoAsc(s.getId());
        return construir(s, laDelMaestro(s, suyas), suyas.size(), personas, yaCalifico,
                (int) fotos.countBySolicitudId(s.getId()));
    }

    /**
     * La cotización que vale para el servicio: la del maestro asignado. Mientras
     * la solicitud sigue abierta no hay ninguna "acordada", solo candidatas.
     */
    private Optional<Cotizacion> laDelMaestro(Solicitud s, List<Cotizacion> cots) {
        if (s.getMaestroId() == null) {
            return Optional.empty();
        }
        return cots.stream().filter(c -> c.getMaestroId().equals(s.getMaestroId())).findFirst();
    }

    private SolicitudResponse construir(Solicitud s, Optional<Cotizacion> cot, int cantidadCotizaciones,
                                        Map<Long, Usuario> personas, boolean yaCalifique, int cantidadFotos) {
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
                s.estaAbierta(),
                cantidadCotizaciones,
                s.getMontoAjustado(),
                s.getMensajeAjuste(),
                s.getMontoVisitaCobrado(),
                s.getFechaCreacion());
    }

    private boolean tieneAvatar(Usuario u) {
        return u != null && u.tieneAvatar();
    }

    private String nombreDe(Usuario u) {
        return u == null ? "—" : (u.getNombre() + " " + u.getApellido());
    }
}
