package cl.chasquiya.maestros.solicitudes.dto;

import java.time.Instant;

import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;

/** Solicitud vista desde la app (incluye la contraparte y la cotización si existe). */
public record SolicitudResponse(
        Long id,
        Long clienteId,
        String clienteNombre,
        boolean clienteTieneAvatar,
        Long maestroId,
        String maestroNombre,
        boolean maestroTieneAvatar,
        Oficio oficio,
        String descripcion,
        String direccion,
        String fechaPreferida,
        Integer presupuestoEstimado,
        EstadoServicio estado,
        String motivoCancelacion,
        String resolucionDisputa,
        Integer cotizacionMonto,
        String cotizacionMensaje,
        /** Si quien consulta ya dejó su calificación en este servicio. */
        boolean yaCalifique,
        /** Fotos del problema adjuntas; el contenido se pide aparte. */
        int cantidadFotos,
        Instant fechaCreacion) {
}
