package cl.chasquiya.maestros.admin;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.admin.dto.MetricasResponse;
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

    public MetricasResponse metricas() {
        List<Usuario> todos = usuarios.findAll();
        List<PerfilMaestro> perfilesMaestro = perfiles.findAll();
        List<Solicitud> servicios = solicitudes.findAll();
        List<Pago> listaPagos = pagos.findAll();
        List<Calificacion> notas = calificaciones.findAll();

        Map<String, Long> porEstado = servicios.stream()
                .collect(Collectors.groupingBy(s -> s.getEstado().name(), HashMap::new, Collectors.counting()));

        double promedio = notas.isEmpty() ? 0
                : Math.round(notas.stream().mapToInt(Calificacion::getEstrellas).average().orElse(0) * 10.0) / 10.0;

        return new MetricasResponse(
                todos.size(),
                contarPorRol(todos, RolUsuario.CLIENTE),
                contarPorRol(todos, RolUsuario.MAESTRO),
                perfilesMaestro.stream().filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO).count(),
                perfilesMaestro.stream().filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.PENDIENTE).count(),
                servicios.size(),
                servicios.stream().filter(s -> esTerminado(s.getEstado())).count(),
                servicios.stream().filter(s -> s.getEstado() == EstadoServicio.EN_DISPUTA).count(),
                listaPagos.stream().mapToLong(Pago::getMontoServicio).sum(),
                listaPagos.stream().mapToLong(Pago::getComision).sum(),
                promedio,
                porEstado);
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
