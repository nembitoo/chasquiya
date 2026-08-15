package cl.chasquiya.maestros.descubrimiento;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UbicacionAproximadaTest {

    private static final double LAT_REAL = -33.437891;
    private static final double LON_REAL = -70.650123;

    /** ~500 m: suficiente para elegir a quién contratar, no para ir a la puerta. */
    private static final double TOLERANCIA_GRADOS = 0.006;

    @Test
    void nuncaDevuelveLaCoordenadaExacta() {
        assertThat(UbicacionAproximada.latitud(LAT_REAL, 42L)).isNotEqualTo(LAT_REAL);
        assertThat(UbicacionAproximada.longitud(LON_REAL, 42L)).isNotEqualTo(LON_REAL);
    }

    /** Difuminar sirve de poco si el punto queda tan lejos que el mapa miente. */
    @Test
    void seMantieneCercaDeLaZonaReal() {
        assertThat(UbicacionAproximada.latitud(LAT_REAL, 42L)).isCloseTo(LAT_REAL, org.assertj.core.data.Offset.offset(TOLERANCIA_GRADOS));
        assertThat(UbicacionAproximada.longitud(LON_REAL, 42L)).isCloseTo(LON_REAL, org.assertj.core.data.Offset.offset(TOLERANCIA_GRADOS));
    }

    /** El marcador no puede saltar entre búsquedas: se vería como un error. */
    @Test
    void esEstableParaElMismoMaestro() {
        assertThat(UbicacionAproximada.latitud(LAT_REAL, 42L))
                .isEqualTo(UbicacionAproximada.latitud(LAT_REAL, 42L));
    }

    /**
     * Dos maestros de la misma zona no deben quedar encima. No basta con que
     * los números difieran: si se separan 5 m, en el mapa se tapan igual.
     */
    @Test
    void losMaestrosDeUnaZonaQuedanSeparadosEnElMapa() {
        // ~30 m en latitud: suficiente para distinguir dos marcadores.
        final double SEPARACION_MINIMA = 0.0003;
        int colisiones = 0;

        for (long a = 1; a <= 60; a++) {
            for (long b = a + 1; b <= 60; b++) {
                double da = Math.abs(UbicacionAproximada.latitud(LAT_REAL, a)
                        - UbicacionAproximada.latitud(LAT_REAL, b));
                double dl = Math.abs(UbicacionAproximada.longitud(LON_REAL, a)
                        - UbicacionAproximada.longitud(LON_REAL, b));
                if (da < SEPARACION_MINIMA && dl < SEPARACION_MINIMA) {
                    colisiones++;
                }
            }
        }
        /*
         * Cuántas coincidencias son normales se puede calcular: con el ruido
         * repartido parejo en una franja de 0.003°, dos puntos quedan a menos
         * de 0.0003° en un eje con probabilidad 2·(0.1) − (0.1)² = 0.19, y en
         * los dos ejes 0.19² ≈ 3.6%. Sobre 1770 pares, unas 64.
         *
         * El tope es holgado a propósito: lo que este test tiene que detectar
         * es que la mezcla se degrade y amontone maestros (ahí serían cientos),
         * no una diferencia de unas pocas.
         */
        assertThat(colisiones).isLessThan(130);
    }

    /**
     * Dos casas distintas dentro de la MISMA celda dan el mismo punto: es justo
     * eso lo que impide deducir dónde vive cada quien.
     *
     * <p>Ojo: dos puntos separados por el borde de una celda caen en zonas
     * distintas aunque estén cerca. Es propio de cualquier grilla y no importa
     * aquí, porque el objetivo es ocultar el punto exacto, no agrupar vecinos.
     */
    @Test
    void dosCasasDeLaMismaCeldaDanElMismoPunto() {
        double a = UbicacionAproximada.latitud(-33.4360, 5L);
        double b = UbicacionAproximada.latitud(-33.4368, 5L);

        assertThat(a).isEqualTo(b);
    }

    @Test
    void sinCoordenadasDevuelveNull() {
        assertThat(UbicacionAproximada.latitud(null, 1L)).isNull();
        assertThat(UbicacionAproximada.longitud(LON_REAL, null)).isNull();
    }
}
