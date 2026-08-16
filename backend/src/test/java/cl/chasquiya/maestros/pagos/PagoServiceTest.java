package cl.chasquiya.maestros.pagos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.pagos.dto.IngresosResponse;
import cl.chasquiya.maestros.pagos.dto.PagoResponse;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.Cotizacion;
import cl.chasquiya.maestros.solicitudes.CotizacionRepository;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class PagoServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long INTRUSO = 99L;

    private final PagoRepository pagos = mock(PagoRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final CotizacionRepository cotizaciones = mock(CotizacionRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);

    private final cl.chasquiya.maestros.notificaciones.NotificacionService notificaciones =
            mock(cl.chasquiya.maestros.notificaciones.NotificacionService.class);

    private final PagoService servicio =
            new PagoService(pagos, solicitudes, cotizaciones, usuarios, notificaciones, 10);

    private Solicitud solicitudEn(EstadoServicio estado) {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.ELECTRICIDAD, "desc", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", 10L);
        s.setEstado(estado);
        when(solicitudes.findById(10L)).thenReturn(Optional.of(s));
        when(cotizaciones.findBySolicitudIdAndMaestroId(10L, MAESTRO)).thenReturn(Optional.of(new Cotizacion(10L, MAESTRO, 30000, "ok")));
        when(pagos.findBySolicitudId(10L)).thenReturn(Optional.empty());
        return s;
    }

    @Test
    void pagarRegistraLaComisionYDejaLaSolicitudPagada() {
        Solicitud s = solicitudEn(EstadoServicio.COMPLETADO);

        PagoResponse r = servicio.pagar(CLIENTE, 10L);

        assertEquals(30000, r.montoServicio());
        assertEquals(3000, r.comision());
        assertEquals(27000, r.montoMaestro());
        assertEquals(EstadoServicio.PAGADO, s.getEstado());
        verify(pagos).save(any(Pago.class));
        verify(solicitudes).save(s);
    }

    @Test
    void noSePuedePagarUnServicioNoCompletado() {
        solicitudEn(EstadoServicio.EN_CURSO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.pagar(CLIENTE, 10L));

        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
        verify(pagos, never()).save(any());
    }

    @Test
    void noSePuedePagarDosVeces() {
        solicitudEn(EstadoServicio.COMPLETADO);
        when(pagos.findBySolicitudId(10L))
                .thenReturn(Optional.of(new Pago(10L, CalculadoraComision.repartir(30000, 10))));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.pagar(CLIENTE, 10L));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    @Test
    void soloElClienteDelServicioPuedePagar() {
        solicitudEn(EstadoServicio.COMPLETADO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.pagar(INTRUSO, 10L));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }

    @Test
    void sinCotizacionNoSePuedeCobrar() {
        solicitudEn(EstadoServicio.COMPLETADO);
        when(cotizaciones.findBySolicitudIdAndMaestroId(10L, MAESTRO)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> servicio.pagar(CLIENTE, 10L));
    }

    @Test
    void ingresosSumanLoQueRecibeElMaestroNoElTotalCobrado() {
        Solicitud pagada = new Solicitud(CLIENTE, MAESTRO, Oficio.PINTURA, "d", "dir", null, null);
        ReflectionTestUtils.setField(pagada, "id", 10L);
        pagada.setEstado(EstadoServicio.PAGADO);
        Solicitud porCobrar = new Solicitud(CLIENTE, MAESTRO, Oficio.PINTURA, "d", "dir", null, null);
        ReflectionTestUtils.setField(porCobrar, "id", 11L);
        porCobrar.setEstado(EstadoServicio.COMPLETADO);

        when(solicitudes.findByMaestroIdOrderByFechaCreacionDesc(MAESTRO))
                .thenReturn(List.of(pagada, porCobrar));
        Pago p = new Pago(10L, CalculadoraComision.repartir(30000, 10));
        ReflectionTestUtils.setField(p, "fechaCreacion", java.time.Instant.now());
        when(pagos.findBySolicitudIdIn(any())).thenReturn(List.of(p));

        IngresosResponse r = servicio.ingresosDe(MAESTRO);

        assertEquals(27000, r.totalAcumulado(), "suma lo neto del maestro, no lo bruto");
        assertEquals(1, r.serviciosPagados());
        assertEquals(1, r.serviciosPorCobrar());
    }

    @Test
    void maestroSinTrabajosTieneIngresosEnCero() {
        when(solicitudes.findByMaestroIdOrderByFechaCreacionDesc(MAESTRO)).thenReturn(List.of());

        IngresosResponse r = servicio.ingresosDe(MAESTRO);

        assertEquals(0, r.totalAcumulado());
        assertEquals(0, r.serviciosPagados());
    }
}
