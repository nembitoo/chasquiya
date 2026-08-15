package cl.chasquiya.maestros.admin.dto;

/**
 * Una métrica de flujo y su equivalente en el período anterior.
 *
 * @param variacion cambio porcentual con un decimal, o <b>null</b> si el período
 *                  anterior fue cero. No se puede calcular "cuánto creció" algo
 *                  que partió de nada: inventar un 100% ahí sería mentir, así que
 *                  el panel muestra un guion.
 */
public record Comparacion(long actual, long anterior, Double variacion) {

    public static Comparacion de(long actual, long anterior) {
        Double variacion = anterior == 0
                ? null
                : Math.round((actual - anterior) * 1000.0 / anterior) / 10.0;
        return new Comparacion(actual, anterior, variacion);
    }
}
