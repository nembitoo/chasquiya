package cl.chasquiya.maestros.pagos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * El cálculo de la comisión es "lógica que rompe en silencio": si se equivoca,
 * nadie ve un error, solo se cobra mal. Por eso se prueba a fondo.
 */
class CalculadoraComisionTest {

    @Test
    void casoTipico() {
        var r = CalculadoraComision.repartir(30000, 10);

        assertEquals(30000, r.montoServicio(), "el cliente paga lo cotizado");
        assertEquals(3000, r.comision(), "la plataforma retiene el 10%");
        assertEquals(27000, r.montoMaestro(), "el maestro recibe el resto");
    }

    @ParameterizedTest(name = "{0} al {1}% -> comisión {2}, maestro {3}")
    @CsvSource({
            "30000, 10,  3000, 27000",
            "25000, 10,  2500, 22500",
            "18990, 10,  1899, 17091",
            "10000,  0,     0, 10000",   // sin comisión
            "10000, 100, 10000,    0",   // todo comisión (caso límite)
            "    0, 10,     0,     0",   // servicio gratis
            "  333, 10,    33,   300",   // redondea hacia abajo (33,3)
            "  335, 10,    34,   301",   // redondea hacia arriba (33,5)
    })
    void repartosCorrectos(int monto, int pct, int comisionEsperada, int maestroEsperado) {
        var r = CalculadoraComision.repartir(monto, pct);

        assertEquals(comisionEsperada, r.comision());
        assertEquals(maestroEsperado, r.montoMaestro());
    }

    @ParameterizedTest
    @CsvSource({"30000, 10", "18990, 10", "333, 10", "99999, 15", "1, 10"})
    void nuncaSePierdeNiUnPeso(int monto, int pct) {
        var r = CalculadoraComision.repartir(monto, pct);

        // Invariante clave: lo que paga el cliente = comisión + lo del maestro.
        assertEquals(monto, r.comision() + r.montoMaestro());
    }

    @Test
    void rechazaValoresImposibles() {
        assertThrows(IllegalArgumentException.class, () -> CalculadoraComision.repartir(-1, 10));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraComision.repartir(1000, -5));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraComision.repartir(1000, 101));
    }
}
