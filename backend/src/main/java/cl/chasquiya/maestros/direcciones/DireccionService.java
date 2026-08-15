package cl.chasquiya.maestros.direcciones;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.direcciones.dto.DireccionRequest;
import cl.chasquiya.maestros.direcciones.dto.DireccionResponse;

/** Direcciones guardadas del usuario: evita reescribirlas en cada solicitud. */
@Service
public class DireccionService {

    private static final int MAXIMO = 10;

    private final DireccionRepository direcciones;

    public DireccionService(DireccionRepository direcciones) {
        this.direcciones = direcciones;
    }

    public List<DireccionResponse> listar(Long usuarioId) {
        return direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId).stream()
                .map(this::aResponse)
                .toList();
    }

    public DireccionResponse crear(Long usuarioId, DireccionRequest req) {
        List<Direccion> actuales = direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId);
        if (actuales.size() >= MAXIMO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Puedes guardar hasta " + MAXIMO + " direcciones");
        }
        // La primera dirección es la principal aunque no lo pidan.
        boolean principal = req.esPrincipal() || actuales.isEmpty();
        if (principal) {
            quitarPrincipalA(actuales);
        }
        Direccion d = new Direccion(usuarioId, req.etiqueta().trim(), req.direccion().trim(),
                limpiar(req.comuna()), limpiar(req.referencia()), principal);
        direcciones.save(d);
        return aResponse(d);
    }

    public DireccionResponse actualizar(Long usuarioId, Long id, DireccionRequest req) {
        Direccion d = mia(usuarioId, id);
        if (req.esPrincipal() && !d.isEsPrincipal()) {
            quitarPrincipalA(direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId));
        }
        d.setEtiqueta(req.etiqueta().trim());
        d.setDireccion(req.direccion().trim());
        d.setComuna(limpiar(req.comuna()));
        d.setReferencia(limpiar(req.referencia()));
        d.setEsPrincipal(req.esPrincipal() || d.isEsPrincipal());
        direcciones.save(d);
        return aResponse(d);
    }

    public void eliminar(Long usuarioId, Long id) {
        Direccion d = mia(usuarioId, id);
        direcciones.delete(d);
        // Si borramos la principal, la más reciente toma su lugar.
        if (d.isEsPrincipal()) {
            direcciones.findByUsuarioIdOrderByEsPrincipalDescFechaCreacionDesc(usuarioId).stream()
                    .findFirst()
                    .ifPresent(nueva -> {
                        nueva.setEsPrincipal(true);
                        direcciones.save(nueva);
                    });
        }
    }

    private void quitarPrincipalA(List<Direccion> lista) {
        lista.stream().filter(Direccion::isEsPrincipal).forEach(otra -> {
            otra.setEsPrincipal(false);
            direcciones.save(otra);
        });
    }

    private Direccion mia(Long usuarioId, Long id) {
        return direcciones.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dirección no encontrada"));
    }

    private String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    private DireccionResponse aResponse(Direccion d) {
        return new DireccionResponse(d.getId(), d.getEtiqueta(), d.getDireccion(),
                d.getComuna(), d.getReferencia(), d.isEsPrincipal());
    }
}
