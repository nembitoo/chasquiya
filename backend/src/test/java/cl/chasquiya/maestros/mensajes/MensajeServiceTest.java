package cl.chasquiya.maestros.mensajes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.mensajes.dto.MensajeResponse;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

class MensajeServiceTest {

    private static final Long CLIENTE = 1L;
    private static final Long MAESTRO = 2L;
    private static final Long INTRUSO = 99L;

    private final MensajeRepository mensajes = mock(MensajeRepository.class);
    private final SolicitudRepository solicitudes = mock(SolicitudRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SimpMessagingTemplate difusor = mock(SimpMessagingTemplate.class);

    private final MensajeService servicio =
            new MensajeService(mensajes, solicitudes, usuarios, difusor);

    private Solicitud solicitud() {
        Solicitud s = new Solicitud(CLIENTE, MAESTRO, Oficio.ELECTRICIDAD, "desc", "dir", null, null);
        ReflectionTestUtils.setField(s, "id", 10L);
        when(solicitudes.findById(10L)).thenReturn(Optional.of(s));
        return s;
    }

    @Test
    void enviarGuardaYDifundeAlTopicoDeLaSolicitud() {
        solicitud();
        when(usuarios.findById(CLIENTE)).thenReturn(Optional.empty());

        MensajeResponse r = servicio.enviar(CLIENTE, 10L, "  ¿A qué hora llegas?  ");

        assertEquals("¿A qué hora llegas?", r.texto()); // se recorta el texto
        assertEquals(CLIENTE, r.autorId());
        verify(mensajes).save(any(Mensaje.class));
        verify(difusor).convertAndSend(eq("/topic/solicitudes/10"), any(Object.class));
    }

    @Test
    void unExtranoNoPuedeEscribirEnElChat() {
        solicitud();

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.enviar(INTRUSO, 10L, "hola"));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
        verify(mensajes, never()).save(any());
    }

    @Test
    void unExtranoNoPuedeLeerElChat() {
        solicitud();

        assertThrows(ResponseStatusException.class, () -> servicio.listar(INTRUSO, 10L));
    }

    @Test
    void listarDevuelveLaConversacionEnOrden() {
        solicitud();
        Mensaje m1 = new Mensaje(10L, CLIENTE, "Hola");
        Mensaje m2 = new Mensaje(10L, MAESTRO, "Voy en camino");
        when(mensajes.findBySolicitudIdOrderByFechaCreacionAsc(10L)).thenReturn(List.of(m1, m2));
        when(usuarios.findAllById(any())).thenReturn(List.of());

        List<MensajeResponse> lista = servicio.listar(CLIENTE, 10L);

        assertEquals(2, lista.size());
        assertEquals("Hola", lista.get(0).texto());
        assertEquals("Voy en camino", lista.get(1).texto());
    }

    @Test
    void marcarLeidosSoloAfectaALosMensajesRecibidos() {
        solicitud();

        servicio.marcarLeidos(CLIENTE, 10L);

        // El repositorio excluye los propios (autorId <> usuarioId).
        verify(mensajes).marcarLeidos(10L, CLIENTE);
    }

    @Test
    void solicitudInexistenteLanza404() {
        when(solicitudes.findById(77L)).thenReturn(Optional.empty());

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> servicio.listar(CLIENTE, 77L));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
    }
}
