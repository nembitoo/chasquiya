package cl.chasquiya.maestros.soporte;

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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.AlmacenamientoMinio;

class FotoTicketServiceTest {

    private static final Long AUTOR = 1L;
    private static final Long INTRUSO = 99L;
    private static final Long TICKET = 10L;

    private final FotoTicketRepository fotos = mock(FotoTicketRepository.class);
    private final TicketSoporteRepository tickets = mock(TicketSoporteRepository.class);
    private final AlmacenamientoMinio almacen = mock(AlmacenamientoMinio.class);

    private final FotoTicketService servicio = new FotoTicketService(fotos, tickets, almacen);

    private TicketSoporte ticketEn(EstadoTicket estado) {
        TicketSoporte t = new TicketSoporte(AUTOR, CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", null);
        ReflectionTestUtils.setField(t, "id", TICKET);
        t.setEstado(estado);
        return t;
    }

    private MockMultipartFile imagen() {
        return new MockMultipartFile("archivo", "boleta.jpg", "image/jpeg", new byte[] { 1, 2, 3 });
    }

    @BeforeEach
    void setUp() {
        when(tickets.findById(TICKET)).thenReturn(Optional.of(ticketEn(EstadoTicket.NUEVO)));
        when(fotos.findByTicketIdOrderByFechaCreacionAsc(TICKET)).thenReturn(List.of());
    }

    @Test
    void quienReclamaAdjuntaUnaEvidencia() {
        servicio.subir(AUTOR, TICKET, imagen());

        verify(almacen).subir(any(), any(), any());
        verify(fotos).save(any());
    }

    /** Un reclamo puede traer una boleta o una conversación privada. */
    @Test
    void unTerceroNoVeLasEvidencias() {
        assertThatThrownBy(() -> servicio.listar(INTRUSO, TICKET))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    @Test
    void unTerceroNoPuedeAdjuntar() {
        assertThatThrownBy(() -> servicio.subir(INTRUSO, TICKET, imagen()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(fotos, never()).save(any());
    }

    /** El admin es quien tiene que resolverlo: las ve sin ser el autor. */
    @Test
    void elAdminVeLasEvidenciasDeCualquierReclamo() {
        assertThatCode(() -> servicio.listarComoAdmin(TICKET)).doesNotThrowAnyException();
    }

    /**
     * Cambiar las evidencias después de la respuesta alteraría aquello sobre lo
     * que el admin ya se pronunció.
     */
    @Test
    void unReclamoResueltoNoAceptaMasEvidencias() {
        when(tickets.findById(TICKET)).thenReturn(Optional.of(ticketEn(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.subir(AUTOR, TICKET, imagen()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cerrado");

        verify(fotos, never()).save(any());
    }

    @Test
    void tampocoSeBorranLasDeUnReclamoResuelto() {
        when(tickets.findById(TICKET)).thenReturn(Optional.of(ticketEn(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.eliminar(AUTOR, TICKET, 5L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cerrado");

        verify(fotos, never()).delete(any());
    }

    /** Mientras siga abierto, quien reclama puede corregir lo que adjuntó. */
    @Test
    void enUnReclamoAbiertoElAutorBorraSuEvidencia() {
        FotoTicket foto = new FotoTicket(TICKET, "reclamos/10/abc", "image/jpeg");
        when(fotos.findByIdAndTicketId(5L, TICKET)).thenReturn(Optional.of(foto));

        servicio.eliminar(AUTOR, TICKET, 5L);

        verify(fotos).delete(foto);
    }

    @Test
    void soloSeAceptanImagenes() {
        MockMultipartFile pdf = new MockMultipartFile("archivo", "boleta.pdf", "application/pdf", new byte[] { 1 });

        assertThatThrownBy(() -> servicio.subir(AUTOR, TICKET, pdf))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("imágenes");
    }

    @Test
    void hayUnTopeDeEvidenciasPorReclamo() {
        when(fotos.countByTicketId(TICKET)).thenReturn(5L);

        ResponseStatusException e = (ResponseStatusException) org.assertj.core.api.Assertions
                .catchThrowable(() -> servicio.subir(AUTOR, TICKET, imagen()));

        assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        verify(fotos, never()).save(any());
    }

    @Test
    void unaFotoDeOtroReclamoNoSeDescarga() {
        when(fotos.findByIdAndTicketId(7L, TICKET)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.descargar(AUTOR, TICKET, 7L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
}
