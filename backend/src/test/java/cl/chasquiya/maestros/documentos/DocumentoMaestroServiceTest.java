package cl.chasquiya.maestros.documentos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.documentos.dto.DocumentoResponse;

class DocumentoMaestroServiceTest {

    private final DocumentoMaestroRepository repo = mock(DocumentoMaestroRepository.class);
    private final AlmacenamientoMinio almacen = mock(AlmacenamientoMinio.class);
    private final DocumentoMaestroService servicio = new DocumentoMaestroService(repo, almacen);

    @Test
    void subirGuardaEnMinioYMetadatos() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "cedula.jpg", "image/jpeg", new byte[] {1, 2, 3});

        DocumentoResponse resp = servicio.subir(7L, archivo);

        assertEquals("cedula.jpg", resp.nombreArchivo());
        assertEquals("image/jpeg", resp.tipoContenido());
        verify(almacen).subir(anyString(), any(byte[].class), eq("image/jpeg"));
        verify(repo).save(any(DocumentoMaestro.class));
    }

    @Test
    void subirArchivoVacioLanza400() {
        MockMultipartFile vacio = new MockMultipartFile("archivo", new byte[0]);

        assertThrows(ResponseStatusException.class, () -> servicio.subir(7L, vacio));
        verify(almacen, never()).subir(anyString(), any(byte[].class), anyString());
    }

    @Test
    void descargarDocumentoInexistenteLanza404() {
        when(repo.findByIdAndUsuarioId(1L, 7L)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> servicio.descargar(7L, 1L));
    }
}
