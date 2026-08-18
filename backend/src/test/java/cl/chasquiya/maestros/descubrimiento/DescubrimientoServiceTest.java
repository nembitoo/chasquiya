package cl.chasquiya.maestros.descubrimiento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.CalificacionService;
import cl.chasquiya.maestros.catalogo.CatalogoService;
import cl.chasquiya.maestros.catalogo.ServicioMaestro;
import cl.chasquiya.maestros.favoritos.FavoritoRepository;
import cl.chasquiya.maestros.calificaciones.dto.ReputacionResponse;
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
    private final CalificacionService calificaciones = mock(CalificacionService.class);
    private final FavoritoRepository favoritos = mock(FavoritoRepository.class);
    private final cl.chasquiya.maestros.solicitudes.SolicitudRepository solicitudes =
            mock(cl.chasquiya.maestros.solicitudes.SolicitudRepository.class);
    private final CatalogoService catalogo = mock(CatalogoService.class);
    private final DescubrimientoService servicio =
            new DescubrimientoService(perfiles, usuarios, calificaciones, favoritos, solicitudes, catalogo);

    /** Un servicio publicado, como el que ahora se exige para aparecer. */
    private ServicioMaestro publicado(long maestroId, Oficio oficio, int precio, boolean fijo, String titulo) {
        return new ServicioMaestro(maestroId, oficio, titulo, null, precio, fijo, null);
    }

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
        // Ana tiene reputación; Luis todavía no.
        when(favoritos.findByClienteIdOrderByFechaCreacionDesc(any())).thenReturn(List.of());
        when(calificaciones.reputacionesDe(any()))
                .thenReturn(Map.of(1L, new ReputacionResponse(4.7, 3)));

        List<MaestroCercanoResponse> res = servicio.buscar(-33.4, -70.6, 25.0, null, null, null, null, null);

        assertEquals(2, res.size());
        assertEquals(1L, res.get(0).usuarioId());
        assertEquals("Ana", res.get(0).nombre());
        assertEquals(1.5, res.get(0).distanciaKm());
        assertEquals(3.2, res.get(1).distanciaKm());
        assertEquals(4.7, res.get(0).calificacionPromedio());
        assertEquals(3, res.get(0).cantidadCalificaciones());
        assertEquals(0, res.get(1).calificacionPromedio(), "sin calificaciones -> 0");
    }

    /**
     * El corazón del modelo: la tarjeta muestra el precio del oficio que el
     * cliente está filtrando. Si cambia de gasfitería a electricidad, cambia el
     * precio y el servicio al que corresponde.
     */
    @Test
    void elPrecioDeLaTarjetaSigueAlOficioFiltrado() {
        // proj() hace stubbing por dentro: se arma antes, no dentro del when().
        MaestroCercanoProjection ana = proj(1L, 1000.0);
        when(perfiles.buscarCercanosPorOficio(anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(List.of(ana));
        when(perfiles.findByUsuarioIdIn(any())).thenReturn(List.of(perfilAprobado(1L)));
        when(usuarios.findAllById(any())).thenReturn(List.of(usuario(1L, "Ana")));
        when(calificaciones.reputacionesDe(any())).thenReturn(Map.of());
        when(favoritos.findByClienteIdOrderByFechaCreacionDesc(any())).thenReturn(List.of());
        when(catalogo.masBaratoPorMaestro(any(), eq(Oficio.GASFITERIA)))
                .thenReturn(Map.of(1L, publicado(1L, Oficio.GASFITERIA, 40000, false, "Destape")));
        when(catalogo.masBaratoPorMaestro(any(), eq(Oficio.ELECTRICIDAD)))
                .thenReturn(Map.of(1L, publicado(1L, Oficio.ELECTRICIDAD, 12000, true, "Revisión")));

        MaestroCercanoResponse conGasfiteria =
                servicio.buscar(-33.4, -70.6, null, Oficio.GASFITERIA, null, null, null, null).get(0);
        MaestroCercanoResponse conElectricidad =
                servicio.buscar(-33.4, -70.6, null, Oficio.ELECTRICIDAD, null, null, null, null).get(0);

        assertEquals(40000, conGasfiteria.precio().intValue());
        assertEquals("Destape", conGasfiteria.precioServicio());
        assertFalse(conGasfiteria.precioFijo(), "el destape es un 'desde'");

        assertEquals(12000, conElectricidad.precio().intValue());
        assertEquals("Revisión", conElectricidad.precioServicio());
        assertTrue(conElectricidad.precioFijo());
    }

    /** El filtro de precio máximo mira lo que publicó, no un número general. */
    @Test
    void elPrecioMaximoFiltraPorElPrecioDelCatalogo() {
        MaestroCercanoProjection barato = proj(1L, 1000.0);
        MaestroCercanoProjection caro = proj(2L, 2000.0);
        when(perfiles.buscarCercanos(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(barato, caro));
        when(perfiles.findByUsuarioIdIn(any())).thenReturn(List.of(perfilAprobado(1L), perfilAprobado(2L)));
        when(usuarios.findAllById(any())).thenReturn(List.of(usuario(1L, "Ana"), usuario(2L, "Luis")));
        when(calificaciones.reputacionesDe(any())).thenReturn(Map.of());
        when(favoritos.findByClienteIdOrderByFechaCreacionDesc(any())).thenReturn(List.of());
        when(catalogo.masBaratoPorMaestro(any(), any())).thenReturn(Map.of(
                1L, publicado(1L, Oficio.PINTURA, 15000, true, "Barato"),
                2L, publicado(2L, Oficio.PINTURA, 90000, true, "Caro")));

        List<MaestroCercanoResponse> res =
                servicio.buscar(-33.4, -70.6, null, null, null, 20000, null, null);

        assertEquals(1, res.size());
        assertEquals(1L, res.get(0).usuarioId());
    }

    @Test
    void buscarSinResultadosDevuelveListaVacia() {
        when(perfiles.buscarCercanos(anyDouble(), anyDouble(), anyDouble())).thenReturn(List.of());

        assertTrue(servicio.buscar(-33.4, -70.6, null, null, null, null, null, null).isEmpty());
    }

    @Test
    void perfilPublicoDeMaestroNoAprobadoLanza404() {
        // Perfil recién creado: estado PENDIENTE por defecto.
        when(perfiles.findByUsuarioId(7L)).thenReturn(Optional.of(new PerfilMaestro(7L)));

        assertThrows(ResponseStatusException.class, () -> servicio.obtenerPublico(7L, null));
    }
}
