package cl.chasquiya.maestros.privacidad;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.Calificacion;
import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.direcciones.DireccionRepository;
import cl.chasquiya.maestros.documentos.DocumentoMaestroRepository;
import cl.chasquiya.maestros.favoritos.FavoritoRepository;
import cl.chasquiya.maestros.mensajes.Mensaje;
import cl.chasquiya.maestros.mensajes.MensajeRepository;
import cl.chasquiya.maestros.notificaciones.NotificacionRepository;
import cl.chasquiya.maestros.pagos.PagoRepository;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.FotoSolicitudRepository;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Derechos del titular de datos (Ley 21.719, vigencia plena 1-dic-2026):
 * acceso/portabilidad (exportar) y supresión (eliminar cuenta).
 *
 * La supresión NO borra las filas: anonimiza los datos personales y conserva
 * los registros contables, que la plataforma está obligada a mantener.
 */
@Service
public class PrivacidadService {

    private static final String ANONIMO = "Usuario eliminado";

    private final UsuarioRepository usuarios;
    private final PerfilMaestroRepository perfiles;
    private final SolicitudRepository solicitudes;
    private final MensajeRepository mensajes;
    private final CalificacionRepository calificaciones;
    private final PagoRepository pagos;
    private final FavoritoRepository favoritos;
    private final DireccionRepository direcciones;
    private final DocumentoMaestroRepository documentos;
    private final NotificacionRepository notificaciones;
    private final FotoSolicitudRepository fotos;
    private final PasswordEncoder encoder;

    public PrivacidadService(UsuarioRepository usuarios, PerfilMaestroRepository perfiles,
                             SolicitudRepository solicitudes, MensajeRepository mensajes,
                             CalificacionRepository calificaciones, PagoRepository pagos,
                             FavoritoRepository favoritos, DireccionRepository direcciones,
                             DocumentoMaestroRepository documentos, NotificacionRepository notificaciones,
                             FotoSolicitudRepository fotos, PasswordEncoder encoder) {
        this.fotos = fotos;
        this.usuarios = usuarios;
        this.perfiles = perfiles;
        this.solicitudes = solicitudes;
        this.mensajes = mensajes;
        this.calificaciones = calificaciones;
        this.pagos = pagos;
        this.favoritos = favoritos;
        this.direcciones = direcciones;
        this.documentos = documentos;
        this.notificaciones = notificaciones;
        this.encoder = encoder;
    }

    // ------------------------------------------------------------------
    // Derecho de acceso y portabilidad: "descarga todo lo que tienen de mí"
    // ------------------------------------------------------------------

    public Map<String, Object> exportar(Long usuarioId) {
        Usuario u = buscar(usuarioId);
        List<Solicitud> mias = misSolicitudes(usuarioId);

        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("generadoEl", Instant.now().toString());
        datos.put("aviso", "Copia de todos los datos personales asociados a tu cuenta en ChasquiYa!");

        datos.put("cuenta", Map.of(
                "id", u.getId(),
                "nombre", u.getNombre(),
                "apellido", u.getApellido(),
                "email", u.getEmail(),
                "telefono", u.getTelefono() == null ? "" : u.getTelefono(),
                "rol", u.getRol().name(),
                "aceptoTerminos", u.isAceptoTerminos(),
                "fechaRegistro", u.getFechaCreacion().toString()));

        perfiles.findByUsuarioId(usuarioId).ifPresent(p -> datos.put("perfilProfesional", perfilComoMapa(p)));

        datos.put("direcciones", direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId)
                .stream()
                .map(d -> Map.of("etiqueta", d.getEtiqueta(), "direccion", d.getDireccion(),
                        "comuna", textoODefecto(d.getComuna()), "referencia", textoODefecto(d.getReferencia())))
                .toList());

        datos.put("servicios", mias.stream().map(this::solicitudComoMapa).toList());

        List<Long> idsSolicitudes = mias.stream().map(Solicitud::getId).toList();
        datos.put("mensajes", idsSolicitudes.stream()
                .flatMap(id -> mensajes.findBySolicitudIdOrderByFechaCreacionAsc(id).stream())
                .filter(m -> m.getAutorId().equals(usuarioId))
                .map(m -> Map.of("solicitudId", m.getSolicitudId(), "texto", m.getTexto(),
                        "fecha", m.getFechaCreacion().toString()))
                .toList());

        datos.put("calificacionesQueEscribi", calificaciones.findBySolicitudIdInAndAutorId(idsSolicitudes, usuarioId)
                .stream().map(this::calificacionComoMapa).toList());
        datos.put("calificacionesQueRecibi", calificaciones.findByDestinatarioIdOrderByFechaCreacionDesc(usuarioId)
                .stream().map(this::calificacionComoMapa).toList());

        datos.put("pagos", pagos.findBySolicitudIdIn(idsSolicitudes).stream()
                .map(p -> Map.of("solicitudId", p.getSolicitudId(), "monto", p.getMontoServicio(),
                        "comision", p.getComision(), "montoMaestro", p.getMontoMaestro(),
                        "fecha", p.getFechaCreacion().toString()))
                .toList());

        datos.put("documentosSubidos", documentos.findByUsuarioId(usuarioId).stream()
                .map(d -> Map.of("nombre", d.getNombreArchivo(), "fecha", d.getFechaCreacion().toString()))
                .toList());

