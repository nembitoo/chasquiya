package cl.chasquiya.maestros.notificaciones;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.notificaciones.dto.BandejaResponse;
import cl.chasquiya.maestros.notificaciones.dto.NotificacionResponse;

/**
 * Centro de notificaciones in-app: historial de avisos que la app lee al abrirse.
 * Reemplaza al push mientras no exista un development build.
 *
 * <p>Dos reglas de diseño que importan:
 * <ul>
 *   <li><b>Avisar nunca puede tumbar la acción principal.</b> Si falla el guardado
 *       del aviso se registra en el log y se sigue: que no se guarde una
 *       notificación jamás debe impedir que un pago quede registrado.</li>
 *   <li><b>El texto no presiona</b> (Ley 21.431). Informa que algo pasó; no exige
 *       responder en un plazo ni insinúa consecuencias por no hacerlo.</li>
 * </ul>
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    /** Tope del historial que devolvemos a la app. */
    private static final Limit MAXIMO = Limit.of(50);

    private final NotificacionRepository notificaciones;

    public NotificacionService(NotificacionRepository notificaciones) {
        this.notificaciones = notificaciones;
    }

    // ------------------------------------------------------------------
    // Escritura: la usan los demás servicios cuando ocurre algo
    // ------------------------------------------------------------------

    /**
     * Crea un aviso. Nunca lanza: si algo falla, lo deja en el log.
     *
     * @param detalle dato que completa el texto. Según el tipo es el nombre de la
     *                otra parte o un monto ya formateado (ver {@link #cuerpo}).
     */
    public void avisar(Long usuarioId, TipoNotificacion tipo, Long solicitudId, String detalle) {
        if (usuarioId == null) {
            return;
        }
        try {
            notificaciones.save(new Notificacion(usuarioId, tipo, titulo(tipo), cuerpo(tipo, detalle), solicitudId));
        } catch (Exception e) {
            log.warn("No se pudo crear la notificacion {} para el usuario {}: {}", tipo, usuarioId, e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Lectura: la campanita y su pantalla
    // ------------------------------------------------------------------

    public BandejaResponse bandeja(Long usuarioId) {
        List<NotificacionResponse> lista = notificaciones
                .findByUsuarioIdOrderByFechaCreacionDesc(usuarioId, MAXIMO)
                .stream()
                .map(NotificacionResponse::de)
                .toList();
        return new BandejaResponse(lista, notificaciones.countByUsuarioIdAndLeidaFalse(usuarioId));
    }

    public void marcarLeida(Long usuarioId, Long notificacionId) {
        Notificacion n = notificaciones.findById(notificacionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificación no encontrada"));
        if (!n.getUsuarioId().equals(usuarioId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta notificación no es tuya");
        }
        if (!n.isLeida()) {
            n.marcarLeida();
            notificaciones.save(n);
        }
    }

    /** Devuelve cuántas se marcaron, para que la app no tenga que recontar. */
    public int marcarTodasLeidas(Long usuarioId) {
        List<Notificacion> pendientes = notificaciones.findByUsuarioIdAndLeidaFalse(usuarioId);
        pendientes.forEach(Notificacion::marcarLeida);
        notificaciones.saveAll(pendientes);
        return pendientes.size();
    }

    // ------------------------------------------------------------------
    // Textos (todos en un solo lugar, para poder revisarlos de una pasada)
    // ------------------------------------------------------------------

    private String titulo(TipoNotificacion tipo) {
        return switch (tipo) {
            case SOLICITUD_NUEVA -> "Nueva solicitud";
            case COTIZACION_RECIBIDA -> "Recibiste una cotización";
            case COTIZACION_ACEPTADA -> "Aceptaron tu cotización";
            case COTIZACION_RECHAZADA -> "No siguieron con tu cotización";
            case AJUSTE_PROPUESTO -> "Cambió el precio del trabajo";
            case AJUSTE_APROBADO -> "Aceptaron el precio nuevo";
            case AJUSTE_RECHAZADO -> "No aceptaron el precio nuevo";
            case TRABAJO_INICIADO -> "El trabajo comenzó";
            case TRABAJO_COMPLETADO -> "Trabajo terminado";
            case PAGO_RECIBIDO -> "Recibiste un pago";
            case CALIFICACION_RECIBIDA -> "Te calificaron";
            case SERVICIO_CANCELADO -> "Servicio cancelado";
            case VERIFICACION_APROBADA -> "Tu perfil fue aprobado";
            case VERIFICACION_RECHAZADA -> "Tu perfil necesita cambios";
            case RECLAMO_RESPONDIDO -> "Soporte respondió tu reclamo";
        };
    }

    private String cuerpo(TipoNotificacion tipo, String detalle) {
        String quien = (detalle == null || detalle.isBlank()) ? "La otra parte" : detalle;
        return switch (tipo) {
            case SOLICITUD_NUEVA ->
                    quien + " te envió una solicitud de servicio. Puedes revisarla y cotizar si te interesa.";
            case COTIZACION_RECIBIDA ->
                    quien + " respondió con un precio para tu solicitud. Revísala cuando puedas.";
            case COTIZACION_ACEPTADA ->
                    quien + " aceptó tu cotización. Pueden coordinar los detalles por el chat.";
            case COTIZACION_RECHAZADA ->
                    quien + " decidió no seguir con esta cotización.";
            case AJUSTE_PROPUESTO ->
                    quien + " revisó el trabajo y propone otro precio. Nada avanza hasta que lo revises.";
            case AJUSTE_APROBADO ->
                    quien + " aceptó el precio nuevo. Puedes continuar con el trabajo.";
            case AJUSTE_RECHAZADO ->
                    quien + " no aceptó el precio nuevo, así que el trabajo no sigue.";
            case TRABAJO_INICIADO ->
                    quien + " marcó el servicio como en curso.";
            case TRABAJO_COMPLETADO ->
                    quien + " terminó el trabajo. Cuando quieras, puedes revisarlo y pagarlo.";
            case PAGO_RECIBIDO ->
                    "Se registró el pago del servicio. Recibes " + quien + " después de la comisión.";
            case CALIFICACION_RECIBIDA ->
                    quien + " dejó una calificación de este servicio.";
            case SERVICIO_CANCELADO ->
                    quien + " canceló el servicio.";
            case VERIFICACION_APROBADA ->
                    "Ya apareces en las búsquedas y puedes recibir solicitudes de clientes.";
            case VERIFICACION_RECHAZADA ->
                    "Revisa tus documentos y vuelve a enviarlos para que podamos aprobarte.";
            // Aquí el detalle es el asunto del reclamo, no el nombre de nadie.
            case RECLAMO_RESPONDIDO ->
                    "Tienes una respuesta en tu reclamo \"" + quien + "\". Puedes seguir la conversación desde Ayuda.";
        };
    }
}
