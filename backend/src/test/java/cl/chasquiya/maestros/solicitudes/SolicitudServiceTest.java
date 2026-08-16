package cl.chasquiya.maestros.solicitudes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.dto.CotizarRequest;
import cl.chasquiya.maestros.solicitudes.dto.CrearSolicitudRequest;
import cl.chasquiya.maestros.solicitudes.dto.SolicitudResponse;

/** Permisos (quién puede) + transiciones (desde qué estado). */
class SolicitudServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long INTRUSO = 99L;

    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final CotizacionRepository cotizaciones = mock(CotizacionRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final cl.chasquiya.maestros.usuarios.UsuarioRepository usuarios =
            mock(cl.chasquiya.maestros.usuarios.UsuarioRepository.class);

    private final cl.chasquiya.maestros.calificaciones.CalificacionRepository calificaciones =
            mock(cl.chasquiya.maestros.calificaciones.CalificacionRepository.class);

    private final cl.chasquiya.maestros.notificaciones.NotificacionService notificaciones =
            mock(cl.chasquiya.maestros.notificaciones.NotificacionService.class);

    private final FotoSolicitudRepository fotos = mock(FotoSolicitudRepository.class);

    private final cl.chasquiya.maestros.descubrimiento.DescubrimientoService descubrimiento =
            mock(cl.chasquiya.maestros.descubrimiento.DescubrimientoService.class);

    private final SolicitudService servicio =
            new SolicitudService(solicitudes, cotizaciones, perfiles, usuarios, calificaciones, notificaciones, fotos, descubrimiento);

    @BeforeEach
    void setUp() {
        when(usuarios.findAllById(any())).thenReturn(List.of());
        when(cotizaciones.findBySolicitudIdOrderByMontoAsc(any())).thenReturn(List.of());
        when(fotos.findBySolicitudIdIn(any())).thenReturn(List.of());
    }

    private Solicitud solicitudEn(EstadoServicio estado) {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.ELECTRICIDAD, "Se cortó la luz",
                "Av. Siempre Viva 742", null, 20000);
        ReflectionTestUtils.setField(s, "id", 10L);
        s.setEstado(estado);
        when(solicitudes.findById(10L)).thenReturn(Optional.of(s));
        return s;
    }

    private PerfilMaestro maestroAprobado() {
        PerfilMaestro p = new PerfilMaestro(MAESTRO);
        p.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        return p;
    }

    // --- Crear ---

    @Test
    void clienteCreaSolicitudEnEstadoSolicitado() {
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.of(maestroAprobado()));

        SolicitudResponse r = servicio.crear(CLIENTE, new CrearSolicitudRequest(
                MAESTRO, Oficio.ELECTRICIDAD, "Se cortó la luz", "Av. Siempre Viva 742", null, 20000));

        assertEquals(EstadoServicio.SOLICITADO, r.estado());
    }

    @Test
    void noSePuedeSolicitarAUnMaestroNoAprobado() {
        // Perfil pendiente (estado por defecto).
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.of(new PerfilMaestro(MAESTRO)));

        assertThrows(ResponseStatusException.class, () -> servicio.crear(CLIENTE, new CrearSolicitudRequest(
                MAESTRO, Oficio.ELECTRICIDAD, "Hola", "Calle 1", null, null)));
    }

    // --- Camino feliz ---

    @Test
    void flujoCompletoHastaCompletado() {
        Solicitud s = solicitudEn(EstadoServicio.SOLICITADO);

        assertEquals(EstadoServicio.COTIZADO,
                servicio.cotizar(MAESTRO, 10L, new CotizarRequest(25000, "Incluye materiales")).estado());
        assertEquals(EstadoServicio.ACEPTADO, servicio.aceptar(CLIENTE, 10L).estado());
        assertEquals(EstadoServicio.EN_CURSO, servicio.iniciar(MAESTRO, 10L).estado());
        assertEquals(EstadoServicio.COMPLETADO, servicio.completar(MAESTRO, 10L).estado());
        assertEquals(EstadoServicio.COMPLETADO, s.getEstado());
    }

    // --- Permisos ---

    @Test
    void unExtranoNoPuedeTocarLaSolicitud() {
        solicitudEn(EstadoServicio.COTIZADO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.aceptar(INTRUSO, 10L));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }

    @Test
    void elMaestroNoPuedeAceptarPorElCliente() {
        solicitudEn(EstadoServicio.COTIZADO);

        assertThrows(ResponseStatusException.class, () -> servicio.aceptar(MAESTRO, 10L));
    }

    @Test
    void elClienteNoPuedeCotizarSuPropiaSolicitud() {
        solicitudEn(EstadoServicio.SOLICITADO);

        assertThrows(ResponseStatusException.class,
                () -> servicio.cotizar(CLIENTE, 10L, new CotizarRequest(1000, null)));
    }

    // --- Transiciones inválidas ---

    @Test
    void noSePuedeIniciarSinAceptar() {
        solicitudEn(EstadoServicio.COTIZADO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.iniciar(MAESTRO, 10L));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    @Test
    void noSePuedeCotizarDosVeces() {
        solicitudEn(EstadoServicio.COTIZADO);

        assertThrows(ResponseStatusException.class,
                () -> servicio.cotizar(MAESTRO, 10L, new CotizarRequest(30000, null)));
    }

    @Test
    void noSePuedeCancelarUnTrabajoYaIniciado() {
        solicitudEn(EstadoServicio.EN_CURSO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.cancelar(CLIENTE, 10L, "me arrepentí"));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    // --- Cancelación y disputa ---

    @Test
    void elMaestroPuedeCancelarSinCastigoAntesDeEmpezar() {
        solicitudEn(EstadoServicio.ACEPTADO);

        SolicitudResponse r = servicio.cancelar(MAESTRO, 10L, "Se me cruzó otro trabajo");

        assertEquals(EstadoServicio.CANCELADO, r.estado());
        assertEquals("Se me cruzó otro trabajo", r.motivoCancelacion());
    }

    @Test
    void elClienteRechazaLaCotizacionYQuedaCancelada() {
        solicitudEn(EstadoServicio.COTIZADO);

        assertEquals(EstadoServicio.CANCELADO, servicio.rechazarCotizacion(CLIENTE, 10L).estado());
    }

    @Test
    void seAbreDisputaDesdeTrabajoEnCurso() {
        solicitudEn(EstadoServicio.EN_CURSO);

        assertEquals(EstadoServicio.EN_DISPUTA, servicio.abrirDisputa(CLIENTE, 10L, "No llegó").estado());
    }

    @Test
    void elMaestroTambienPuedeAbrirDisputa() {
        solicitudEn(EstadoServicio.EN_CURSO);

        assertEquals(EstadoServicio.EN_DISPUTA,
                servicio.abrirDisputa(MAESTRO, 10L, "El cliente no estaba en el domicilio").estado());
    }

    // --- Mediación del admin (Hito 7) ---

    @Test
    void adminResuelveDisputaAFavorDelClienteYSeAnula() {
        solicitudEn(EstadoServicio.EN_DISPUTA);

        SolicitudResponse r = servicio.resolverDisputa(10L, true, "El trabajo no se realizó");

        assertEquals(EstadoServicio.CANCELADO, r.estado());
        assertEquals("El trabajo no se realizó", r.resolucionDisputa());
    }

    @Test
    void adminResuelveDisputaAFavorDelMaestroYElServicioSeDaPorBueno() {
        solicitudEn(EstadoServicio.EN_DISPUTA);

        SolicitudResponse r = servicio.resolverDisputa(10L, false, null);

        assertEquals(EstadoServicio.COMPLETADO, r.estado());
        assertEquals("Resuelta a favor del maestro", r.resolucionDisputa());
    }

    @Test
    void laRespuestaIndicaSiElUsuarioYaCalifico() {
        Solicitud pagada = solicitudEn(EstadoServicio.PAGADO);
        when(solicitudes.findByClienteIdOrderByFechaCreacionDesc(CLIENTE)).thenReturn(List.of(pagada));
        when(cotizaciones.findBySolicitudIdIn(any())).thenReturn(List.of());
        // El cliente ya dejó su calificación en la solicitud 10.
        when(calificaciones.findBySolicitudIdInAndAutorId(any(), eq(CLIENTE)))
                .thenReturn(List.of(new cl.chasquiya.maestros.calificaciones.Calificacion(
                        10L, CLIENTE, MAESTRO, (short) 5, null, null, null, null)));

        SolicitudResponse r = servicio.misSolicitudesComoCliente(CLIENTE).get(0);

        // Así la app sabe que NO debe ofrecer calificar de nuevo.
        assertTrue(r.yaCalifique());
    }

    @Test
    void siNoHaCalificadoLaRespuestaLoIndica() {
        Solicitud pagada = solicitudEn(EstadoServicio.PAGADO);
        when(solicitudes.findByClienteIdOrderByFechaCreacionDesc(CLIENTE)).thenReturn(List.of(pagada));
        when(cotizaciones.findBySolicitudIdIn(any())).thenReturn(List.of());
        when(calificaciones.findBySolicitudIdInAndAutorId(any(), eq(CLIENTE))).thenReturn(List.of());

        assertFalse(servicio.misSolicitudesComoCliente(CLIENTE).get(0).yaCalifique());
    }

    @Test
    void noSePuedeResolverUnaSolicitudSinDisputa() {
        solicitudEn(EstadoServicio.EN_CURSO);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.resolverDisputa(10L, true, "sin disputa"));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }
}
