package cl.chasquiya.maestros.documentos.dto;

import java.time.Instant;

/** Metadatos de un documento que devolvemos a la app (sin el contenido). */
public record DocumentoResponse(
        Long id,
        String nombreArchivo,
        String tipoContenido,
        Instant fechaCreacion) {
}
