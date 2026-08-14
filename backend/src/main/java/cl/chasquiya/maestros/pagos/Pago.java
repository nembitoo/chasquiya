package cl.chasquiya.maestros.pagos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Registro contable del pago de un servicio (simulado).
 * No contiene NINGÚN dato de medio de pago: solo montos y comisión.
 */
@Entity
@Table(name = "pagos")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false, unique = true)
    private Long solicitudId;

    @Column(name = "monto_servicio", nullable = false)
    private int montoServicio;

    @Column(name = "porcentaje_comision", nullable = false)
    private int porcentajeComision;

    @Column(nullable = false)
    private int comision;

    @Column(name = "monto_maestro", nullable = false)
    private int montoMaestro;

    @Column(nullable = false)
    private String metodo = "SIMULADO";

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Pago() {
    }

    public Pago(Long solicitudId, CalculadoraComision.Reparto reparto) {
        this.solicitudId = solicitudId;
        this.montoServicio = reparto.montoServicio();
        this.porcentajeComision = reparto.porcentaje();
        this.comision = reparto.comision();
        this.montoMaestro = reparto.montoMaestro();
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

    public int getMontoServicio() {
        return montoServicio;
    }

    public int getPorcentajeComision() {
        return porcentajeComision;
    }

    public int getComision() {
        return comision;
    }

    public int getMontoMaestro() {
        return montoMaestro;
    }

    public String getMetodo() {
        return metodo;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
