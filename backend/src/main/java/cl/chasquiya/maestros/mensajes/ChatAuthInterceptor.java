package cl.chasquiya.maestros.mensajes;

import java.security.Principal;
import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import cl.chasquiya.maestros.seguridad.JwtService;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Seguridad del chat en tiempo real. Hace dos cosas:
 * 1) CONNECT: valida el JWT que manda la app y deja al usuario identificado en la sesión.
 * 2) SUBSCRIBE: solo deja escuchar /topic/solicitudes/{id} a las dos partes de esa solicitud.
 */
@Component
public class ChatAuthInterceptor implements ChannelInterceptor {

    private static final String PREFIJO_TOPICO = "/topic/solicitudes/";

    private final JwtService jwtService;
    private final UsuarioRepository usuarios;
    private final SolicitudRepository solicitudes;

    public ChatAuthInterceptor(JwtService jwtService, UsuarioRepository usuarios,
                               SolicitudRepository solicitudes) {
        this.jwtService = jwtService;
        this.usuarios = usuarios;
        this.solicitudes = solicitudes;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(acc.getCommand())) {
            Long usuarioId = autenticar(acc);
            // Guardamos el id en la sesión para validar las suscripciones siguientes.
            acc.setUser(new UsuarioPrincipal(usuarioId));
        } else if (StompCommand.SUBSCRIBE.equals(acc.getCommand())) {
            validarSuscripcion(acc);
        }
        return message;
    }

    private Long autenticar(StompHeaderAccessor acc) {
        List<String> valores = acc.getNativeHeader("Authorization");
        String header = (valores == null || valores.isEmpty()) ? null : valores.get(0);
        if (header == null || !header.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Falta el token para conectarse al chat");
        }
        String token = header.substring(7);
        if (!jwtService.esValido(token)) {
            throw new IllegalArgumentException("Token inválido");
        }
        Usuario u = usuarios.findByEmail(jwtService.extraerEmail(token))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        return u.getId();
    }

    private void validarSuscripcion(StompHeaderAccessor acc) {
        String destino = acc.getDestination();
        if (destino == null || !destino.startsWith(PREFIJO_TOPICO)) {
            throw new IllegalArgumentException("Destino no permitido");
        }
        Principal principal = acc.getUser();
        if (!(principal instanceof UsuarioPrincipal up)) {
            throw new IllegalArgumentException("No autenticado");
        }
        long solicitudId;
        try {
            solicitudId = Long.parseLong(destino.substring(PREFIJO_TOPICO.length()));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Destino no válido");
        }
        Solicitud s = solicitudes.findById(solicitudId)
                .orElseThrow(() -> new IllegalArgumentException("Solicitud no encontrada"));
        if (!s.getClienteId().equals(up.id()) && !s.getMaestroId().equals(up.id())) {
            throw new IllegalArgumentException("Este chat no es tuyo");
        }
    }

    /** Identidad del usuario dentro de la sesión WebSocket. */
    public record UsuarioPrincipal(Long id) implements Principal {
        @Override
        public String getName() {
            return String.valueOf(id);
        }
    }
}
