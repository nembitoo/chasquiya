package cl.chasquiya.maestros.calificaciones.dto;

/**
 * Reputación de un usuario: promedio y cuántas calificaciones tiene.
 * Es información pública, NO un mecanismo de sanción automática (ver Ley 21.431).
 */
public record ReputacionResponse(double promedio, long cantidad) {

    public static ReputacionResponse vacia() {
        return new ReputacionResponse(0, 0);
    }
}
