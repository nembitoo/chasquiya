package cl.chasquiya.maestros.soporte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.soporte.dto.CrearTicketRequest;
import cl.chasquiya.maestros.soporte.dto.ResponderTicketRequest;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class SoporteServiceTest {

    private static final Long USUARIO = 1L;

    private final TicketSoporteRepository tickets = mock(TicketSoporteRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SoporteService servicio = new SoporteService(tickets, usuarios);

    private TicketSoporte ticket(EstadoTicket estado) {
        TicketSoporte t = new TicketSoporte(USUARIO, CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", null);
        ReflectionTestUtils.setField(t, "id", 7L);
        t.setEstado(estado);
        return t;
    }

    private CrearTicketRequest request() {
        return new CrearTicketRequest(CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", null);
    }

    @Test
    void seCreaEnEstadoNuevo() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of());

        var r = servicio.crear(USUARIO, request());

        assertThat(r.estado()).isEqualTo(EstadoTicket.NUEVO);
        verify(tickets).save(any());
    }

    /** Evita que una sola cuenta llene la bandeja del admin. */
    @Test
    void hayUnTopeDeReclamosAbiertos() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO))
                .thenReturn(IntStream.range(0, 10).mapToObj(i -> ticket(EstadoTicket.NUEVO)).toList());

        assertThatThrownBy(() -> servicio.crear(USUARIO, request()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("sin resolver");

        verify(tickets, never()).save(any());
    }

    /** Los resueltos no cuentan para el tope: ya no ocupan a nadie. */
    @Test
    void losResueltosNoCuentanParaElTope() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO))
                .thenReturn(IntStream.range(0, 10).mapToObj(i -> ticket(EstadoTicket.RESUELTO)).toList());

        servicio.crear(USUARIO, request());

        verify(tickets).save(any());
    }

    @Test
    void noSeCierraUnReclamoSinExplicarPorQue() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.EN_REVISION)));

        assertThatThrownBy(() -> servicio.responder(7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, "  ")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("respuesta");
    }

    @Test
    void unReclamoResueltoNoVuelveAtras() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.responder(7L, new ResponderTicketRequest(EstadoTicket.EN_REVISION, "otra vez")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("No se puede pasar");
    }

    @Test
    void elAdminLoPasaARevisionYLuegoLoCierra() {
        TicketSoporte t = ticket(EstadoTicket.NUEVO);
        when(tickets.findById(7L)).thenReturn(Optional.of(t));

        servicio.responder(7L, new ResponderTicketRequest(EstadoTicket.EN_REVISION, "Lo estamos viendo"));
        assertThat(t.getEstado()).isEqualTo(EstadoTicket.EN_REVISION);

        servicio.responder(7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, "Se devolvio la diferencia"));
        assertThat(t.getEstado()).isEqualTo(EstadoTicket.RESUELTO);
        assertThat(t.getRespuesta()).isEqualTo("Se devolvio la diferencia");
    }

    @Test
    void pendientesSumaNuevosYEnRevision() {
        when(tickets.countByEstado(EstadoTicket.NUEVO)).thenReturn(3L);
        when(tickets.countByEstado(EstadoTicket.EN_REVISION)).thenReturn(2L);

        assertThat(servicio.pendientes()).isEqualTo(5L);
    }
}
