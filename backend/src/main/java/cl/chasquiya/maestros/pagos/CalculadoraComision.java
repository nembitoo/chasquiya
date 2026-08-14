package cl.chasquiya.maestros.pagos;

/**
 * Reparte el monto de un servicio entre la plataforma y el maestro.
 *
 * Regla de negocio: la comisión se DESCUENTA AL MAESTRO. El cliente paga
 * exactamente lo cotizado; la plataforma retiene su porcentaje de ese monto.
 *
 * Trabajamos en pesos chilenos: enteros, sin decimales. El redondeo se hace
 * sobre la comisión y el maestro se lleva la diferencia exacta, de modo que
 * comisión + monto del maestro siempre suman el total (no se pierde ni un peso).
 */
public final class CalculadoraComision {

    private CalculadoraComision() {
    }

    public static Reparto repartir(int montoServicio, int porcentaje) {
        if (montoServicio < 0) {
            throw new IllegalArgumentException("El monto no puede ser negativo");
        }
        if (porcentaje < 0 || porcentaje > 100) {
            throw new IllegalArgumentException("El porcentaje debe estar entre 0 y 100");
        }
        // Redondeo al peso más cercano (0,5 hacia arriba).
        int comision = (int) Math.round(montoServicio * (porcentaje / 100.0));
        int montoMaestro = montoServicio - comision;
        return new Reparto(montoServicio, porcentaje, comision, montoMaestro);
    }

    /** Desglose del pago: lo que paga el cliente, lo que retiene la plataforma y lo que recibe el maestro. */
    public record Reparto(int montoServicio, int porcentaje, int comision, int montoMaestro) {
    }
}
