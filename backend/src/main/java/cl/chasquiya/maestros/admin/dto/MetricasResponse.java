package cl.chasquiya.maestros.admin.dto;

import java.util.Map;

/** Números del dashboard del backoffice. */
public record MetricasResponse(
        long usuariosTotales,
        long clientes,
        long maestros,
        long maestrosAprobados,
        long maestrosPendientes,
        long serviciosTotales,
        long serviciosCompletados,
        long disputasAbiertas,
        long montoTransado,
        long comisionesAcumuladas,
        double calificacionPromedio,
        /** Cuántos servicios hay en cada estado (para el gráfico). */
        Map<String, Long> serviciosPorEstado) {
}
