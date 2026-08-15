package cl.chasquiya.maestros.usuarios;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Token de un solo uso para restablecer la contraseña.
 * Igual que las contraseñas, se guarda HASHEADO: si alguien lee la base de
 * datos no puede usarlo para entrar a una cuenta ajena.
 */
@Entity
@Table(name = "tokens_recuperacion")
public class TokenRecuperacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "expira_en", nullable = false)
    private Instant expiraEn;

    @Column(nullable = false)
    private boolean usado;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected TokenRecuperacion() {
    }

    public TokenRecuperacion(Long usuarioId, String tokenHash, Instant expiraEn) {
        this.usuarioId = usuarioId;
        this.tokenHash = tokenHash;
        this.expiraEn = expiraEn;
    }

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) {
            fechaCreacion = Instant.now();
        }
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public boolean isUsado() {
        return usado;
    }

    public void setUsado(boolean usado) {
        this.usado = usado;
    }

    /** Sirve solo si no se usó antes y no ha vencido. */
    public boolean estaVigente() {
        return !usado && Instant.now().isBefore(expiraEn);
    }
}
