package cl.chasquiya.maestros.mensajes;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Mensaje del chat de una solicitud. */
@Entity
@Table(name = "mensajes")
public class Mensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false)
    private Long solicitudId;

    @Column(name = "autor_id", nullable = false)
    private Long autorId;

    @Column(nullable = false)
    private String texto;

    @Column(nullable = false)
    private boolean leido;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Mensaje() {
    }

    public Mensaje(Long solicitudId, Long autorId, String texto) {
        this.solicitudId = solicitudId;
        this.autorId = autorId;
        this.texto = texto;
    }

    @PrePersist
    void alCrear() {
        if (fechaCreacion == null) {
            fechaCreacion = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getSolicitudId() {
        return solicitudId;
    }

    public Long getAutorId() {
        return autorId;
    }

    public String getTexto() {
        return texto;
    }

    /** Se usa al anonimizar la cuenta del autor (Ley 21.719). */
    public void setTexto(String texto) {
        this.texto = texto;
    }

    public boolean isLeido() {
        return leido;
    }

    public void setLeido(boolean leido) {
        this.leido = leido;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
