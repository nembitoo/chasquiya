package cl.chasquiya.maestros.calificaciones;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Calificación que una parte le deja a la otra al terminar el servicio.
 * Los aspectos (puntualidad, calidad, trato) solo se usan al calificar a un maestro.
 */
@Entity
@Table(name = "calificaciones")
public class Calificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false)
    private Long solicitudId;

    @Column(name = "autor_id", nullable = false)
    private Long autorId;

    @Column(name = "destinatario_id", nullable = false)
    private Long destinatarioId;

    @Column(nullable = false)
    private short estrellas;

    private String comentario;

    private Short puntualidad;

    private Short calidad;

    private Short trato;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Calificacion() {
    }

    public Calificacion(Long solicitudId, Long autorId, Long destinatarioId, short estrellas,
                        String comentario, Short puntualidad, Short calidad, Short trato) {
        this.solicitudId = solicitudId;
        this.autorId = autorId;
        this.destinatarioId = destinatarioId;
        this.estrellas = estrellas;
        this.comentario = comentario;
        this.puntualidad = puntualidad;
        this.calidad = calidad;
        this.trato = trato;
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

    public Long getDestinatarioId() {
        return destinatarioId;
    }

    public short getEstrellas() {
        return estrellas;
    }

    public String getComentario() {
        return comentario;
    }

    /** Se usa al anonimizar: la nota se conserva, el comentario se borra. */
    public void setComentario(String comentario) {
        this.comentario = comentario;
    }

    public Short getPuntualidad() {
        return puntualidad;
    }

    public Short getCalidad() {
        return calidad;
    }

    public Short getTrato() {
        return trato;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
