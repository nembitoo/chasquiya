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

import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.soporte.dto.CrearTicketRequest;
import cl.chasquiya.maestros.soporte.dto.EscribirMensajeRequest;
import cl.chasquiya.maestros.soporte.dto.ResponderTicketRequest;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class SoporteServiceTest {

    private static final Long USUARIO = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long SOLICITUD = 33L;
    private static final Long ADMIN = 3L;

    private final TicketSoporteRepository tickets = mock(TicketSoporteRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final FotoTicketRepository fotos = mock(FotoTicketRepository.class);
    private final MensajeTicketRepository mensajes = mock(MensajeTicketRepository.class);
    private final SoporteService servicio =
            new SoporteService(tickets, usuarios, solicitudes, fotos, mensajes);

    private TicketSoporte ticket(EstadoTicket estado) {
        TicketSoporte t = new TicketSoporte(USUARIO, CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", null);
        ReflectionTestUtils.setField(t, "id", 7L);
        t.setEstado(estado);
        return t;
    }

    private CrearTicketRequest request() {
        return new CrearTicketRequest(CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", null);
    }

    private CrearTicketRequest requestSobre(Long solicitudId) {
        return new CrearTicketRequest(CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas", solicitudId);
    }

    /** Servicio entre USUARIO (cliente) y MAESTRO. */
    private Solicitud solicitud() {
        Solicitud s = new Solicitud(USUARIO, MAESTRO, Oficio.GASFITERIA, "Fuga en el bano", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", SOLICITUD);
        return s;
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

        assertThatThrownBy(() -> servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, "  ")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("respuesta");
    }

    /**
     * Ley 19.496 con el hilo: si el admin ya le escribió en la conversación, el
     * reclamo no se está cerrando en silencio y puede cerrarse sin repetirse.
     */
    @Test
    void seCierraSinRepetirSiElAdminYaEscribioEnElHilo() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.EN_REVISION)));
        when(mensajes.existsByTicketIdAndEsAdminTrue(7L)).thenReturn(true);

        assertThat(servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, null)).estado())
                .isEqualTo(EstadoTicket.RESUELTO);
    }

    /** La respuesta del cierre también entra al hilo: la conversación queda completa. */
    @Test
    void laRespuestaDelCierreQuedaEnLaConversacion() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.EN_REVISION)));

        servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, "Se devolvio la diferencia"));

        verify(mensajes).save(any());
    }

    @Test
    void unReclamoResueltoNoVuelveAtras() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.EN_REVISION, "otra vez")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("No se puede pasar");
    }

    @Test
    void elAdminLoPasaARevisionYLuegoLoCierra() {
        TicketSoporte t = ticket(EstadoTicket.NUEVO);
        when(tickets.findById(7L)).thenReturn(Optional.of(t));

        servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.EN_REVISION, "Lo estamos viendo"));
        assertThat(t.getEstado()).isEqualTo(EstadoTicket.EN_REVISION);

        servicio.responder(ADMIN, 7L, new ResponderTicketRequest(EstadoTicket.RESUELTO, "Se devolvio la diferencia"));
        assertThat(t.getEstado()).isEqualTo(EstadoTicket.RESUELTO);
        assertThat(t.getRespuesta()).isEqualTo("Se devolvio la diferencia");
    }

    @Test
    void pendientesSumaNuevosYEnRevision() {
        when(tickets.countByEstado(EstadoTicket.NUEVO)).thenReturn(3L);
        when(tickets.countByEstado(EstadoTicket.EN_REVISION)).thenReturn(2L);

        assertThat(servicio.pendientes()).isEqualTo(5L);
    }

    // --- Contexto: de que servicio habla el reclamo ---

    @Test
    void elReclamoPuedeColgarseDeUnServicioPropio() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of());
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.of(solicitud()));

        var r = servicio.crear(USUARIO, requestSobre(SOLICITUD));

        assertThat(r.solicitudId()).isEqualTo(SOLICITUD);
        assertThat(r.servicioOficio()).isEqualTo(Oficio.GASFITERIA);
        assertThat(r.servicioDescripcion()).isEqualTo("Fuga en el bano");
    }

    /** El maestro tambien reclama, sobre los trabajos que hizo. */
    @Test
    void elMaestroTambienPuedeReclamarSobreSuServicio() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(MAESTRO)).thenReturn(List.of());
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.of(solicitud()));

        assertThat(servicio.crear(MAESTRO, requestSobre(SOLICITUD)).solicitudId()).isEqualTo(SOLICITUD);
    }

    /** Sin esto, cualquiera pondria el servicio de otro en la ficha del admin. */
    @Test
    void noSePuedeReclamarSobreElServicioDeUnTercero() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(99L)).thenReturn(List.of());
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.of(solicitud()));

        assertThatThrownBy(() -> servicio.crear(99L, requestSobre(SOLICITUD)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("no es tuyo");

        verify(tickets, never()).save(any());
    }

    @Test
    void elServicioDelReclamoTieneQueExistir() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of());
        when(solicitudes.findById(SOLICITUD)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.crear(USUARIO, requestSobre(SOLICITUD)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("no encontrado");
    }

    /** Elegir servicio es opcional: no todo reclamo nace de un trabajo. */
    @Test
    void elServicioEsOpcional() {
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of());

        var r = servicio.crear(USUARIO, request());

        assertThat(r.solicitudId()).isNull();
        assertThat(r.servicioOficio()).isNull();
    }

    /** El usuario tambien ve de que servicio era cada reclamo suyo. */
    @Test
    void misReclamosTraenElServicio() {
        TicketSoporte t = new TicketSoporte(USUARIO, CategoriaTicket.PAGO, "Cobro raro", "Me cobraron de mas",
                SOLICITUD);
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of(t));
        when(solicitudes.findAllById(List.of(SOLICITUD))).thenReturn(List.of(solicitud()));

        var r = servicio.mios(USUARIO).get(0);

        assertThat(r.servicioOficio()).isEqualTo(Oficio.GASFITERIA);
        // Quien reclama ya sabe quien es: ese dato es solo de la vista del admin.
        assertThat(r.usuarioNombre()).isNull();
    }

    /** La tarjeta del reclamo necesita saber si trae evidencias sin pedirlas. */
    @Test
    void elReclamoDiceCuantasEvidenciasTrae() {
        TicketSoporte t = ticket(EstadoTicket.NUEVO);
        when(tickets.findByUsuarioIdOrderByFechaCreacionDesc(USUARIO)).thenReturn(List.of(t));
        when(fotos.findByTicketIdIn(List.of(7L))).thenReturn(List.of(
                new FotoTicket(7L, "reclamos/7/a", "image/jpeg"),
                new FotoTicket(7L, "reclamos/7/b", "image/jpeg")));

        assertThat(servicio.mios(USUARIO).get(0).cantidadFotos()).isEqualTo(2);
    }

    // --- Conversación ---

    @Test
    void quienReclamaSigueAportandoMientrasEsteAbierto() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.EN_REVISION)));

        var m = servicio.escribir(USUARIO, 7L, new EscribirMensajeRequest("  Se me olvido decir algo  "));

        assertThat(m.esAdmin()).isFalse();
        // Se guarda sin los espacios de los costados, como el resto de los textos.
        assertThat(m.cuerpo()).isEqualTo("Se me olvido decir algo");
        verify(mensajes).save(any());
    }

    @Test
    void unTerceroNoEscribeEnLaConversacionDeOtro() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.NUEVO)));

        assertThatThrownBy(() -> servicio.escribir(99L, 7L, new EscribirMensajeRequest("hola")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(mensajes, never()).save(any());
    }

    @Test
    void unTerceroTampocoLeeLaConversacionDeOtro() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.NUEVO)));

        assertThatThrownBy(() -> servicio.mensajesDe(99L, 7L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    /** Un reclamo resuelto se lee, no se escribe. */
    @Test
    void unReclamoResueltoYaNoAceptaMensajes() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.escribir(USUARIO, 7L, new EscribirMensajeRequest("una cosa mas")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cerrado");

        verify(mensajes, never()).save(any());
    }

    @Test
    void elAdminTampocoEscribeEnUnoResuelto() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.RESUELTO)));

        assertThatThrownBy(() -> servicio.escribirComoAdmin(ADMIN, 7L, new EscribirMensajeRequest("otra cosa")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cerrado");
    }

    /**
     * Si el admin ya está escribiendo, el reclamo dejó de estar sin mirar: si
     * siguiera NUEVO seguiría contando como el más viejo sin tocar del panel.
     */
    @Test
    void escribirComoAdminTomaElReclamoNuevo() {
        TicketSoporte t = ticket(EstadoTicket.NUEVO);
        when(tickets.findById(7L)).thenReturn(Optional.of(t));

        var m = servicio.escribirComoAdmin(ADMIN, 7L, new EscribirMensajeRequest("Necesito la boleta"));

        assertThat(m.esAdmin()).isTrue();
        assertThat(m.autor()).isEqualTo("Soporte ChasquiYa!");
        assertThat(t.getEstado()).isEqualTo(EstadoTicket.EN_REVISION);
    }

    /** El admin lee cualquier hilo: es quien tiene que resolverlo. */
    @Test
    void elAdminLeeLaConversacionSinSerElAutor() {
        when(tickets.findById(7L)).thenReturn(Optional.of(ticket(EstadoTicket.NUEVO)));
        when(mensajes.findByTicketIdOrderByFechaCreacionAsc(7L))
                .thenReturn(List.of(new MensajeTicket(7L, USUARIO, false, "hola"),
                        new MensajeTicket(7L, ADMIN, true, "te leemos")));

        var hilo = servicio.mensajesComoAdmin(7L);

        assertThat(hilo).hasSize(2);
        assertThat(hilo.get(1).autor()).isEqualTo("Soporte ChasquiYa!");
    }
}
