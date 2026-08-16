package cl.chasquiya.maestros.catalogo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.catalogo.dto.ServicioRequest;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;

/**
 * Catálogo de servicios del maestro.
 *
 * Lo que estos tests protegen: que nadie publique precios de un oficio que no
 * tiene, y que un servicio pausado no se pueda pedir.
 */
class CatalogoServiceTest {

    private static final Long MAESTRO = 2L;

    private final ServicioMaestroRepository servicios = mock(ServicioMaestroRepository.class);
    private final PerfilMaestroRepository perfiles = mock(PerfilMaestroRepository.class);

    private final CatalogoService servicio = new CatalogoService(servicios, perfiles);

    private final ServicioRequest enchufe = new ServicioRequest(Oficio.ELECTRICIDAD,
            "Cambio de enchufe", "Incluye el enchufe", 25000, true, "por punto");

    private void conPerfilDe(Oficio... oficios) {
        PerfilMaestro p = new PerfilMaestro(MAESTRO);
        p.setOficios(Set.of(oficios));
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.of(p));
    }

    private ServicioMaestro guardado(boolean activo) {
        ServicioMaestro s = new ServicioMaestro(MAESTRO, Oficio.ELECTRICIDAD, "Cambio de enchufe",
                null, 25000, true, null);
        s.setActivo(activo);
        when(servicios.findByIdAndMaestroId(7L, MAESTRO)).thenReturn(Optional.of(s));
        return s;
    }

    // --- Publicar ---

    @Test
    void elMaestroPublicaUnServicioDeSuOficio() {
        conPerfilDe(Oficio.ELECTRICIDAD);

        var r = servicio.crear(MAESTRO, enchufe);

        assertEquals(25000, r.precio().intValue());
        assertThat(r.precioFijo()).isTrue();
        assertThat(r.activo()).isTrue();
    }

    @Test
    void noSePublicaUnOficioQueNoEstaEnElPerfil() {
        // Es gasfíter, no electricista: publicar electricidad sería ofrecer algo
        // en lo que nadie lo verificó.
        conPerfilDe(Oficio.GASFITERIA);

        assertThatThrownBy(() -> servicio.crear(MAESTRO, enchufe))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void sinPerfilDeMaestroNoSePublicaNada() {
        when(perfiles.findByUsuarioId(MAESTRO)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.crear(MAESTRO, enchufe))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void hayUnTopeDeServiciosPublicados() {
        conPerfilDe(Oficio.ELECTRICIDAD);
        when(servicios.countByMaestroId(MAESTRO)).thenReturn(30L);

        assertThatThrownBy(() -> servicio.crear(MAESTRO, enchufe))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    // --- Pausar ---

    @Test
    void pausarNoBorraLoEscrito() {
        ServicioMaestro s = guardado(true);

        assertThat(servicio.alternar(MAESTRO, 7L).activo()).isFalse();
        assertThat(s.getTitulo()).isEqualTo("Cambio de enchufe");
    }

    // --- Pedirlo ---

    @Test
    void unServicioPausadoNoSePuedePedir() {
        guardado(false);

        assertThatThrownBy(() -> servicio.paraSolicitar(7L, MAESTRO))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void noSePuedePedirElServicioDeOtroMaestro() {
        // El repositorio filtra por dueño: pedirlo con otro id no devuelve nada.
        when(servicios.findByIdAndMaestroId(7L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.paraSolicitar(7L, 99L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
