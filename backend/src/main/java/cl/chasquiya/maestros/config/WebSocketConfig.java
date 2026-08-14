package cl.chasquiya.maestros.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import cl.chasquiya.maestros.mensajes.ChatAuthInterceptor;

/**
 * Chat en tiempo real con STOMP sobre WebSocket.
 * La app se conecta a ws://<host>/ws y escucha /topic/solicitudes/{id}.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChatAuthInterceptor chatAuthInterceptor;

    public WebSocketConfig(ChatAuthInterceptor chatAuthInterceptor) {
        this.chatAuthInterceptor = chatAuthInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Broker simple en memoria: suficiente para el MVP (sin RabbitMQ ni nada externo).
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Valida el JWT al conectar y los permisos al suscribirse.
        registration.interceptors(chatAuthInterceptor);
    }
}
