package cl.chasquiya.maestros.direcciones.dto;

/** Dirección tal como la ve la app. */
public record DireccionResponse(
        Long id,
        String etiqueta,
        String direccion,
        String comuna,
        String referencia,
        boolean esPrincipal) {
}
