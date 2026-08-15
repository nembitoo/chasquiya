package cl.chasquiya.maestros.soporte;

/** Ciclo de vida de un reclamo: NUEVO → EN_REVISION → RESUELTO. */
public enum EstadoTicket {
    NUEVO,
    EN_REVISION,
    RESUELTO;

    /** Solo se avanza; un ticket resuelto no vuelve atrás sin dejar rastro. */
    public boolean puedePasarA(EstadoTicket destino) {
        return switch (this) {
            case NUEVO -> destino == EN_REVISION || destino == RESUELTO;
            case EN_REVISION -> destino == RESUELTO;
            case RESUELTO -> false;
        };
    }
}
