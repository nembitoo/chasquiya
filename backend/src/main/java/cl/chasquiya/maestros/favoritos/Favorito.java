package cl.chasquiya.maestros.favoritos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Un maestro guardado por un cliente. */
@Entity
@Table(name = "favoritos")
public class Favorito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(name = "maestro_id", nullable = false)
    private Long maestroId;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Favorito() {
    }

    public Favorito(Long clienteId, Long maestroId) {
        this.clienteId = clienteId;
        this.maestroId = maestroId;
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

    public Long getClienteId() {
        return clienteId;
    }

    public Long getMaestroId() {
        return maestroId;
    }
}
