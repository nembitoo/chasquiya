package cl.chasquiya.maestros.direcciones;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/** Dirección guardada por un cliente ("Casa", "Trabajo"...). */
@Entity
@Table(name = "direcciones")
public class Direccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false)
    private String etiqueta;

    @Column(nullable = false)
    private String direccion;

    private String comuna;

    private String referencia;

    @Column(name = "es_principal", nullable = false)
    private boolean esPrincipal;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Direccion() {
    }

    public Direccion(Long usuarioId, String etiqueta, String direccion, String comuna,
                     String referencia, boolean esPrincipal) {
        this.usuarioId = usuarioId;
        this.etiqueta = etiqueta;
        this.direccion = direccion;
        this.comuna = comuna;
        this.referencia = referencia;
        this.esPrincipal = esPrincipal;
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

    public String getEtiqueta() {
        return etiqueta;
    }

    public void setEtiqueta(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getComuna() {
        return comuna;
    }

    public void setComuna(String comuna) {
        this.comuna = comuna;
    }

    public String getReferencia() {
        return referencia;
    }

    public void setReferencia(String referencia) {
        this.referencia = referencia;
    }

    public boolean isEsPrincipal() {
        return esPrincipal;
    }

    public void setEsPrincipal(boolean esPrincipal) {
        this.esPrincipal = esPrincipal;
    }
}
