package cl.chasquiya.maestros.notificaciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Limit;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.notificaciones.dto.BandejaResponse;

class NotificacionServiceTest {

    private static final Long USUARIO = 1L;
    private static final Long OTRO = 2L;

    private final NotificacionRepository repo = mock(NotificacionRepository.class);
    private final NotificacionService servicio = new NotificacionService(repo);

    private Notificacion notificacionDe(Long usuarioId) {
        Notificacion n = new Notificacion(usuarioId, TipoNotificacion.PAGO_RECIBIDO, "t", "c", 10L);
        ReflectionTestUtils.setField(n, "id", 5L);
        return n;
    }

    @Test
    void avisar_guarda_el_texto_ya_redactado() {
        servicio.avisar(USUARIO, TipoNotificacion.COTIZACION_RECIBIDA, 10L, "Pedro");

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repo).save(captor.capture());

        Notificacion guardada = captor.getValue();
        assertThat(guardada.getUsuarioId()).isEqualTo(USUARIO);
        assertThat(guardada.getTitulo()).isEqualTo("Recibiste una cotización");
        assertThat(guardada.getCuerpo()).startsWith("Pedro");
        assertThat(guardada.getSolicitudId()).isEqualTo(10L);
        assertThat(guardada.isLeida()).isFalse();
    }

    /** Regla clave: un fallo al avisar no puede tumbar la acción que lo originó. */
    @Test
    void avisar_no_propaga_errores() {
        when(repo.save(any())).thenThrow(new RuntimeException("base de datos caída"));

        assertThatCode(() -> servicio.avisar(USUARIO, TipoNotificacion.PAGO_RECIBIDO, 10L, "$1.000"))
                .doesNotThrowAnyException();
    }

    @Test
    void avisar_sin_destinatario_no_hace_nada() {
        servicio.avisar(null, TipoNotificacion.PAGO_RECIBIDO, 10L, "$1.000");

        verify(repo, never()).save(any());
    }

    @Test
    void bandeja_devuelve_historial_y_contador() {
        when(repo.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO, Limit.of(50)))
                .thenReturn(List.of(notificacionDe(USUARIO)));
        when(repo.countByUsuarioIdAndLeidaFalse(USUARIO)).thenReturn(3L);

        BandejaResponse bandeja = servicio.bandeja(USUARIO);

        assertThat(bandeja.notificaciones()).hasSize(1);
        assertThat(bandeja.noLeidas()).isEqualTo(3L);
    }

    @Test
    void no_se_puede_leer_la_notificacion_de_otro() {
        when(repo.findById(5L)).thenReturn(Optional.of(notificacionDe(OTRO)));

        assertThatThrownBy(() -> servicio.marcarLeida(USUARIO, 5L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    @Test
    void marcar_todas_devuelve_cuantas_se_marcaron() {
        when(repo.findByUsuarioIdAndLeidaFalse(USUARIO))
                .thenReturn(List.of(notificacionDe(USUARIO), notificacionDe(USUARIO)));

        assertThat(servicio.marcarTodasLeidas(USUARIO)).isEqualTo(2);
    }
}
