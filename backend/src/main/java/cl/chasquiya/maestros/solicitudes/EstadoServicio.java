package cl.chasquiya.maestros.solicitudes;

import java.util.Set;

/**
 * Máquina de estados del servicio (lógica crítica del negocio).
 *
 * solicitado → cotizado → aceptado → en curso → completado → pagado → calificado
 * (+ cancelado y en disputa)
 *
 * PAGADO y CALIFICADO existen aquí, pero sus transiciones se habilitan en los
 * Hitos 6 y 7. Este hito llega hasta COMPLETADO.
 */
public enum EstadoServicio {

    SOLICITADO,
    COTIZADO,
    ACEPTADO,
    EN_CURSO,
    COMPLETADO,
    PAGADO,
    CALIFICADO,
    CANCELADO,
    EN_DISPUTA;

    /** Estados a los que se puede pasar desde este. */
    public Set<EstadoServicio> siguientesPosibles() {
        return switch (this) {
            case SOLICITADO -> Set.of(COTIZADO, CANCELADO);
            case COTIZADO -> Set.of(ACEPTADO, CANCELADO);
            // Antes de empezar el trabajo, cualquiera de las partes puede cancelar
            // (el maestro es independiente: cancelar no se castiga — Ley 21.431).
            case ACEPTADO -> Set.of(EN_CURSO, CANCELADO);
            case EN_CURSO -> Set.of(COMPLETADO, EN_DISPUTA);
            case COMPLETADO -> Set.of(PAGADO, EN_DISPUTA);
            case PAGADO -> Set.of(CALIFICADO, EN_DISPUTA);
            // Un admin resuelve la disputa: a favor del cliente (se anula) o
            // a favor del maestro (el servicio se da por bueno y sigue su curso).
            case EN_DISPUTA -> Set.of(CANCELADO, COMPLETADO);
            // Estados finales.
            case CALIFICADO, CANCELADO -> Set.of();
        };
    }

    public boolean puedePasarA(EstadoServicio destino) {
        return siguientesPosibles().contains(destino);
    }

    /** Una vez iniciado el trabajo ya no se puede cancelar (se abre disputa). */
    public boolean permiteCancelar() {
        return puedePasarA(CANCELADO);
    }
}
