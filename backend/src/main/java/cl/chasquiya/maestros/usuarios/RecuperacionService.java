package cl.chasquiya.maestros.usuarios;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.usuarios.dto.RecuperarRequest;
import cl.chasquiya.maestros.usuarios.dto.RestablecerRequest;

/**
 * Recuperación de contraseña por código enviado al correo.
 *
 * Dos cuidados de seguridad importantes:
 * 1) Nunca revelamos si un correo existe o no (evita descubrir cuentas).
 * 2) El código se guarda hasheado y es de un solo uso, con vencimiento.
 */
@Service
public class RecuperacionService {

    private static final Logger log = LoggerFactory.getLogger(RecuperacionService.class);
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final TokenRecuperacionRepository tokens;
    private final PasswordEncoder encoder;
    private final JavaMailSender correo;
    private final String remitente;
    private final int minutosValidez;

    public RecuperacionService(UsuarioRepository usuarios, TokenRecuperacionRepository tokens,
                               PasswordEncoder encoder, JavaMailSender correo,
                               @Value("${chasquiya.correo.remitente}") String remitente,
                               @Value("${chasquiya.recuperacion.minutos}") int minutosValidez) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.encoder = encoder;
        this.correo = correo;
        this.remitente = remitente;
        this.minutosValidez = minutosValidez;
    }

    /**
     * Genera un código y lo envía por correo.
     * Responde igual exista o no la cuenta, para no filtrar qué correos están registrados.
     */
    public void solicitar(RecuperarRequest req) {
        String email = req.email().trim().toLowerCase();
        usuarios.findByEmail(email)
                .filter(Usuario::isActivo)
                .filter(u -> !u.estaAnonimizado())
                .ifPresent(this::enviarCodigo);
    }

    private void enviarCodigo(Usuario u) {
        // Código de 6 dígitos: cómodo de tipear en el teléfono.
        String codigo = String.format("%06d", ALEATORIO.nextInt(1_000_000));

        // Invalidamos los códigos anteriores: solo el último sirve.
        tokens.findByUsuarioIdAndUsadoFalse(u.getId()).forEach(t -> {
            t.setUsado(true);
            tokens.save(t);
        });
        tokens.save(new TokenRecuperacion(u.getId(), encoder.encode(codigo),
                Instant.now().plus(minutosValidez, ChronoUnit.MINUTES)));

        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom(remitente);
        mensaje.setTo(u.getEmail());
        mensaje.setSubject("Recupera tu contraseña de ChasquiYa!");
        mensaje.setText("""
                Hola %s:

                Recibimos una solicitud para restablecer la contraseña de tu cuenta.

                Tu código es: %s

                Ingrésalo en la aplicación. Vence en %d minutos y solo puede usarse una vez.

                Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.

                — El equipo de ChasquiYa!
                """.formatted(u.getNombre(), codigo, minutosValidez));

        try {
            correo.send(mensaje);
        } catch (Exception e) {
            // No exponemos el fallo al usuario para no filtrar información.
            log.error("No se pudo enviar el correo de recuperación", e);
        }
    }

    /** Valida el código y cambia la contraseña. */
    public void restablecer(RestablecerRequest req) {
        String codigo = req.codigo().trim();

        // Hay que comparar contra todos los tokens vigentes: el hash no se puede "buscar".
        TokenRecuperacion token = tokens.findAll().stream()
                .filter(TokenRecuperacion::estaVigente)
                .filter(t -> encoder.matches(codigo, t.getTokenHash()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El código es incorrecto o ya venció. Pide uno nuevo."));

        Usuario u = usuarios.findById(token.getUsuarioId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        u.setPasswordHash(encoder.encode(req.passwordNueva()));
        usuarios.save(u);

        token.setUsado(true);
        tokens.save(token);
    }
}
