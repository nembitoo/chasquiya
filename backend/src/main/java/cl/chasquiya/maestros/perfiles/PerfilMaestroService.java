package cl.chasquiya.maestros.perfiles;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroRequest;
import cl.chasquiya.maestros.perfiles.dto.PerfilMaestroResponse;

/** Lógica del perfil profesional del maestro (crear, actualizar, consultar). */
@Service
public class PerfilMaestroService {

    private final PerfilMaestroRepository perfiles;

    public PerfilMaestroService(PerfilMaestroRepository perfiles) {
        this.perfiles = perfiles;
    }

    public PerfilMaestroResponse obtenerPorUsuario(Long usuarioId) {
        return perfiles.findByUsuarioId(usuarioId)
                .map(this::aResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aún no has creado tu perfil"));
    }

    /** Crea el perfil si no existe, o actualiza el existente (upsert). */
    public PerfilMaestroResponse guardar(Long usuarioId, PerfilMaestroRequest req) {
        PerfilMaestro perfil = perfiles.findByUsuarioId(usuarioId)
                .orElseGet(() -> new PerfilMaestro(usuarioId));

        perfil.setOficios(req.oficios());
        perfil.setDescripcion(req.descripcion());
        perfil.setAniosExperiencia(req.aniosExperiencia());
        perfil.setTarifaReferencial(req.tarifaReferencial());
        perfil.setZonaCobertura(req.zonaCobertura());
        perfil.setLatitud(req.latitud());
        perfil.setLongitud(req.longitud());

        perfiles.save(perfil);
        return aResponse(perfil);
    }

    // --- Acciones de administrador ---

    public List<PerfilMaestro> listarPorEstado(EstadoVerificacion estado) {
        return perfiles.findByEstadoVerificacion(estado);
    }

    public PerfilMaestroResponse cambiarEstado(Long usuarioId, EstadoVerificacion nuevoEstado) {
        PerfilMaestro perfil = perfiles.findByUsuarioId(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El maestro no tiene perfil"));
        perfil.setEstadoVerificacion(nuevoEstado);
        perfiles.save(perfil);
        return aResponse(perfil);
    }

    private PerfilMaestroResponse aResponse(PerfilMaestro p) {
        return new PerfilMaestroResponse(
                p.getId(),
                p.getUsuarioId(),
                p.getOficios(),
                p.getDescripcion(),
                p.getAniosExperiencia(),
                p.getTarifaReferencial(),
                p.getZonaCobertura(),
                p.getLatitud(),
                p.getLongitud(),
                p.getEstadoVerificacion());
    }
}
