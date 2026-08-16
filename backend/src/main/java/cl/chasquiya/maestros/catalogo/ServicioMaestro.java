package cl.chasquiya.maestros.catalogo;

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
import jakarta.persistence.Table;

/**
 * Un servicio con precio que el maestro publica en su catálogo.
 *
 * <p>Los precios los pone <b>él</b>, no la plataforma: fijar tarifas sería
 * tratarlo como empleado, y es independiente (Ley 21.431).
 */
@Entity
@Table(name = "servicios_maestro")
public class ServicioMaestro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "maestro_id", nullable = false)
    private Long maestroId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Oficio oficio;

    @Column(nullable = false, length = 80)
    private String titulo;

    @Column(length = 500)
    private String descripcion;

    @Column(nullable = false)
    private Integer precio;

    /**
     * Si el maestro se compromete a ese monto o solo lo usa como piso.
     *
     * <p>Con precio fijo, pedir el servicio genera una cotización CERRADA sola:
     * él ya se comprometió por escrito al publicarla. Sin él, cotiza como
     * siempre y ese monto le llega sugerido.
     */
    @Column(name = "precio_fijo", nullable = false)
    private boolean precioFijo;

    /** "por punto", "por m2", "la hora"... Texto libre: cada oficio se mide distinto. */
    @Column(length = 30)
    private String unidad;

    /** Pausar en vez de borrar: un servicio de temporada vuelve sin reescribirlo. */
    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected ServicioMaestro() {
    }

    public ServicioMaestro(Long maestroId, Oficio oficio, String titulo, String descripcion,
                           Integer precio, boolean precioFijo, String unidad) {
        this.maestroId = maestroId;
        this.oficio = oficio;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.precio = precio;
        this.precioFijo = precioFijo;
        this.unidad = unidad;
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

    public Long getMaestroId() {
        return maestroId;
    }

    public Oficio getOficio() {
        return oficio;
    }

    public void setOficio(Oficio oficio) {
        this.oficio = oficio;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getPrecio() {
        return precio;
    }

    public void setPrecio(Integer precio) {
        this.precio = precio;
    }

    public boolean isPrecioFijo() {
        return precioFijo;
    }

    public void setPrecioFijo(boolean precioFijo) {
        this.precioFijo = precioFijo;
    }

    public String getUnidad() {
        return unidad;
    }

    public void setUnidad(String unidad) {
        this.unidad = unidad;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
