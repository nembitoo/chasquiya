package cl.chasquiya.maestros.solicitudes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.notificaciones.NotificacionService;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.dto.AjustarPrecioRequest;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Ajuste de precio tras ver el trabajo.
 *
 * La regla que estos tests protegen: NADA se cobra si no estaba en la
 * cotizacion que el cliente acepto.
 */
class AjustePrecioTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long SOLICITUD = 10L;

    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final CotizacionRepository cotizaciones = mock(CotizacionRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final CalificacionRepository calificaciones = mock(CalificacionRepository.class);
    private final NotificacionService notificaciones = mock(NotificacionService.class);
    private final FotoSolicitudRepository fotos = mock(FotoSolicitudRepository.class);
    private final DescubrimientoService descubrimiento = mock(DescubrimientoService.class);

    private final SolicitudService servicio = new SolicitudService(solicitudes, cotizaciones, perfiles,
            usuarios, calificaciones, notificaciones, fotos, descubrimiento);

    @BeforeEach
    void setUp() {
        when(usuarios.findAllById(any())).thenReturn(List.of());
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(any())).thenReturn(List.of());
        when(fotos.findBySolicitudIdIn(any())).thenReturn(List.of());
    }

    private Solicitud aceptada() {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.ELECTRICIDAD, "Se corto la luz", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", SOLICITUD);
        s.setEstado(EstadoServicio.ACEPTADO);
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.of(s));
        return s;
    }

    private Cotizacion cotizacion(TipoCotizacion tipo, Integer costoVisita) {
        Cotizacion c = new Cotizacion(SOLICITUD, MAESTRO, 25000, "estimado");
        c.setTipo(tipo);
        c.setCostoVisita(costoVisita);
        when(cotizaciones.findBySolicitudIdAndMaestroId(SOLICITUD, MAESTRO)).thenReturn(Optional.of(c));
        return c;
    }

    /** Quien ofrecio precio cerrado se comprometio: no puede cambiarlo despues. */
    @Test
    void unPrecioCerradoNoSePuedeCambiar() {
        aceptada();
        cotizacion(TipoCotizacion.CERRADO, null);

        assertThatThrownBy(() -> servicio.proponerAjuste(MAESTRO, SOLICITUD,
                new AjustarPrecioRequest(60000, "era mas grande")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("precio cerrado");
    }

    /** Mientras el cliente no apruebe, el precio vigente sigue siendo el original. */
    @Test
    void elAjusteNoCambiaElPrecioHastaQueElClienteApruebe() {
        Solicitud s = aceptada();
        Cotizacion c = cotizacion(TipoCotizacion.ESTIMADO, 10000);

        SolicitudResponse r = servicio.proponerAjuste(MAESTRO, SOLICITUD,
                new AjustarPrecioRequest(60000, "el tablero estaba quemado"));

        assertThat(r.estado()).isEqualTo(EstadoServicio.AJUSTE_PROPUESTO);
        assertThat(s.getMontoAjustado()).isEqualTo(60000);
        assertThat(c.getMonto()).isEqualTo(25000);
    }

    @Test
    void alAprobarElPrecioNuevoPasaASerElAcordado() {
        Solicitud s = aceptada();
        Cotizacion c = cotizacion(TipoCotizacion.ESTIMADO, 10000);
        servicio.proponerAjuste(MAESTRO, SOLICITUD, new AjustarPrecioRequest(60000, "tablero quemado"));

        SolicitudResponse r = servicio.aprobarAjuste(CLIENTE, SOLICITUD);

        assertThat(r.estado()).isEqualTo(EstadoServicio.ACEPTADO);
        assertThat(c.getMonto()).isEqualTo(60000);
        assertThat(s.getMontoAjustado()).isNull();
    }

    /**
     * El caso que motivo todo esto: el cliente dice que no. El maestro cobra la
     * visita porque el cliente la habia aceptado al elegir esa cotizacion.
     */
    @Test
    void siRechazaSeCobraSoloLaVisitaQueHabiaAceptado() {
        Solicitud s = aceptada();
        cotizacion(TipoCotizacion.ESTIMADO, 10000);
        servicio.proponerAjuste(MAESTRO, SOLICITUD, new AjustarPrecioRequest(60000, "tablero quemado"));

        SolicitudResponse r = servicio.rechazarAjuste(CLIENTE, SOLICITUD);

        assertThat(s.getMontoVisitaCobrado()).isEqualTo(10000);
        assertThat(r.estado()).isEqualTo(EstadoServicio.COMPLETADO);
    }

    /** Sin visita acordada no hay nada que cobrar: un cargo sorpresa no vale. */
    @Test
    void siNoSeHabiaAcordadoVisitaNoSeCobraNada() {
        Solicitud s = aceptada();
        cotizacion(TipoCotizacion.ESTIMADO, null);
        servicio.proponerAjuste(MAESTRO, SOLICITUD, new AjustarPrecioRequest(60000, "tablero quemado"));

        SolicitudResponse r = servicio.rechazarAjuste(CLIENTE, SOLICITUD);

        assertThat(s.getMontoVisitaCobrado()).isNull();
        assertThat(r.estado()).isEqualTo(EstadoServicio.CANCELADO);
    }

    /** Un costo de visita en una cotizacion cerrada se ignora: no aplica. */
    @Test
    void unaCotizacionCerradaNuncaCobraVisita() {
        Cotizacion c = new Cotizacion(SOLICITUD, MAESTRO, 25000, null);
        c.setTipo(TipoCotizacion.CERRADO);
        c.setCostoVisita(10000);

        assertThat(c.visitaCobrable()).isZero();
    }

    @Test
    void soloElClienteDecideSobreElAjuste() {
        aceptada();
        cotizacion(TipoCotizacion.ESTIMADO, 10000);
        servicio.proponerAjuste(MAESTRO, SOLICITUD, new AjustarPrecioRequest(60000, "tablero"));

        assertThatThrownBy(() -> servicio.aprobarAjuste(MAESTRO, SOLICITUD))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    /** El trabajo queda detenido: no se puede empezar sin resolver el precio. */
    @Test
    void noSePuedeIniciarConUnAjustePendiente() {
        Solicitud s = aceptada();
        cotizacion(TipoCotizacion.ESTIMADO, 10000);
        servicio.proponerAjuste(MAESTRO, SOLICITUD, new AjustarPrecioRequest(60000, "tablero"));

        assertThatThrownBy(() -> servicio.iniciar(MAESTRO, SOLICITUD))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("No se puede pasar");
        assertThat(s.getEstado()).isEqualTo(EstadoServicio.AJUSTE_PROPUESTO);
    }
}
