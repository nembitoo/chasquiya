package cl.chasquiya.maestros.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.ToLongFunction;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.admin.dto.Alerta;
import cl.chasquiya.maestros.admin.dto.Comparacion;
import cl.chasquiya.maestros.admin.dto.MetricasResponse;
import cl.chasquiya.maestros.admin.dto.PuntoSerie;
import cl.chasquiya.maestros.admin.dto.UsuarioAdminResponse;
import cl.chasquiya.maestros.calificaciones.Calificacion;
import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.pagos.Pago;
import cl.chasquiya.maestros.pagos.PagoRepository;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.RolUsuario;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Datos agregados y gestión para el backoffice.
 * Como el volumen del MVP es pequeño, se calcula en memoria: simple y suficiente.
 * Si algún día la base crece, estas cuentas se mueven a consultas SQL agregadas.
 */
@Service
public class AdminService {

    private static final ZoneId ZONA = ZoneId.of("America/Santiago");

    /** Umbrales de las alertas, en días. */
    private static final int DIAS_VERIFICACION = 3;
    private static final int DIAS_DISPUTA = 5;
    private static final int DIAS_COTIZACION = 7;

    private final UsuarioRepository usuarios;
    private final PerfilMaestroRepository perfiles;
    private final SolicitudRepository solicitudes;
    private final PagoRepository pagos;
    private final CalificacionRepository calificaciones;

    public AdminService(UsuarioRepository usuarios, PerfilMaestroRepository perfiles,
                        SolicitudRepository solicitudes, PagoRepository pagos,
                        CalificacionRepository calificaciones) {
        this.usuarios = usuarios;
        this.perfiles = perfiles;
        this.solicitudes = solicitudes;
        this.pagos = pagos;
        this.calificaciones = calificaciones;
    }