        return datos;
    }

    // ------------------------------------------------------------------
    // Derecho de supresión: anonimizar conservando la contabilidad
    // ------------------------------------------------------------------

    @Transactional
    public Map<String, String> eliminarCuenta(Long usuarioId) {
        Usuario u = buscar(usuarioId);
        if (u.estaAnonimizado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta cuenta ya fue eliminada");
        }
        // Si hay servicios en curso, borrar dejaría a la otra parte colgada.
        long activos = misSolicitudes(usuarioId).stream().filter(s -> !esTerminal(s.getEstado())).count();
        if (activos > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tienes " + activos + " servicio(s) en curso. Termínalos o cancélalos antes de eliminar tu cuenta.");
        }

        // 1. Datos que se borran por completo (no tienen valor contable).
        favoritos.deleteAll(favoritos.findByClienteIdOrderByFechaCreacionDesc(usuarioId));
        direcciones.deleteAll(direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId));
        documentos.deleteAll(documentos.findByUsuarioId(usuarioId));
        // Las notificaciones nombran a la otra parte: son datos personales sin valor contable.
        notificaciones.deleteAll(notificaciones.findByUsuarioId(usuarioId));
        // Las fotos muestran la casa del cliente: es de lo más personal que guardamos.
        fotos.deleteAll(fotos.findBySolicitudIdIn(misSolicitudes(usuarioId).stream().map(Solicitud::getId).toList()));

        // 2. Contenido escrito: se vacía, pero la conversación no se rompe.
        List<Long> idsSolicitudes = misSolicitudes(usuarioId).stream().map(Solicitud::getId).toList();
        for (Long solicitudId : idsSolicitudes) {
            for (Mensaje m : mensajes.findBySolicitudIdOrderByFechaCreacionAsc(solicitudId)) {
                if (m.getAutorId().equals(usuarioId)) {
                    m.setTexto("(mensaje eliminado)");
                    mensajes.save(m);
                }
            }
        }
        for (Calificacion c : calificaciones.findBySolicitudIdInAndAutorId(idsSolicitudes, usuarioId)) {
            // La nota numérica se conserva (es reputación de la otra parte);
            // el comentario, que es contenido personal, se borra.
            c.setComentario(null);
            calificaciones.save(c);
        }

        // 3. Perfil profesional: se limpia lo descriptivo y deja de ser visible.
        perfiles.findByUsuarioId(usuarioId).ifPresent(p -> {
            p.setDescripcion(null);
            p.setLatitud(null);
            p.setLongitud(null);
            p.setZonaCobertura(null);
            p.setEstadoVerificacion(EstadoVerificacion.RECHAZADO);
            perfiles.save(p);
        });

        // 4. La cuenta: datos personales fuera, fila conservada para la contabilidad.
        u.setNombre(ANONIMO);
        u.setApellido("");
        u.setEmail("eliminado+" + u.getId() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@chasquiya.cl");
        u.setTelefono(null);
        u.setAvatarObjeto(null);
        u.setActivo(false);
        u.setFechaAnonimizacion(Instant.now());
        // Contraseña imposible de adivinar: la cuenta ya no se puede usar.
        u.setPasswordHash(encoder.encode(UUID.randomUUID().toString()));
        usuarios.save(u);

        return Map.of("mensaje",
                "Tu cuenta fue eliminada. Conservamos solo los registros de pago exigidos por la ley tributaria, sin tus datos personales.");
    }

    // --- Interno ---

    private boolean esTerminal(EstadoServicio e) {
        return e == EstadoServicio.CANCELADO || e == EstadoServicio.CALIFICADO || e == EstadoServicio.PAGADO;
    }

    private List<Solicitud> misSolicitudes(Long usuarioId) {
        List<Solicitud> lista = new ArrayList<>(
                solicitudes.findByClienteIdOrderByFechaCreacionDesc(usuarioId));
        lista.addAll(solicitudes.findByMaestroIdOrderByFechaCreacionDesc(usuarioId));
        return lista;
    }

    private Usuario buscar(Long usuarioId) {
        return usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    private Map<String, Object> perfilComoMapa(PerfilMaestro p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("oficios", p.getOficios().stream().map(Enum::name).toList());
        m.put("descripcion", textoODefecto(p.getDescripcion()));
        m.put("aniosExperiencia", p.getAniosExperiencia());
        m.put("tarifaReferencial", p.getTarifaReferencial() == null ? "" : p.getTarifaReferencial());
        m.put("zonaCobertura", textoODefecto(p.getZonaCobertura()));
        m.put("estadoVerificacion", p.getEstadoVerificacion().name());
        return m;
    }

    private Map<String, Object> solicitudComoMapa(Solicitud s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("oficio", s.getOficio().name());
        m.put("descripcion", s.getDescripcion());
        m.put("direccion", s.getDireccion());
        m.put("estado", s.getEstado().name());
        m.put("fecha", s.getFechaCreacion().toString());
        return m;
    }

    private Map<String, Object> calificacionComoMapa(Calificacion c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("solicitudId", c.getSolicitudId());
        m.put("estrellas", c.getEstrellas());
        m.put("comentario", textoODefecto(c.getComentario()));
        m.put("fecha", c.getFechaCreacion().toString());
        return m;
    }

    private String textoODefecto(String s) {
        return s == null ? "" : s;
    }
}
