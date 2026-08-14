package cl.chasquiya.maestros.solicitudes;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** La máquina de estados es lógica crítica: se prueba camino feliz y saltos inválidos. */
class EstadoServicioTest {

    @Test
    void caminoFelizCompleto() {
        assertTrue(EstadoServicio.SOLICITADO.puedePasarA(EstadoServicio.COTIZADO));
        assertTrue(EstadoServicio.COTIZADO.puedePasarA(EstadoServicio.ACEPTADO));
        assertTrue(EstadoServicio.ACEPTADO.puedePasarA(EstadoServicio.EN_CURSO));
        assertTrue(EstadoServicio.EN_CURSO.puedePasarA(EstadoServicio.COMPLETADO));
        assertTrue(EstadoServicio.COMPLETADO.puedePasarA(EstadoServicio.PAGADO));
        assertTrue(EstadoServicio.PAGADO.puedePasarA(EstadoServicio.CALIFICADO));
    }

    @Test
    void noSePuedenSaltarEtapas() {
        assertFalse(EstadoServicio.SOLICITADO.puedePasarA(EstadoServicio.ACEPTADO));
        assertFalse(EstadoServicio.SOLICITADO.puedePasarA(EstadoServicio.EN_CURSO));
        assertFalse(EstadoServicio.COTIZADO.puedePasarA(EstadoServicio.COMPLETADO));
        assertFalse(EstadoServicio.ACEPTADO.puedePasarA(EstadoServicio.COMPLETADO));
    }

    @Test
    void noSeRetrocede() {
        assertFalse(EstadoServicio.COTIZADO.puedePasarA(EstadoServicio.SOLICITADO));
        assertFalse(EstadoServicio.EN_CURSO.puedePasarA(EstadoServicio.ACEPTADO));
        assertFalse(EstadoServicio.COMPLETADO.puedePasarA(EstadoServicio.EN_CURSO));
    }

    @Test
    void sePuedeCancelarSoloAntesDeEmpezarElTrabajo() {
        assertTrue(EstadoServicio.SOLICITADO.permiteCancelar());
        assertTrue(EstadoServicio.COTIZADO.permiteCancelar());
        assertTrue(EstadoServicio.ACEPTADO.permiteCancelar());
        // Ya empezado, el camino es la disputa, no la cancelación.
        assertFalse(EstadoServicio.EN_CURSO.permiteCancelar());
        assertFalse(EstadoServicio.COMPLETADO.permiteCancelar());
    }

    @Test
    void disputaSoloDesdeTrabajoIniciado() {
        assertTrue(EstadoServicio.EN_CURSO.puedePasarA(EstadoServicio.EN_DISPUTA));
        assertTrue(EstadoServicio.COMPLETADO.puedePasarA(EstadoServicio.EN_DISPUTA));
        assertFalse(EstadoServicio.SOLICITADO.puedePasarA(EstadoServicio.EN_DISPUTA));
    }

    @Test
    void estadosFinalesNoTienenSalida() {
        assertTrue(EstadoServicio.CANCELADO.siguientesPosibles().isEmpty());
        assertTrue(EstadoServicio.CALIFICADO.siguientesPosibles().isEmpty());
    }

    @Test
    void unaDisputaSeResuelveACualquieraDeLosDosLados() {
        // A favor del cliente se anula; a favor del maestro el servicio se da por bueno.
        assertTrue(EstadoServicio.EN_DISPUTA.puedePasarA(EstadoServicio.CANCELADO));
        assertTrue(EstadoServicio.EN_DISPUTA.puedePasarA(EstadoServicio.COMPLETADO));
        // Pero no puede saltar directo a estados que requieren pasos previos.
        assertFalse(EstadoServicio.EN_DISPUTA.puedePasarA(EstadoServicio.CALIFICADO));
    }
}
