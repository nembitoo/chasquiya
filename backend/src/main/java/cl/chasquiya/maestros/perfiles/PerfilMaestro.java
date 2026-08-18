package cl.chasquiya.maestros.perfiles;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Perfil profesional de un maestro. Ligado 1:1 a un usuario con rol MAESTRO.
 * La columna 'ubicacion' (PostGIS) la calcula la BD a partir de lat/lon,
 * por eso NO se mapea aquí: Java solo escribe latitud y longitud.
 */
@Entity
@Table(name = "perfiles_maestro")
public class PerfilMaestro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false, unique = true)
    private Long usuarioId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "perfil_maestro_oficios", joinColumns = @JoinColumn(name = "perfil_id"))
    @Column(name = "oficio")
    @Enumerated(EnumType.STRING)
    private Set<Oficio> oficios = new HashSet<>();

    private String descripcion;

    @Column(name = "anios_experiencia", nullable = false)
    private int aniosExperiencia;

    @Column(name = "zona_cobertura")
    private String zonaCobertura;

    private Double latitud;

    private Double longitud;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_verificacion", nullable = false)
    private EstadoVerificacion estadoVerificacion = EstadoVerificacion.PENDIENTE;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private Instant fechaActualizacion;

    protected PerfilMaestro() {
    }

    public PerfilMaestro(Long usuarioId) {
        this.usuarioId = usuarioId;
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

    public Long getUsuarioId() {
        return usuarioId;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }

    /** Última vez que el maestro tocó su perfil: sirve para medir cuánto lleva esperando revisión. */
    public Instant getFechaActualizacion() {
        return fechaActualizacion;
    }

    public Set<Oficio> getOficios() {
        return oficios;
    }

    public void setOficios(Set<Oficio> oficios) {
        this.oficios = oficios;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public int getAniosExperiencia() {
        return aniosExperiencia;
    }

    public void setAniosExperiencia(int aniosExperiencia) {
        this.aniosExperiencia = aniosExperiencia;
    }

    public String getZonaCobertura() {
        return zonaCobertura;
    }

    public void setZonaCobertura(String zonaCobertura) {
        this.zonaCobertura = zonaCobertura;
    }

    public Double getLatitud() {
        return latitud;
    }

    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }

    public Double getLongitud() {
        return longitud;
    }

    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }

    public EstadoVerificacion getEstadoVerificacion() {
        return estadoVerificacion;
    }

    public void setEstadoVerificacion(EstadoVerificacion estadoVerificacion) {
        this.estadoVerificacion = estadoVerificacion;
    }
}
