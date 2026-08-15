package cl.chasquiya.maestros.admin.dto;

import java.util.List;
import java.util.Map;

/**
 * Números del dashboard del backoffice.
 *
 * <p>Separa a propósito dos cosas que no se miden igual:
 * <ul>
 *   <li><b>Stock</b>: una foto de ahora (cuántos usuarios hay). Filtrarlo por
 *       fecha no significa nada, así que no lleva período ni comparación.</li>
 *   <li><b>Flujo</b>: lo que ocurrió <em>durante</em> el período (servicios
 *       creados, comisiones). Aquí sí tiene sentido comparar con el período
 *       anterior del mismo largo.</li>
 * </ul>
 */
public record MetricasResponse(
        /** Largo del período consultado, en días. */
        int dias,

        // --- Stock ---
        long usuariosTotales,
        long clientes,
        long maestros,
        long maestrosAprobados,
        long maestrosPendientes,
        long disputasAbiertas,
        double calificacionPromedio,

        // --- Flujo (con su comparación) ---
        Comparacion serviciosCreados,
        Comparacion serviciosCompletados,
        Comparacion montoTransado,
        Comparacion comisiones,

        // --- Gráficos ---
        Map<String, Long> serviciosPorEstado,
        List<PuntoSerie> serie,

        // --- Lo que espera una decisión ---
        List<Alerta> alertas) {
}
