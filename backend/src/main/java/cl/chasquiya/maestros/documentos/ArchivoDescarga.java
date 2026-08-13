package cl.chasquiya.maestros.documentos;

/** Contenido de un archivo para descargar (bytes + metadatos). */
public record ArchivoDescarga(byte[] datos, String tipoContenido, String nombre) {
}
