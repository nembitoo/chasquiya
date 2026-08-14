package cl.chasquiya.maestros.solicitudes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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

    private final SolicitudService servicio =
            new SolicitudService(solicitudes, cotizaciones, perfiles, usuarios);

    @BeforeEach
    void setUp() {
        when(usuarios.findAllById(any())).thenReturn(List.of());
        when(cotizaciones.findBySolicitudId(any())).thenReturn(Optional.empty());
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
}
