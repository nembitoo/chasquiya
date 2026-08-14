package cl.chasquiya.maestros.solicitudes;

import java.time.Instant;

import cl.chasquiya.maestros.perfiles.Oficio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/** Servicio solicitado por un cliente a un maestro concreto. */
@Entity
@Table(name = "solicitudes")
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(name = "maestro_id", nullable = false)
    private Long maestroId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Oficio oficio;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false)
    private String direccion;

    @Column(name = "fecha_preferida")
    private String fechaPreferida;

    @Column(name = "presupuesto_estimado")
    private Integer presupuestoEstimado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoServicio estado = EstadoServicio.SOLICITADO;

    @Column(name = "motivo_cancelacion")
    private String motivoCancelacion;

    /** Qué resolvió el admin cuando hubo disputa. */
    @Column(name = "resolucion_disputa")
    private String resolucionDisputa;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private Instant fechaActualizacion;

    protected Solicitud() {
    }

    public Solicitud(Long clienteId, Long maestroId, Oficio oficio, String descripcion,
                     String direccion, String fechaPreferida, Integer presupuestoEstimado) {
        this.clienteId = clienteId;
        this.maestroId = maestroId;
        this.oficio = oficio;
        this.descripcion = descripcion;
        this.direccion = direccion;
        this.fechaPreferida = fechaPreferida;
        this.presupuestoEstimado = presupuestoEstimado;
    }

    @PrePersist
    void alCrear() {
        Instant ahora = Instant.now();
        if (fechaCreacion == null) {
            fechaCreacion = ahora;
        }
        fechaActualizacion = ahora;
    }

    @PreUpdate
    void alActualizar() {
        fechaActualizacion = Instant.now();
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

    public Oficio getOficio() {
        return oficio;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public String getDireccion() {
        return direccion;
    }

    public String getFechaPreferida() {
        return fechaPreferida;
    }

    public Integer getPresupuestoEstimado() {
        return presupuestoEstimado;
    }

    public EstadoServicio getEstado() {
        return estado;
    }

    public void setEstado(EstadoServicio estado) {
        this.estado = estado;
    }

    public String getMotivoCancelacion() {
        return motivoCancelacion;
    }

    public void setMotivoCancelacion(String motivoCancelacion) {
        this.motivoCancelacion = motivoCancelacion;
    }

    public String getResolucionDisputa() {
        return resolucionDisputa;
    }

    public void setResolucionDisputa(String resolucionDisputa) {
        this.resolucionDisputa = resolucionDisputa;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }

    public Instant getFechaActualizacion() {
        return fechaActualizacion;
    }
}
