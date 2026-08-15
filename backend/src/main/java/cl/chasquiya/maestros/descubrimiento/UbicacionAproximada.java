package cl.chasquiya.maestros.descubrimiento;

/**
 * Difumina la ubicación de un maestro antes de publicarla en el mapa.
 *
 * <p><b>Por qué existe:</b> la coordenada que registra un maestro suele ser su
 * casa. Entregarla exacta a cualquier persona que abra la app es un riesgo de
 * seguridad para él y un problema de proporcionalidad bajo la Ley 21.719: para
 * decidir a quién contratar basta saber la zona, no la dirección.
 *
 * <p><b>Cómo lo hace:</b> primero lleva el punto a una grilla de ~500 m, que es
 * lo único que se publica. Después lo mueve un poco <i>dentro de esa misma
 * celda</i>, de forma fija para cada maestro, para que dos marcadores de la
 * misma zona no queden uno encima del otro. Ese desplazamiento no revela nada
 * nuevo: el punto real sigue sin poder deducirse más allá de la celda.
 */
final class UbicacionAproximada {

    /** 0.005° de latitud ≈ 555 m; en Santiago, 0.005° de longitud ≈ 465 m. */
    private static final double CELDA = 0.005;

    /** El desplazamiento se queda dentro de la celda. */
    private static final double MARGEN = CELDA * 0.3;

    private UbicacionAproximada() {
    }

    static Double latitud(Double lat, Long usuarioId) {
        return difuminar(lat, usuarioId, 7);
    }

    static Double longitud(Double lon, Long usuarioId) {
        return difuminar(lon, usuarioId, 13);
    }

    private static Double difuminar(Double valor, Long usuarioId, int sal) {
        if (valor == null || usuarioId == null) {
            return null;
        }
        double celda = Math.round(valor / CELDA) * CELDA;
        // Fijo por maestro: el marcador no "salta" entre búsquedas.
        double ruido = (fraccion(usuarioId, sal) - 0.5) * 2 * MARGEN;
        // 5 decimales: más precisión de la que el redondeo entrega igual sería ruido.
        return Math.round((celda + ruido) * 100000.0) / 100000.0;
    }

    /**
     * Convierte (id, sal) en un número entre 0 y 1 bien repartido.
     *
     * <p>Un simple {@code id * constante % 1000} deja ids distintos en valores
     * casi iguales, y en el mapa esos maestros terminan uno encima del otro.
     * Esta mezcla (estilo murmur3) desparrama los bits antes de recortar.
     */
    private static double fraccion(long usuarioId, int sal) {
        long x = usuarioId * 0x9E3779B97F4A7C15L + sal * 0xBF58476D1CE4E5B9L;
        x ^= (x >>> 33);
        x *= 0xFF51AFD7ED558CCDL;
        x ^= (x >>> 33);
        x *= 0xC4CEB9FE1A85EC53L;
        x ^= (x >>> 33);
        return (x >>> 11) / (double) (1L << 53);
    }
}
