package cl.chasquiya.maestros.solicitudes;

/**
 * Qué tan firme es el precio que ofrece el maestro.
 *
 * <p>Existe para que el cliente sepa <b>antes de elegir</b> si el monto puede
 * cambiar. Un estimado presentado como precio cerrado es justamente el problema
 * que este tipo evita.
 */
public enum TipoCotizacion {

    /** Precio firme: no cambia al llegar. */
    CERRADO,

    /**
     * Precio aproximado a partir de lo que se ve en la descripción y las fotos.
     * El maestro puede proponer otro monto tras revisar en el lugar, y el
     * cliente tiene que aprobarlo para que el trabajo siga.
     */
    ESTIMADO
}
