package cl.chasquiya.maestros.perfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroRequest;
import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroResponse;

class PerfilMaestroServiceTest {

    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);
    private final PerfilMaestroService servicio = new PerfilMaestroService(perfiles);

    private PerfilMaestroRequest requestValido() {
        return new PerfilMaestroRequest(
                Set.of(Oficio.ELECTRICIDAD, Oficio.REPARACIONES),
                "Electricista con 5 años de experiencia",
                5, 25000, "Maipú", -33.51, -70.75);
    }

    @Test
    void creaPerfilNuevoComoPendiente() {
        when(perfiles.findByUsuarioId(10L)).thenReturn(Optional.empty());

        PerfilMaestroResponse resp = servicio.guardar(10L, requestValido());

        assertEquals(EstadoVerificacion.PENDIENTE, resp.estadoVerificacion());
        assertEquals(10L, resp.usuarioId());
        assertTrue(resp.oficios().contains(Oficio.ELECTRICIDAD));
        assertEquals(5, resp.aniosExperiencia());
        verify(perfiles).save(any(PerfilMaestro.class));
    }

    @Test
    void actualizaPerfilExistenteConservandoEstado() {
        PerfilMaestro existente = new PerfilMaestro(10L);
        existente.setEstadoVerificacion(EstadoVerificacion.APROBADO);
        when(perfiles.findByUsuarioId(10L)).thenReturn(Optional.of(existente));

        PerfilMaestroResponse resp = servicio.guardar(10L, requestValido());

        // Editar el perfil no cambia el estado de verificación (eso lo maneja el admin).
        assertEquals(EstadoVerificacion.APROBADO, resp.estadoVerificacion());
        assertEquals("Maipú", resp.zonaCobertura());
    }

    @Test
    void obtenerSinPerfilLanza404() {
        when(perfiles.findByUsuarioId(99L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> servicio.obtenerPorUsuario(99L));
    }

    @Test
    void aprobarCambiaEstadoAAprobado() {
        PerfilMaestro pendiente = new PerfilMaestro(10L);
        when(perfiles.findByUsuarioId(10L)).thenReturn(Optional.of(pendiente));

        PerfilMaestroResponse resp = servicio.cambiarEstado(10L, EstadoVerificacion.APROBADO);

        assertEquals(EstadoVerificacion.APROBADO, resp.estadoVerificacion());
        verify(perfiles).save(pendiente);
    }

    @Test
    void cambiarEstadoSinPerfilLanza404() {
        when(perfiles.findByUsuarioId(50L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class,
                () -> servicio.cambiarEstado(50L, EstadoVerificacion.APROBADO));
    }
}
