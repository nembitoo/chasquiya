package cl.chasquiya.maestros.soporte;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Metadatos de una evidencia del reclamo. El archivo en sí vive en MinIO. */
@Entity
@Table(name = "fotos_ticket")
public class FotoTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(nullable = false, length = 200)
    private String objeto;

    @Column(name = "tipo_contenido", nullable = false, length = 100)
    private String tipoContenido;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected FotoTicket() {
    }

    public FotoTicket(Long ticketId, String objeto, String tipoContenido) {
        this.ticketId = ticketId;
        this.objeto = objeto;
        this.tipoContenido = tipoContenido;
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

    public Long getTicketId() {
        return ticketId;
    }

    public String getObjeto() {
        return objeto;
    }

    public String getTipoContenido() {
        return tipoContenido;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
