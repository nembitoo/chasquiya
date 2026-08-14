package cl.chasquiya.maestros.calificaciones;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.dto.CalificacionResponse;
import cl.chasquiya.maestros.calificaciones.dto.CalificarRequest;
import cl.chasquiya.maestros.calificaciones.dto.ReputacionResponse;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Calificación mutua al cerrar el servicio.
 *
 * La reputación es INFORMACIÓN PÚBLICA, no un mecanismo de sanción automática:
 * el sistema nunca bloquea ni castiga a un maestro por su nota. Cualquier medida
 * la toma un admin caso a caso (independencia del maestro — Ley 21.431).
 */
@Service
public class CalificacionService {

    private final CalificacionRepository calificaciones;
    private final SolicitudRepository solicitudes;
    private final UsuarioRepository usuarios;

    public CalificacionService(CalificacionRepository calificaciones, SolicitudRepository solicitudes,
                               UsuarioRepository usuarios) {
        this.calificaciones = calificaciones;
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
    }

    public CalificacionResponse calificar(Long autorId, Long solicitudId, CalificarRequest req) {
        Solicitud s = deParte(autorId, solicitudId);

        // Solo se califica un servicio ya pagado.
        if (s.getEstado() != EstadoServicio.PAGADO && s.getEstado() != EstadoServicio.CALIFICADO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Solo puedes calificar un servicio pagado (estado actual: " + s.getEstado() + ")");
        }
        if (calificaciones.existsBySolicitudIdAndAutorId(solicitudId, autorId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya calificaste este servicio");
        }

        boolean autorEsCliente = s.getClienteId().equals(autorId);
        Long destinatarioId = autorEsCliente ? s.getMaestroId() : s.getClienteId();

        Calificacion c = new Calificacion(solicitudId, autorId, destinatarioId, req.estrellas(),
                limpiar(req.comentario()),
                // Los aspectos solo tienen sentido al calificar a un maestro.
                autorEsCliente ? req.puntualidad() : null,
                autorEsCliente ? req.calidad() : null,
                autorEsCliente ? req.trato() : null);
        calificaciones.save(c);

        // Cuando ambas partes calificaron, el servicio queda CALIFICADO (cierre del ciclo).
        if (s.getEstado() == EstadoServicio.PAGADO
                && calificaciones.findBySolicitudId(solicitudId).size() >= 2) {
            s.setEstado(EstadoServicio.CALIFICADO);
            solicitudes.save(s);
        }

        return aResponse(c, nombreDe(autorId));
    }

    /** Reseñas recibidas por un usuario (las que se ven en su perfil). */
    public List<CalificacionResponse> resenasDe(Long usuarioId) {
        List<Calificacion> lista = calificaciones.findByDestinatarioIdOrderByFechaCreacionDesc(usuarioId);
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<Long, String> nombres = nombresDe(lista.stream().map(Calificacion::getAutorId).distinct().toList());
        return lista.stream().map(c -> aResponse(c, nombres.getOrDefault(c.getAutorId(), "—"))).toList();
    }

    public ReputacionResponse reputacionDe(Long usuarioId) {
        return reputacionesDe(List.of(usuarioId)).getOrDefault(usuarioId, ReputacionResponse.vacia());
    }

    /** Reputación de varios usuarios a la vez (para las tarjetas de búsqueda). */
    public Map<Long, ReputacionResponse> reputacionesDe(Collection<Long> usuarioIds) {
        if (usuarioIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, ReputacionResponse> salida = new HashMap<>();
        for (CalificacionRepository.ResumenReputacion r : calificaciones.resumenDe(usuarioIds)) {
            // Una decimal: 4.666 -> 4.7
            double promedio = Math.round(r.getPromedio() * 10.0) / 10.0;
            salida.put(r.getUsuarioId(), new ReputacionResponse(promedio, r.getCantidad()));
        }
        return salida;
    }

    /** Si este usuario todavía debe calificar ese servicio. */
    public boolean puedeCalificar(Long usuarioId, Solicitud s) {
        boolean estadoValido = s.getEstado() == EstadoServicio.PAGADO
                || s.getEstado() == EstadoServicio.CALIFICADO;
        return estadoValido && !calificaciones.existsBySolicitudIdAndAutorId(s.getId(), usuarioId);
    }

    private Solicitud deParte(Long usuarioId, Long solicitudId) {
        Solicitud s = solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!s.getClienteId().equals(usuarioId) && !s.getMaestroId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Este servicio no es tuyo");
        }
        return s;
    }

    private String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    private Map<Long, String> nombresDe(List<Long> ids) {
        return usuarios.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, u -> u.getNombre() + " " + u.getApellido(),
                        (a, b) -> a, HashMap::new));
    }

    private String nombreDe(Long usuarioId) {
        return usuarios.findById(usuarioId).map(u -> u.getNombre() + " " + u.getApellido()).orElse("—");
    }

    private CalificacionResponse aResponse(Calificacion c, String autorNombre) {
        return new CalificacionResponse(c.getId(), c.getSolicitudId(), c.getAutorId(), autorNombre,
                c.getEstrellas(), c.getComentario(), c.getPuntualidad(), c.getCalidad(), c.getTrato(),
                c.getFechaCreacion());
    }
}
