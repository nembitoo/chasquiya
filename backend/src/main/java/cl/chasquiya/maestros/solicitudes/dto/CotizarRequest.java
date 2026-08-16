package cl.chasquiya.maestros.solicitudes.dto;

import cl.chasquiya.maestros.solicitudes.TipoCotizacion;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * El maestro cotiza una solicitud.
 *
 * @param tipo        CERRADO (precio firme) o ESTIMADO (puede cambiar tras ver
 *                    el trabajo). Si no viene, se asume CERRADO: comprometerse
 *                    es el comportamiento más seguro para el cliente.
 * @param costoVisita lo que cobra por ir a diagnosticar si el trabajo no se
 *                    hace. Solo tiene efecto en las estimadas, y el cliente lo
 *                    ve antes de elegir.
 */
public record CotizarRequest(
        @NotNull @Positive Integer monto,
        @Size(max = 500) String mensaje,
        TipoCotizacion tipo,
        @PositiveOrZero Integer costoVisita) {

    public TipoCotizacion tipoOCerrado() {
        return tipo == null ? TipoCotizacion.CERRADO : tipo;
    }
}
