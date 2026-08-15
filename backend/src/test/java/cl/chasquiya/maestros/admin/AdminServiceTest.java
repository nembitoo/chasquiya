package cl.chasquiya.maestros.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.admin.dto.Alerta;
import cl.chasquiya.maestros.admin.dto.MetricasResponse;
import cl.chasquiya.maestros.calificaciones.Calificacion;
import cl.chasquiya.maestros.calificaciones.CalificacionRepository;
import cl.chasquiya.maestros.pagos.CalculadoraComision;
import cl.chasquiya.maestros.pagos.Pago;
import cl.chasquiya.maestros.pagos.PagoRepository;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.RolUsuario;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class AdminServiceTest {

    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final PagoRepository pagos = mock(PagoRepository.class);
    private final CalificacionRepository calificaciones = mock(CalificacionRepository.class);

    private final cl.chasquiya.maestros.soporte.SoporteService soporte =
            mock(cl.chasquiya.maestros.soporte.SoporteService.class);

    private final AdminService servicio =
            new AdminService(usuarios, perfiles, solicitudes, pagos, calificaciones, soporte);

    private Usuario usuario(long id, RolUsuario rol) {
        Usuario u = new Usuario("N" + id, "A", "u" + id + "@test.cl", "+56900000000",
                "hash", rol, true);
        ReflectionTestUtils.setField(u, "id", id);
        ReflectionTestUtils.setField(u, "fechaCreacion", Instant.now().minus(1, ChronoUnit.DAYS));
        return u;
    }

    /** @param haceDias antigüedad de la solicitud (0 = hoy) */
    private Solicitud solicitud(long id, EstadoServicio estado, long haceDias) {
        Solicitud s = new Solicitud(1L, 2L, Oficio.PINTURA, "d", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", id);
        s.setEstado(estado);
        Instant fecha = Instant.now().minus(haceDias, ChronoUnit.DAYS);
        ReflectionTestUtils.setField(s, "fechaCreacion", fecha);
        ReflectionTestUtils.setField(s, "fechaActualizacion", fecha);
        return s;
    }

    private Pago pago(long solicitudId, int monto, long haceDias) {
        Pago p = new Pago(solicitudId, CalculadoraComision.repartir(monto, 10));
        ReflectionTestUtils.setField(p, "fechaCreacion", Instant.now().minus(haceDias, ChronoUnit.DAYS));
        return p;
    }

    private PerfilMaestro perfil(long usuarioId, EstadoVerificacion estado, long haceDias) {
        PerfilMaestro p = new PerfilMaestro(usuarioId);
        p.setEstadoVerificacion(estado);
        ReflectionTestUtils.setField(p, "fechaActualizacion", Instant.now().minus(haceDias, ChronoUnit.DAYS));
        return p;
    }

    @Test
    void metricasResumenLaPlataforma() {
        when(usuarios.findAll()).thenReturn(List.of(
                usuario(1L, RolUsuario.CLIENTE), usuario(2L, RolUsuario.MAESTRO), usuario(3L, RolUsuario.ADMIN)));
        when(perfiles.findAll()).thenReturn(List.of(
                perfil(2L, EstadoVerificacion.APROBADO, 0),
                perfil(4L, EstadoVerificacion.PENDIENTE, 0)));
        when(solicitudes.findAll()).thenReturn(List.of(
                solicitud(10L, EstadoServicio.PAGADO, 1),
                solicitud(11L, EstadoServicio.EN_DISPUTA, 1),
                solicitud(12L, EstadoServicio.SOLICITADO, 1)));
        when(pagos.findAll()).thenReturn(List.of(pago(10L, 30000, 1)));
        when(calificaciones.findAll()).thenReturn(List.of(
                new Calificacion(10L, 1L, 2L, (short) 5, null, null, null, null),
                new Calificacion(10L, 2L, 1L, (short) 4, null, null, null, null)));

        MetricasResponse m = servicio.metricas(30);

        assertEquals(3, m.usuariosTotales());
        assertEquals(1, m.clientes());
        assertEquals(1, m.maestros());
        assertEquals(1, m.maestrosAprobados());
        assertEquals(1, m.maestrosPendientes());
        assertEquals(1, m.disputasAbiertas());
        assertEquals(3, m.serviciosCreados().actual());
        assertEquals(30000, m.montoTransado().actual());
        assertEquals(3000, m.comisiones().actual(), "la plataforma acumula el 10%");
        assertEquals(4.5, m.calificacionPromedio());
        assertEquals(1L, m.serviciosPorEstado().get("PAGADO"));
        assertEquals(30, m.serie().size(), "un punto por dia, incluidos los vacios");
    }

    @Test
    void elPeriodoDejaFueraLoAnteriorYLoCompara() {
        when(usuarios.findAll()).thenReturn(List.of());
        when(perfiles.findAll()).thenReturn(List.of());
        when(calificaciones.findAll()).thenReturn(List.of());
        when(solicitudes.findAll()).thenReturn(List.of(
                // Dentro de los ultimos 7 dias
                solicitud(10L, EstadoServicio.SOLICITADO, 1),
                solicitud(11L, EstadoServicio.SOLICITADO, 2),
                solicitud(12L, EstadoServicio.SOLICITADO, 3),
                solicitud(13L, EstadoServicio.SOLICITADO, 4),
                // En los 7 dias anteriores a esos
                solicitud(14L, EstadoServicio.SOLICITADO, 9),
                solicitud(15L, EstadoServicio.SOLICITADO, 10),
                // Mas viejo que ambos periodos: no cuenta en ninguno
                solicitud(16L, EstadoServicio.SOLICITADO, 40)));
        when(pagos.findAll()).thenReturn(List.of());

        MetricasResponse m = servicio.metricas(7);

        assertEquals(4, m.serviciosCreados().actual());
        assertEquals(2, m.serviciosCreados().anterior());
        assertEquals(100.0, m.serviciosCreados().variacion(), "de 2 a 4 es el doble");
    }

    @Test
    void sinPeriodoAnteriorNoSeInventaUnPorcentaje() {
        when(usuarios.findAll()).thenReturn(List.of());
        when(perfiles.findAll()).thenReturn(List.of());
        when(calificaciones.findAll()).thenReturn(List.of());
        when(pagos.findAll()).thenReturn(List.of());
        when(solicitudes.findAll()).thenReturn(List.of(solicitud(10L, EstadoServicio.SOLICITADO, 1)));

        MetricasResponse m = servicio.metricas(7);

        assertEquals(1, m.serviciosCreados().actual());
        assertEquals(0, m.serviciosCreados().anterior());
        assertNull(m.serviciosCreados().variacion(), "no se puede medir el crecimiento desde cero");
    }

    @Test
    void lasAlertasAvisanLoQueLlevaDemasiadoEsperando() {
        when(usuarios.findAll()).thenReturn(List.of());
        when(calificaciones.findAll()).thenReturn(List.of());
        when(pagos.findAll()).thenReturn(List.of());
        when(perfiles.findAll()).thenReturn(List.of(
                perfil(4L, EstadoVerificacion.PENDIENTE, 10),  // lleva 10 dias esperando
                perfil(5L, EstadoVerificacion.PENDIENTE, 0)));  // recien enviado, no alerta
        when(solicitudes.findAll()).thenReturn(List.of(
                solicitud(11L, EstadoServicio.EN_DISPUTA, 20),
                solicitud(12L, EstadoServicio.COTIZADO, 30)));

        List<Alerta> alertas = servicio.metricas(30).alertas();

        assertEquals(3, alertas.size());
        assertEquals(1, alertas.stream().filter(a -> a.tipo().equals("verificacion")).findFirst().orElseThrow().cantidad());
        assertTrue(alertas.stream().anyMatch(a -> a.tipo().equals("disputa")));
        assertTrue(alertas.stream().anyMatch(a -> a.tipo().equals("cotizacion")));
    }

    @Test
    void sinNadaPendienteNoHayAlertas() {
        when(usuarios.findAll()).thenReturn(List.of());
        when(calificaciones.findAll()).thenReturn(List.of());
        when(pagos.findAll()).thenReturn(List.of());
        when(perfiles.findAll()).thenReturn(List.of(perfil(4L, EstadoVerificacion.APROBADO, 30)));
        when(solicitudes.findAll()).thenReturn(List.of(solicitud(10L, EstadoServicio.PAGADO, 30)));

        assertTrue(servicio.metricas(30).alertas().isEmpty());
    }

    @Test
    void suspenderDesactivaLaCuenta() {
        Usuario u = usuario(5L, RolUsuario.MAESTRO);
        when(usuarios.findById(5L)).thenReturn(Optional.of(u));

        var r = servicio.cambiarActivo(1L, 5L, false);

        assertFalse(r.activo());
        assertFalse(u.isActivo());
        verify(usuarios).save(u);
    }

    @Test
    void elAdminNoPuedeSuspenderseASiMismo() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.cambiarActivo(1L, 1L, false));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
