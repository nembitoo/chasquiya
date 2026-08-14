package cl.chasquiya.maestros.pagos.dto;

/** Lo que se le muestra al cliente ANTES de pagar (desglose del cobro). */
public record ResumenPagoResponse(
        Long solicitudId,
        String maestroNombre,
        int montoServicio,
        int porcentajeComision,
        int comision,
        boolean yaPagado) {
}
