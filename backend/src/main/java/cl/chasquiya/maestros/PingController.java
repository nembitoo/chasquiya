package cl.chasquiya.maestros;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint mínimo de diagnóstico del Hito 0.
 * Sirve para confirmar que el backend arranca y responde.
 * GET /ping -> {"servicio":"chasquiya-backend","estado":"ok","hora":"..."}
 */
@RestController
public class PingController {

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of(
                "servicio", "chasquiya-backend",
                "estado", "ok",
                "hora", Instant.now().toString());
    }
}
