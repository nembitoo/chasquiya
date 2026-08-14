package cl.chasquiya.maestros.pagos.dto;

import java.time.Instant;

/** Comprobante del pago: desglose de lo que se cobró y cómo se repartió. */
public record PagoResponse(
        Long id,
        Long solicitudId,
        int montoServicio,
        int porcentajeComision,
        int comision,
        int montoMaestro,
        String metodo,
        Instant fechaCreacion) {
}
