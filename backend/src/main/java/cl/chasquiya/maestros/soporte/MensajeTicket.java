package cl.chasquiya.maestros.soporte;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Un mensaje dentro de la conversación de un reclamo.
 *
 * <p>{@code esAdmin} dice de qué lado viene, y no se deduce del autor: la cuenta
 * puede anonimizarse (Ley 21.719) y el mensaje se conserva sin ella, pero el
 * hilo tiene que seguir leyéndose.
 */
@Entity
@Table(name = "mensajes_ticket")
public class MensajeTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(name = "autor_id")
    private Long autorId;

    @Column(name = "es_admin", nullable = false)
    private boolean esAdmin;

    @Column(nullable = false, length = 2000)
    private String cuerpo;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected MensajeTicket() {
    }

    public MensajeTicket(Long ticketId, Long autorId, boolean esAdmin, String cuerpo) {
        this.ticketId = ticketId;
        this.autorId = autorId;
        this.esAdmin = esAdmin;
        this.cuerpo = cuerpo;
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

    public Long getAutorId() {
        return autorId;
    }

    public boolean isEsAdmin() {
        return esAdmin;
    }

    public String getCuerpo() {
        return cuerpo;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
