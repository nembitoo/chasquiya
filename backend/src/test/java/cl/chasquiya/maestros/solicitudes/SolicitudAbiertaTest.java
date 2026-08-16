package cl.chasquiya.maestros.solicitudes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.catalogo.CatalogoService;
import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.notificaciones.NotificacionService;
import cl.chasquiya.maestros.notificaciones.TipoNotificacion;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.dto.CotizarRequest;
import cl.chasquiya.maestros.solicitudes.dto.PublicarSolicitudRequest;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Solicitud abierta: varios maestros compiten y el cliente elige. */
class SolicitudAbiertaTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO_A = 2L;
    private static final Long MAESTRO_B = 3L;
    private static final Long SOLICITUD = 10L;

    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final CotizacionRepository cotizaciones = mock(CotizacionRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final CalificacionRepository calificaciones = mock(CalificacionRepository.class);
    private final NotificacionService notificaciones = mock(NotificacionService.class);
    private final FotoSolicitudRepository fotos = mock(FotoSolicitudRepository.class);
    private final DescubrimientoService descubrimiento = mock(DescubrimientoService.class);
    private final CatalogoService catalogo = mock(CatalogoService.class);

    private final SolicitudService servicio = new SolicitudService(solicitudes, cotizaciones, perfiles,
            usuarios, calificaciones, notificaciones, fotos, descubrimiento, catalogo);

    @BeforeEach
    void setUp() {
        when(usuarios.findAllById(any())).thenReturn(List.of());
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(any())).thenReturn(List.of());
        when(fotos.findBySolicitudIdIn(any())).thenReturn(List.of());
    }

    private Solicitud abierta() {
        Solicitud s = new Solicitud(CLIENTE, Oficio.ELECTRICIDAD, "Se corto la luz", "Calle 1",
                null, 20000, -33.45, -70.66);
        ReflectionTestUtils.setField(s, "id", SOLICITUD);
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.of(s));
        return s;
    }

    private PerfilMaestro aprobado(Long usuarioId, Oficio oficio) {
        PerfilMaestro p = new PerfilMaestro(usuarioId);
        p.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        p.setOficios(Set.of(oficio));
        when(perfiles.findByUsuarioId(usuarioId)).thenReturn(Optional.of(p));
        return p;
    }

    private Cotizacion cotizacionDe(Long maestroId, long id, int monto) {
        Cotizacion c = new Cotizacion(SOLICITUD, maestroId, monto, "ok");
        ReflectionTestUtils.setField(c, "id", id);
        when(cotizaciones.findById(id)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    void sePublicaSinMaestroYEnEstadoSolicitado() {
        SolicitudResponse r = servicio.publicarAbierta(CLIENTE, new PublicarSolicitudRequest(
                Oficio.ELECTRICIDAD, "Se corto la luz", "Calle 1", null, 20000, -33.45, -70.66));

        assertThat(r.abierta()).isTrue();
        assertThat(r.maestroId()).isNull();
        assertThat(r.estado()).isEqualTo(EstadoServicio.SOLICITADO);
    }

    /**
     * La clave del modelo: la primera oferta NO cierra la competencia. Si pasara
     * a COTIZADO, el cliente se quedaria sin nada que comparar.
     */
    @Test
    void variosMaestrosPuedenCotizarYSigueAbierta() {
        Solicitud s = abierta();
        aprobado(MAESTRO_A, Oficio.ELECTRICIDAD);
        aprobado(MAESTRO_B, Oficio.ELECTRICIDAD);

        servicio.cotizar(MAESTRO_A, SOLICITUD, new CotizarRequest(30000, "incluye materiales", null, null));
        SolicitudResponse r = servicio.cotizar(MAESTRO_B, SOLICITUD, new CotizarRequest(25000, "mano de obra", null, null));

        assertThat(r.estado()).isEqualTo(EstadoServicio.SOLICITADO);
        assertThat(s.estaAbierta()).isTrue();
        verify(cotizaciones, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void elClienteRecibeAvisoDeCadaCotizacion() {
        abierta();
        aprobado(MAESTRO_A, Oficio.ELECTRICIDAD);

        servicio.cotizar(MAESTRO_A, SOLICITUD, new CotizarRequest(30000, null, null, null));

        verify(notificaciones).avisar(eq(CLIENTE), eq(TipoNotificacion.COTIZACION_RECIBIDA), eq(SOLICITUD), any());
    }

    @Test
    void unMaestroDeOtroOficioNoPuedeCotizar() {
        abierta();
        aprobado(MAESTRO_A, Oficio.PINTURA);

        assertThatThrownBy(() -> servicio.cotizar(MAESTRO_A, SOLICITUD, new CotizarRequest(30000, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("oficio");

        verify(cotizaciones, never()).save(any());
    }

    @Test
    void unMaestroNoAprobadoNoPuedeCotizar() {
        abierta();
        PerfilMaestro pendiente = new PerfilMaestro(MAESTRO_A);
        pendiente.setOficios(Set.of(Oficio.ELECTRICIDAD));
        when(perfiles.findByUsuarioId(MAESTRO_A)).thenReturn(Optional.of(pendiente));

        assertThatThrownBy(() -> servicio.cotizar(MAESTRO_A, SOLICITUD, new CotizarRequest(30000, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("aprobado");
    }

    @Test
    void elClienteNoPuedeCotizarSuPropiaSolicitud() {
        abierta();

        assertThatThrownBy(() -> servicio.cotizar(CLIENTE, SOLICITUD, new CotizarRequest(1000, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("tu propia");
    }

    @Test
    void alAceptarUnaCotizacionEseMaestroQuedaAsignado() {
        Solicitud s = abierta();
        Cotizacion elegida = cotizacionDe(MAESTRO_B, 77L, 25000);
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(SOLICITUD)).thenReturn(List.of(elegida));

        SolicitudResponse r = servicio.aceptarCotizacion(CLIENTE, SOLICITUD, 77L);

        assertThat(s.getMaestroId()).isEqualTo(MAESTRO_B);
        assertThat(s.estaAbierta()).isFalse();
        assertThat(r.estado()).isEqualTo(EstadoServicio.ACEPTADO);
    }

    /** Enterarse es mejor que quedar esperando; el aviso no juzga su trabajo. */
    @Test
    void alosNoElegidosSeLesAvisa() {
        abierta();
        Cotizacion ganadora = cotizacionDe(MAESTRO_A, 77L, 30000);
        Cotizacion perdedora = new Cotizacion(SOLICITUD, MAESTRO_B, 25000, "otra");
        ReflectionTestUtils.setField(perdedora, "id", 78L);
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(SOLICITUD))
                .thenReturn(List.of(perdedora, ganadora));

        servicio.aceptarCotizacion(CLIENTE, SOLICITUD, 77L);

        verify(notificaciones).avisar(eq(MAESTRO_A), eq(TipoNotificacion.COTIZACION_ACEPTADA), eq(SOLICITUD), any());
        verify(notificaciones).avisar(eq(MAESTRO_B), eq(TipoNotificacion.COTIZACION_RECHAZADA), eq(SOLICITUD), any());
    }

    @Test
    void nadieMasPuedeElegirPorElCliente() {
        abierta();
        cotizacionDe(MAESTRO_A, 77L, 30000);

        assertThatThrownBy(() -> servicio.aceptarCotizacion(MAESTRO_B, SOLICITUD, 77L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    /** Con un maestro ya asignado, el trabajo dejo de estar en competencia. */
    @Test
    void noSePuedeElegirDosVeces() {
        Solicitud s = abierta();
        Cotizacion primera = cotizacionDe(MAESTRO_A, 77L, 30000);
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(SOLICITUD)).thenReturn(List.of(primera));
        servicio.aceptarCotizacion(CLIENTE, SOLICITUD, 77L);

        cotizacionDe(MAESTRO_B, 78L, 25000);
        assertThatThrownBy(() -> servicio.aceptarCotizacion(CLIENTE, SOLICITUD, 78L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ya tiene un maestro");
        assertThat(s.getMaestroId()).isEqualTo(MAESTRO_A);
    }

    /** En una abierta hay que elegir una oferta concreta, no "aceptar" a secas. */
    @Test
    void aceptarSinElegirCotizacionNoSirveEnUnaAbierta() {
        abierta();

        assertThatThrownBy(() -> servicio.aceptar(CLIENTE, SOLICITUD))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("elige una de las cotizaciones");
    }

    @Test
    void elMaestroSoloVeTrabajosDeSuOficio() {
        PerfilMaestro p = aprobado(MAESTRO_A, Oficio.GASFITERIA);
        p.setLatitud(-33.45);
        p.setLongitud(-70.66);
        when(solicitudes.buscarAbiertasCerca(eq("GASFITERIA"), any(Double.class), any(Double.class),
                any(Double.class), eq(MAESTRO_A))).thenReturn(List.of());

        servicio.abiertasPara(MAESTRO_A);

        verify(solicitudes).buscarAbiertasCerca(eq("GASFITERIA"), any(Double.class), any(Double.class),
                any(Double.class), eq(MAESTRO_A));
    }

    /** Sin ubicación registrada el maestro igual trabaja: se calza solo por oficio. */
    @Test
    void sinUbicacionElCalceEsSoloPorOficio() {
        aprobado(MAESTRO_A, Oficio.ELECTRICIDAD);
        when(solicitudes.buscarAbiertasPorOficio("ELECTRICIDAD", MAESTRO_A)).thenReturn(List.of());

        servicio.abiertasPara(MAESTRO_A);

        verify(solicitudes).buscarAbiertasPorOficio("ELECTRICIDAD", MAESTRO_A);
    }
}
