package cl.chasquiya.maestros.descubrimiento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.MaestroCercanoProjection;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.usuarios.RolUsuario;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class DescubrimientoServiceTest {

    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final DescubrimientoService servicio = new DescubrimientoService(perfiles, usuarios);

    private MaestroCercanoProjection proj(long id, double metros) {
        MaestroCercanoProjection p = mock(MaestroCercanoProjection.class);
        when(p.getUsuarioId()).thenReturn(id);
        when(p.getDistanciaM()).thenReturn(metros);
        return p;
    }

    private Usuario usuario(long id, String nombre) {
        Usuario u = new Usuario(nombre, "Apellido", nombre + "@test.cl", "+56900000000",
                "hash", RolUsuario.MAESTRO, true);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private PerfilMaestro perfilAprobado(long usuarioId) {
        PerfilMaestro p = new PerfilMaestro(usuarioId);
        p.setOficios(Set.of(Oficio.PINTURA));
        p.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        return p;
    }

    @Test
    void buscarMapeaOrdenYConvierteADistanciaEnKm() {
        MaestroCercanoProjection r1 = proj(1L, 1500.0);
        MaestroCercanoProjection r2 = proj(2L, 3200.0);
        when(perfiles.buscarCercanos(anyDouble(), anyDouble(), anyDouble())).thenReturn(List.of(r1, r2));
        when(perfiles.findByUsuarioIdIn(any())).thenReturn(List.of(perfilAprobado(1L), perfilAprobado(2L)));
        when(usuarios.findAllById(any())).thenReturn(List.of(usuario(1L, "Ana"), usuario(2L, "Luis")));

        List<MaestroCercanoResponse> res = servicio.buscar(-33.4, -70.6, 25.0, null);

        assertEquals(2, res.size());
        assertEquals(1L, res.get(0).usuarioId());
        assertEquals("Ana", res.get(0).nombre());
        assertEquals(1.5, res.get(0).distanciaKm());
        assertEquals(3.2, res.get(1).distanciaKm());
    }

    @Test
    void buscarSinResultadosDevuelveListaVacia() {
        when(perfiles.buscarCercanos(anyDouble(), anyDouble(), anyDouble())).thenReturn(List.of());

        assertTrue(servicio.buscar(-33.4, -70.6, null, null).isEmpty());
    }

    @Test
    void perfilPublicoDeMaestroNoAprobadoLanza404() {
        // Perfil recién creado: estado PENDIENTE por defecto.
        when(perfiles.findByUsuarioId(7L)).thenReturn(Optional.of(new PerfilMaestro(7L)));

        assertThrows(ResponseStatusException.class, () -> servicio.obtenerPublico(7L));
    }
}