    /**
     * Métricas del dashboard para los últimos {@code dias}, con la comparación
     * contra el período inmediatamente anterior del mismo largo.
     */
    public MetricasResponse metricas(int dias) {
        int periodo = Math.max(1, Math.min(dias, 365));
        Instant ahora = Instant.now();
        Instant desde = ahora.minus(periodo, ChronoUnit.DAYS);
        Instant desdeAnterior = desde.minus(periodo, ChronoUnit.DAYS);

        List<Usuario> todos = usuarios.findAll();
        List<PerfilMaestro> perfilesMaestro = perfiles.findAll();
        List<Solicitud> servicios = solicitudes.findAll();
        List<Pago> listaPagos = pagos.findAll();
        List<Calificacion> notas = calificaciones.findAll();

        // --- Flujo: el período actual contra el anterior ---
        List<Solicitud> creadosAhora = entre(servicios, Solicitud::getFechaCreacion, desde, ahora);
        List<Solicitud> creadosAntes = entre(servicios, Solicitud::getFechaCreacion, desdeAnterior, desde);
        List<Pago> pagosAhora = entre(listaPagos, Pago::getFechaCreacion, desde, ahora);
        List<Pago> pagosAntes = entre(listaPagos, Pago::getFechaCreacion, desdeAnterior, desde);

        // "Completado" se mide por la última vez que el servicio cambió de estado:
        // es lo más cercano a "cuándo se terminó" que tenemos sin una columna nueva.
        List<Solicitud> terminadosAhora = entre(servicios, Solicitud::getFechaActualizacion, desde, ahora)
                .stream().filter(s -> esTerminado(s.getEstado())).toList();
        List<Solicitud> terminadosAntes = entre(servicios, Solicitud::getFechaActualizacion, desdeAnterior, desde)
                .stream().filter(s -> esTerminado(s.getEstado())).toList();

        Map<String, Long> porEstado = servicios.stream()
                .collect(Collectors.groupingBy(s -> s.getEstado().name(), HashMap::new, Collectors.counting()));

        double promedio = notas.isEmpty() ? 0
                : Math.round(notas.stream().mapToInt(Calificacion::getEstrellas).average().orElse(0) * 10.0) / 10.0;

        return new MetricasResponse(
                periodo,
                todos.size(),
                contarPorRol(todos, RolUsuario.CLIENTE),
                contarPorRol(todos, RolUsuario.MAESTRO),
                perfilesMaestro.stream().filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO).count(),
                perfilesMaestro.stream().filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.PENDIENTE).count(),
                servicios.stream().filter(s -> s.getEstado() == EstadoServicio.EN_DISPUTA).count(),
                promedio,
                Comparacion.de(creadosAhora.size(), creadosAntes.size()),
                Comparacion.de(terminadosAhora.size(), terminadosAntes.size()),
                Comparacion.de(sumar(pagosAhora, Pago::getMontoServicio), sumar(pagosAntes, Pago::getMontoServicio)),
                Comparacion.de(sumar(pagosAhora, Pago::getComision), sumar(pagosAntes, Pago::getComision)),
                porEstado,
                serieDiaria(creadosAhora, pagosAhora, periodo),
                alertas(perfilesMaestro, servicios, ahora));
    }

    /** Un punto por día, incluidos los días sin actividad (si no, el gráfico miente). */
    private List<PuntoSerie> serieDiaria(List<Solicitud> creados, List<Pago> pagosDelPeriodo, int dias) {
        Map<LocalDate, Long> serviciosPorDia = creados.stream()
                .collect(Collectors.groupingBy(s -> enSantiago(s.getFechaCreacion()), Collectors.counting()));
        Map<LocalDate, Long> comisionesPorDia = pagosDelPeriodo.stream()
                .collect(Collectors.groupingBy(p -> enSantiago(p.getFechaCreacion()),
                        Collectors.summingLong(Pago::getComision)));

        LocalDate hoy = LocalDate.now(ZONA);
        List<PuntoSerie> salida = new ArrayList<>();
        for (int i = dias - 1; i >= 0; i--) {
            LocalDate dia = hoy.minusDays(i);
            salida.add(new PuntoSerie(dia.toString(),
                    serviciosPorDia.getOrDefault(dia, 0L),
                    comisionesPorDia.getOrDefault(dia, 0L)));
        }
        return salida;
    }

    /**
     * Lo que está esperando una decisión del administrador. Son avisos de gestión
     * de la plataforma, no evaluaciones de conducta de los maestros.
     */
    private List<Alerta> alertas(List<PerfilMaestro> perfilesMaestro, List<Solicitud> servicios, Instant ahora) {
        List<Alerta> salida = new ArrayList<>();

        long pendientesViejos = perfilesMaestro.stream()
                .filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.PENDIENTE)
                .filter(p -> diasDesde(p.getFechaActualizacion(), ahora) >= DIAS_VERIFICACION)
                .count();
        if (pendientesViejos > 0) {
            salida.add(new Alerta("verificacion", "alta",
                    "maestro(s) llevan más de " + DIAS_VERIFICACION + " días esperando verificación",
                    pendientesViejos));
        }

        long disputasViejas = servicios.stream()
                .filter(s -> s.getEstado() == EstadoServicio.EN_DISPUTA)
                .filter(s -> diasDesde(s.getFechaActualizacion(), ahora) >= DIAS_DISPUTA)
                .count();
        if (disputasViejas > 0) {
            salida.add(new Alerta("disputa", "alta",
                    "disputa(s) llevan más de " + DIAS_DISPUTA + " días sin resolver", disputasViejas));
        }

        long cotizacionesFrias = servicios.stream()
                .filter(s -> s.getEstado() == EstadoServicio.COTIZADO)
                .filter(s -> diasDesde(s.getFechaActualizacion(), ahora) >= DIAS_COTIZACION)
                .count();
        if (cotizacionesFrias > 0) {
            salida.add(new Alerta("cotizacion", "media",
                    "cotización(es) llevan más de " + DIAS_COTIZACION + " días sin respuesta del cliente",
                    cotizacionesFrias));
        }
        return salida;
    }

    private <T> List<T> entre(List<T> lista, Function<T, Instant> fecha, Instant desde, Instant hasta) {
        return lista.stream()
                .filter(x -> fecha.apply(x) != null)
                .filter(x -> !fecha.apply(x).isBefore(desde) && fecha.apply(x).isBefore(hasta))
                .toList();
    }

    private <T> long sumar(List<T> lista, ToLongFunction<T> valor) {
        return lista.stream().mapToLong(valor).sum();
    }

    private LocalDate enSantiago(Instant instante) {
        return instante.atZone(ZONA).toLocalDate();
    }

    private long diasDesde(Instant instante, Instant ahora) {
        return instante == null ? 0 : ChronoUnit.DAYS.between(instante, ahora);
    }

    public List<UsuarioAdminResponse> listarUsuarios() {
        List<Solicitud> servicios = solicitudes.findAll();
        return usuarios.findAll().stream()
                .map(u -> new UsuarioAdminResponse(
                        u.getId(), u.getNombre(), u.getApellido(), u.getEmail(), u.getTelefono(),
                        u.getRol(), u.isActivo(), contarServiciosDe(servicios, u), u.getFechaCreacion()))
                .toList();
    }

    /** Todas las solicitudes de la plataforma (para la tabla de servicios). */
    public List<Solicitud> listarServicios() {
        return solicitudes.findAll();
    }

    /** Suspende o reactiva una cuenta. Un admin no puede suspenderse a sí mismo. */
    public UsuarioAdminResponse cambiarActivo(Long adminId, Long usuarioId, boolean activo) {
        if (adminId.equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes suspender tu propia cuenta");
        }
        Usuario u = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        u.setActivo(activo);
        usuarios.save(u);
        return new UsuarioAdminResponse(u.getId(), u.getNombre(), u.getApellido(), u.getEmail(),
                u.getTelefono(), u.getRol(), u.isActivo(),
                contarServiciosDe(solicitudes.findAll(), u), u.getFechaCreacion());
    }

    private long contarPorRol(List<Usuario> todos, RolUsuario rol) {
        return todos.stream().filter(u -> u.getRol() == rol).count();
    }

    /** Servicios en los que participó, según su rol. */
    private long contarServiciosDe(List<Solicitud> servicios, Usuario u) {
        return servicios.stream()
                .filter(s -> u.getRol() == RolUsuario.MAESTRO
                        ? s.getMaestroId().equals(u.getId())
                        : s.getClienteId().equals(u.getId()))
                .count();
    }

    /** Se considera terminado desde que el trabajo se completó. */
    private boolean esTerminado(EstadoServicio estado) {
        return estado == EstadoServicio.COMPLETADO
                || estado == EstadoServicio.PAGADO
                || estado == EstadoServicio.CALIFICADO;
    }
}
