package cl.chasquiya.maestros.solicitudes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.AlmacenamientoMinio;
import cl.chasquiya.maestros.perfiles.Oficio;

class FotoSolicitudServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long INTRUSO = 99L;
    private static final Long SOLICITUD = 10L;

    private final FotoSolicitudRepository fotos = mock(FotoSolicitudRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final AlmacenamientoMinio almacen = mock(AlmacenamientoMinio.class);

    private final FotoSolicitudService servicio = new FotoSolicitudService(fotos, solicitudes, almacen);

    private Solicitud solicitudEn(EstadoServicio estado) {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.GASFITERIA, "gotera", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", SOLICITUD);
        s.setEstado(estado);
        return s;
    }

    private MockMultipartFile imagen() {
        return new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", new byte[] { 1, 2, 3 });
    }

    @BeforeEach
    void setUp() {
        when(solicitudes.findById(SOLICITUD)).thenReturn(java.util.Optional.of(solicitudEn(EstadoServicio.SOLICITADO)));
        when(fotos.findBySolicitudIdOrderByFechaCreacionAsc(SOLICITUD)).thenReturn(List.of());
    }

    @Test
    void elClienteAdjuntaUnaFoto() {
        servicio.subir(CLIENTE, SOLICITUD, imagen());

        verify(almacen).subir(any(), any(), any());
        verify(fotos).save(any());
    }

    @Test
    void elMaestroNoPuedeAdjuntarFotos() {
        assertThatThrownBy(() -> servicio.subir(MAESTRO, SOLICITUD, imagen()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(fotos, never()).save(any());
    }

    /** El maestro necesita verlas para cotizar bien. */
    @Test
    void ambasPartesPuedenVerLasFotos() {
        assertThatCode(() -> servicio.listar(CLIENTE, SOLICITUD)).doesNotThrowAnyException();
        assertThatCode(() -> servicio.listar(MAESTRO, SOLICITUD)).doesNotThrowAnyException();
    }

    @Test
    void unExtranoNoVeLasFotos() {
        assertThatThrownBy(() -> servicio.listar(INTRUSO, SOLICITUD))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    @Test
    void soloSeAceptanImagenes() {
        MockMultipartFile pdf = new MockMultipartFile("archivo", "boleta.pdf", "application/pdf", new byte[] { 1 });

        assertThatThrownBy(() -> servicio.subir(CLIENTE, SOLICITUD, pdf))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("imágenes");
    }

    @Test
    void hayUnTopeDeFotosPorSolicitud() {
        when(fotos.countBySolicitudId(SOLICITUD)).thenReturn(5L);

        ResponseStatusException e = (ResponseStatusException) org.assertj.core.api.Assertions
                .catchThrowable(() -> servicio.subir(CLIENTE, SOLICITUD, imagen()));

        assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        verify(fotos, never()).save(any());
    }

    /** Cambiar las fotos de un trabajo cerrado alteraria la evidencia de lo acordado. */
    @Test
    void noSeTocanLasFotosDeUnServicioCerrado() {
        when(solicitudes.findById(SOLICITUD)).thenReturn(java.util.Optional.of(solicitudEn(EstadoServicio.PAGADO)));

        assertThatThrownBy(() -> servicio.subir(CLIENTE, SOLICITUD, imagen()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cerrado");
    }
}
