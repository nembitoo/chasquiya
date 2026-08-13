package cl.chasquiya.maestros.seguridad;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import cl.chasquiya.maestros.usuarios.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Crea y valida los tokens JWT. El secreto y la duración vienen de la configuración. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expiracionHoras;

    public JwtService(
            @Value("${chasquiya.jwt.secret}") String secret,
            @Value("${chasquiya.jwt.expiracion-horas}") long expiracionHoras) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracionHoras = expiracionHoras;
    }

    /** Genera un token firmado: el email va como "subject" y el rol como claim. */
    public String generarToken(Usuario usuario) {
        Instant ahora = Instant.now();
        Instant expira = ahora.plus(expiracionHoras, ChronoUnit.HOURS);
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("uid", usuario.getId())
                .claim("rol", usuario.getRol().name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(expira))
                .signWith(key)
                .compact();
    }

    public String extraerEmail(String token) {
        return claims(token).getSubject();
    }

    public boolean esValido(String token) {
        try {
            claims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Lee y verifica la firma del token; lanza excepción si es inválido o expiró. */
    public Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
