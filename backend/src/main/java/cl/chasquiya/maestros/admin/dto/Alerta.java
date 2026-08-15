package cl.chasquiya.maestros.admin.dto;

/**
 * Algo que está esperando una decisión del administrador.
 *
 * <p>Son avisos operativos, no sanciones: señalan que <em>la plataforma</em>
 * tiene algo pendiente (revisar documentos, mediar una disputa), nunca que un
 * maestro deba ser castigado por su comportamiento.
 *
 * @param severidad "alta" o "media": decide el color en el panel
 */
public record Alerta(String tipo, String severidad, String mensaje, long cantidad) {
}
