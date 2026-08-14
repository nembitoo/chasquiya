package cl.chasquiya.maestros.solicitudes.dto;

import java.time.Instant;

import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;

/** Solicitud vista desde la app (incluye la contraparte y la cotización si existe). */
public record SolicitudResponse(
        Long id,
        Long clienteId,
        String clienteNombre,
        Long maestroId,
        String maestroNombre,
        Oficio oficio,
        String descripcion,
        String direccion,
        String fechaPreferida,
        Integer presupuestoEstimado,
        EstadoServicio estado,
        String motivoCancelacion,
        Integer cotizacionMonto,
        String cotizacionMensaje,
        Instant fechaCreacion) {
}
