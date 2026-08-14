package cl.chasquiya.maestros.calificaciones;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.dto.CalificarRequest;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class CalificacionServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long INTRUSO = 99L;

    private final CalificacionRepository calificaciones = mock(CalificacionRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);

    private final CalificacionService servicio =
            new CalificacionService(calificaciones, solicitudes, usuarios);

    private Solicitud solicitudEn(EstadoServicio estado) {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.ELECTRICIDAD, "d", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", 10L);
        s.setEstado(estado);
        when(solicitudes.findById(10L)).thenReturn(Optional.of(s));
        return s;
    }

    private CalificarRequest cinco() {
        return new CalificarRequest((short) 5, "Excelente trabajo", (short) 5, (short) 4, (short) 5);
    }

    @Test
    void elClienteCalificaAlMaestroConAspectos() {
        solicitudEn(EstadoServicio.PAGADO);
        when(calificaciones.findBySolicitudId(10L)).thenReturn(List.of());

        var r = servicio.calificar(CLIENTE, 10L, cinco());

        assertEquals(5, r.estrellas());
        ArgumentCaptor<Calificacion> captor = forClass(Calificacion.class);
        verify(calificaciones).save(captor.capture());
        Calificacion guardada = captor.getValue();
        assertEquals(MAESTRO, guardada.getDestinatarioId());
        assertEquals((short) 5, guardada.getPuntualidad());
    }

    @Test
    void elMaestroCalificaAlClienteSinAspectos() {
        solicitudEn(EstadoServicio.PAGADO);
        when(calificaciones.findBySolicitudId(10L)).thenReturn(List.of());

        servicio.calificar(MAESTRO, 10L, cinco());

        ArgumentCaptor<Calificacion> captor = forClass(Calificacion.class);
        verify(calificaciones).save(captor.capture());
        Calificacion guardada = captor.getValue();
        assertEquals(CLIENTE, guardada.getDestinatarioId());
        // Puntualidad/calidad/trato solo aplican al calificar a un maestro.
        assertNull(guardada.getPuntualidad());
        assertNull(guardada.getCalidad());
    }

    @Test
    void cuandoAmbosCalificanElServicioQuedaCalificado() {
        Solicitud s = solicitudEn(EstadoServicio.PAGADO);
        // Tras guardar la segunda calificación ya hay dos.
        when(calificaciones.findBySolicitudId(10L)).thenReturn(List.of(
                new Calificacion(10L, CLIENTE, MAESTRO, (short) 5, null, null, null, null),
                new Calificacion(10L, MAESTRO, CLIENTE, (short) 4, null, null, null, null)));

        servicio.calificar(MAESTRO, 10L, cinco());

        assertEquals(EstadoServicio.CALIFICADO, s.getEstado());
        verify(solicitudes).save(s);
    }

    @Test
    void noSePuedeCalificarUnServicioNoPagado() {
        solicitudEn(EstadoServicio.COMPLETADO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.calificar(CLIENTE, 10L, cinco()));

        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
        verify(calificaciones, never()).save(any());
    }

    @Test
    void noSePuedeCalificarDosVeces() {
        solicitudEn(EstadoServicio.PAGADO);
        when(calificaciones.existsBySolicitudIdAndAutorId(10L, CLIENTE)).thenReturn(true);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.calificar(CLIENTE, 10L, cinco()));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    @Test
    void unExtranoNoPuedeCalificar() {
        solicitudEn(EstadoServicio.PAGADO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.calificar(INTRUSO, 10L, cinco()));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }

    @Test
    void puedeCalificarSoloSiPagoYNoCalificoAun() {
        Solicitud pagada = solicitudEn(EstadoServicio.PAGADO);
        when(calificaciones.existsBySolicitudIdAndAutorId(10L, CLIENTE)).thenReturn(false);
        assertTrue(servicio.puedeCalificar(CLIENTE, pagada));

        when(calificaciones.existsBySolicitudIdAndAutorId(10L, CLIENTE)).thenReturn(true);
        assertFalse(servicio.puedeCalificar(CLIENTE, pagada));
    }

    @Test
    void promedioSeRedondeaAUnDecimal() {
        CalificacionRepository.ResumenReputacion fila = mock(CalificacionRepository.ResumenReputacion.class);
        when(fila.getUsuarioId()).thenReturn(MAESTRO);
        when(fila.getPromedio()).thenReturn(4.666);
        when(fila.getCantidad()).thenReturn(3L);
        when(calificaciones.resumenDe(any())).thenReturn(List.of(fila));

        var rep = servicio.reputacionDe(MAESTRO);

        assertEquals(4.7, rep.promedio());
        assertEquals(3, rep.cantidad());
    }

    @Test
    void usuarioSinCalificacionesTieneReputacionVacia() {
        when(calificaciones.resumenDe(any())).thenReturn(List.of());

        var rep = servicio.reputacionDe(MAESTRO);

        assertEquals(0, rep.promedio());
        assertEquals(0, rep.cantidad());
    }
}
