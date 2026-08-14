package cl.chasquiya.maestros.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    private final AdminService servicio =
            new AdminService(usuarios, perfiles, solicitudes, pagos, calificaciones);

    private Usuario usuario(long id, RolUsuario rol) {
        Usuario u = new Usuario("N" + id, "A", "u" + id + "@test.cl", "+56900000000",
                "hash", rol, true);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private Solicitud solicitud(long id, EstadoServicio estado) {
        Solicitud s = new Solicitud(1L, 2L, Oficio.PINTURA, "d", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", id);
        s.setEstado(estado);
        return s;
    }

    @Test
    void metricasResumenLaPlataforma() {
        when(usuarios.findAll()).thenReturn(List.of(
                usuario(1L, RolUsuario.CLIENTE), usuario(2L, RolUsuario.MAESTRO), usuario(3L, RolUsuario.ADMIN)));
        PerfilMaestro aprobado = new PerfilMaestro(2L);
        aprobado.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        when(perfiles.findAll()).thenReturn(List.of(aprobado, new PerfilMaestro(4L)));
        when(solicitudes.findAll()).thenReturn(List.of(
                solicitud(10L, EstadoServicio.PAGADO),
                solicitud(11L, EstadoServicio.EN_DISPUTA),
                solicitud(12L, EstadoServicio.SOLICITADO)));
        when(pagos.findAll()).thenReturn(List.of(new Pago(10L, CalculadoraComision.repartir(30000, 10))));
        when(calificaciones.findAll()).thenReturn(List.of(
                new Calificacion(10L, 1L, 2L, (short) 5, null, null, null, null),
                new Calificacion(10L, 2L, 1L, (short) 4, null, null, null, null)));

        MetricasResponse m = servicio.metricas();

        assertEquals(3, m.usuariosTotales());
        assertEquals(1, m.clientes());
        assertEquals(1, m.maestros());
        assertEquals(1, m.maestrosAprobados());
        assertEquals(1, m.maestrosPendientes());
        assertEquals(3, m.serviciosTotales());
        assertEquals(1, m.disputasAbiertas());
        assertEquals(30000, m.montoTransado());
        assertEquals(3000, m.comisionesAcumuladas(), "la plataforma acumula el 10%");
        assertEquals(4.5, m.calificacionPromedio());
        assertEquals(1L, m.serviciosPorEstado().get("PAGADO"));
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
