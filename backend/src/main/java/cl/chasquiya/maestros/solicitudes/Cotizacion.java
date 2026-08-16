package cl.chasquiya.maestros.solicitudes;

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
 * Precio que un maestro ofrece por una solicitud.
 *
 * <p>Una solicitud puede tener varias: en una solicitud abierta compiten
 * distintos maestros y el cliente elige. Cada maestro tiene una sola, que puede
 * corregir mientras el cliente no haya decidido.
 */
@Entity
@Table(name = "cotizaciones")
public class Cotizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false)
    private Long solicitudId;

    @Column(name = "maestro_id", nullable = false)
    private Long maestroId;

    @Column(nullable = false)
    private Integer monto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoCotizacion tipo = TipoCotizacion.CERRADO;

    /**
     * Lo que cobra por ir a diagnosticar. Solo en las estimadas.
     *
     * <p>Va aquí, en la cotización, porque el cliente tiene que conocerlo
     * <b>antes</b> de aceptar. Un cobro que aparece después no es exigible.
     */
    @Column(name = "costo_visita")
    private Integer costoVisita;

    private String mensaje;

    @Column(name = "fecha_creacion", nullable = false)
    private Instant fechaCreacion;

    protected Cotizacion() {
    }

    public Cotizacion(Long solicitudId, Long maestroId, Integer monto, String mensaje) {
        this.solicitudId = solicitudId;
        this.maestroId = maestroId;
        this.monto = monto;
        this.mensaje = mensaje;
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

    public Long getMaestroId() {
        return maestroId;
    }

    public Integer getMonto() {
        return monto;
    }

    public void setMonto(Integer monto) {
        this.monto = monto;
    }

    public TipoCotizacion getTipo() {
        return tipo;
    }

    public void setTipo(TipoCotizacion tipo) {
        this.tipo = tipo;
    }

    public Integer getCostoVisita() {
        return costoVisita;
    }

    public void setCostoVisita(Integer costoVisita) {
        this.costoVisita = costoVisita;
    }

    /** Un precio cerrado nunca cobra visita, aunque venga un valor por error. */
    public int visitaCobrable() {
        return tipo == TipoCotizacion.ESTIMADO && costoVisita != null ? costoVisita : 0;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
