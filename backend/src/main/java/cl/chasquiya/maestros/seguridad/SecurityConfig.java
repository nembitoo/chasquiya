package cl.chasquiya.maestros.seguridad;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Configuración de seguridad de la API:
 * - Sin sesión de servidor (stateless): la identidad viaja en el JWT.
 * - Rutas públicas: registro, login y los chequeos de salud.
 * - Todo lo demás requiere un token válido.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // El handshake del chat pasa; el JWT se valida en el CONNECT de STOMP.
                        // /backoffice/** son solo archivos estáticos: los DATOS siguen protegidos en /admin/**.
                        .requestMatchers("/auth/registro", "/auth/login", "/ping", "/actuator/health", "/error",
                                "/ws/**", "/backoffice/**").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .requestMatchers("/maestros/**").hasRole("MAESTRO")
                        .anyRequest().authenticated())
                // Sin token válido en una ruta protegida -> 401 (no 403).
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authEx) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** BCrypt: algoritmo estándar para hashear contraseñas (lento a propósito). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
