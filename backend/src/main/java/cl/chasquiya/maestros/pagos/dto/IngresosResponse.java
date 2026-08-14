package cl.chasquiya.maestros.pagos.dto;

import java.util.List;

/** Panel de ingresos del maestro. */
public record IngresosResponse(
        int totalAcumulado,
        int totalMes,
        int serviciosPagados,
        int serviciosPorCobrar,
        List<IngresoMensual> ultimosMeses) {

    /** Ingresos de un mes, para el gráfico simple. */
    public record IngresoMensual(String mes, int monto) {
    }
}
