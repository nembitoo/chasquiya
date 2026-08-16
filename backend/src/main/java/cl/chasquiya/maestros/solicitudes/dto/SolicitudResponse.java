package cl.chasquiya.maestros.solicitudes.dto;

import java.time.Instant;

import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.TipoCotizacion;

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
        /** CERRADO o ESTIMADO: define si el precio todavía puede cambiar. */
        TipoCotizacion cotizacionTipo,
        Integer cotizacionCostoVisita,
        /** Si quien consulta ya dejó su calificación en este servicio. */
        boolean yaCalifique,
        /** Fotos del problema adjuntas; el contenido se pide aparte. */
        int cantidadFotos,
        /** Publicada sin maestro: varios pueden cotizarla y el cliente elige. */
        boolean abierta,
        /** Cuántas ofertas recibió. En una abierta es lo que el cliente compara. */
        int cantidadCotizaciones,
        /** Precio nuevo esperando que el cliente lo apruebe, si lo hay. */
        Integer montoAjustado,
        String mensajeAjuste,
        /** Si el trabajo no se hizo, lo único cobrable: la visita ya acordada. */
        Integer montoVisitaCobrado,
        /**
         * Precio que el maestro tiene publicado hoy para el servicio del que
         * nació esta solicitud, si nació de uno. Sirve para precargarle el monto
         * al cotizar; el precio que vale sigue siendo el de la cotización.
         */
        Integer precioCatalogo,
        Instant fechaCreacion) {
}
