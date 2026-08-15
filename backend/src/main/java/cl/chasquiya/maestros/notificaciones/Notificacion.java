package cl.chasquiya.maestros.notificaciones;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Un aviso para un usuario. El texto se guarda ya redactado: el historial es un
 * registro de lo que pasó, no una plantilla que se re-arma en cada lectura.
 */
@Entity
@Table(name = "notificaciones")
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TipoNotificacion tipo;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 400)
    private String cuerpo;

    /** A qué servicio lleva al tocarla. Null en avisos que no son de un servicio. */
    @Column(name = "solicitud_id")
    private Long solicitudId;

    @Column(nullable = false)
    private boolean leida;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Notificacion() {
    }

    public Notificacion(Long usuarioId, TipoNotificacion tipo, String titulo, String cuerpo, Long solicitudId) {
        this.usuarioId = usuarioId;
        this.tipo = tipo;
        this.titulo = titulo;
        this.cuerpo = cuerpo;
        this.solicitudId = solicitudId;
        this.leida = false;
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

    public Long getUsuarioId() {
        return usuarioId;
    }

    public TipoNotificacion getTipo() {
        return tipo;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getCuerpo() {
        return cuerpo;
    }

    public Long getSolicitudId() {
        return solicitudId;
    }

    public boolean isLeida() {
        return leida;
    }

    public void marcarLeida() {
        this.leida = true;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
