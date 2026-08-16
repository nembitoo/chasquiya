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

    /**
     * Null mientras la solicitud está abierta: se fija cuando el cliente acepta
     * una de las cotizaciones que recibió.
     */
    @Column(name = "maestro_id")
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

    /** Dónde es el trabajo, para ofrecerlo a los maestros que tenga cerca. Opcional. */
    private Double latitud;

    private Double longitud;

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

    /** Solicitud abierta: sin maestro y con la ubicación del trabajo. */
    public Solicitud(Long clienteId, Oficio oficio, String descripcion, String direccion,
                     String fechaPreferida, Integer presupuestoEstimado,
                     Double latitud, Double longitud) {
        this(clienteId, null, oficio, descripcion, direccion, fechaPreferida, presupuestoEstimado);
        this.latitud = latitud;
        this.longitud = longitud;
    }

    /** Sigue abierta mientras nadie fue elegido. */
    public boolean estaAbierta() {
        return maestroId == null;
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

    /** Solo al aceptar una cotización: ahí la solicitud abierta deja de serlo. */
    public void setMaestroId(Long maestroId) {
        this.maestroId = maestroId;
    }

    public Double getLatitud() {
        return latitud;
    }

    public Double getLongitud() {
        return longitud;
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
