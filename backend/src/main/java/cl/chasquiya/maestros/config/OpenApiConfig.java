package cl.chasquiya.maestros.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Documentación viva de la API en /swagger-ui.html.
 *
 * <p>La lista de endpoints se genera leyendo los controladores, así que no hay
 * un archivo aparte que se desactualice. Aquí solo va lo que springdoc no puede
 * adivinar: la portada y cómo se autentica.
 *
 * <p>El esquema JWT permite usar el botón "Authorize" y probar endpoints
 * protegidos desde el navegador, pegando el token que devuelve /auth/login.
 */
@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA_JWT = "bearer-jwt";

    @Bean
    public OpenAPI apiDeChasquiya() {
        return new OpenAPI()
                .info(new Info()
                        .title("ChasquiYa! API")
                        .version("v1")
                        .description("""
                                API del marketplace que conecta clientes con maestros de oficios.

                                Para probar endpoints protegidos: llama a POST /auth/login, copia el
                                campo "token" de la respuesta y pégalo en el botón Authorize.

                                Nota: el pago es simulado y NO se almacena ningún dato de tarjeta."""))
                .components(new Components().addSecuritySchemes(ESQUEMA_JWT, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Token entregado por /auth/login o /auth/registro")))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT));
    }
}
