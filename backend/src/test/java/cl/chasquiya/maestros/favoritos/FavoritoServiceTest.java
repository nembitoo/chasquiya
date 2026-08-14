package cl.chasquiya.maestros.favoritos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;

class FavoritoServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;

    private final FavoritoRepository favoritos = mock(FavoritoRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final DescubrimientoService descubrimiento = mock(DescubrimientoService.class);

    private final FavoritoService servicio =
            new FavoritoService(favoritos, perfiles, descubrimiento);

    private void maestroAprobado() {
        PerfilMaestro p = new PerfilMaestro(MAESTRO);
        p.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.of(p));
    }

    @Test
    void alternarGuardaCuandoNoEstaba() {
        maestroAprobado();
        when(favoritos.findByClienteIdAndMaestroId(CLIENTE, MAESTRO)).thenReturn(Optional.empty());

        assertTrue(servicio.alternar(CLIENTE, MAESTRO));
        verify(favoritos).save(any(Favorito.class));
    }

    @Test
    void alternarQuitaCuandoYaEstaba() {
        maestroAprobado();
        Favorito existente = new Favorito(CLIENTE, MAESTRO);
        when(favoritos.findByClienteIdAndMaestroId(CLIENTE, MAESTRO)).thenReturn(Optional.of(existente));

        assertFalse(servicio.alternar(CLIENTE, MAESTRO));
        verify(favoritos).delete(existente);
        verify(favoritos, never()).save(any());
    }

    @Test
    void noSePuedeGuardarUnMaestroNoAprobado() {
        // Perfil pendiente (estado por defecto).
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.of(new PerfilMaestro(MAESTRO)));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.alternar(CLIENTE, MAESTRO));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
    }

    @Test
    void nadieSeGuardaASiMismo() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.alternar(CLIENTE, CLIENTE));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    @Test
    void listarPideLasFichasAlDescubrimiento() {
        when(favoritos.findByClienteIdOrderByFechaCreacionDesc(CLIENTE))
                .thenReturn(List.of(new Favorito(CLIENTE, MAESTRO)));
        when(descubrimiento.fichasDe(any(), any(), any())).thenReturn(List.of());

        servicio.listar(CLIENTE);

        verify(descubrimiento).fichasDe(List.of(MAESTRO), CLIENTE, java.util.Map.of());
    }
}
