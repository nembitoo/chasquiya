package cl.chasquiya.maestros.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Atajos del backoffice: Spring no busca index.html solo en subcarpetas,
 * así que hacemos que /backoffice y /backoffice/ abran el panel igual.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/backoffice", "/backoffice/index.html");
        registry.addViewController("/backoffice/").setViewName("forward:/backoffice/index.html");
    }
}
