package cl.chasquiya.maestros.descubrimiento;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroPublicoResponse;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.MaestroCercanoProjection;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Búsqueda de maestros aprobados por cercanía y su perfil público. */
@Service
public class DescubrimientoService {

    private static final double RADIO_KM_POR_DEFECTO = 25.0;

    private final PerfilMaestroRepository perfiles;
    private final UsuarioRepository usuarios;

    public DescubrimientoService(PerfilMaestroRepository perfiles, UsuarioRepository usuarios) {
        this.perfiles = perfiles;
        this.usuarios = usuarios;
    }

    public List<MaestroCercanoResponse> buscar(double lat, double lon, Double radioKm, Oficio oficio) {
        double radioM = (radioKm != null ? radioKm : RADIO_KM_POR_DEFECTO) * 1000.0;

        List<MaestroCercanoProjection> ranking = (oficio == null)
                ? perfiles.buscarCercanos(lat, lon, radioM)
                : perfiles.buscarCercanosPorOficio(lat, lon, radioM, oficio.name());
        if (ranking.isEmpty()) {
            return List.of();
        }

        List<Long> ids = ranking.stream().map(MaestroCercanoProjection::getUsuarioId).toList();
        Map<Long, PerfilMaestro> perfilPorUsuario = perfiles.findByUsuarioIdIn(ids).stream()
                .collect(Collectors.toMap(PerfilMaestro::getUsuarioId, Function.identity()));
        Map<Long, Usuario> usuarioPorId = usuarios.findAllById(ids).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));

        List<MaestroCercanoResponse> salida = new ArrayList<>();
        for (MaestroCercanoProjection r : ranking) {
            PerfilMaestro p = perfilPorUsuario.get(r.getUsuarioId());
            Usuario u = usuarioPorId.get(r.getUsuarioId());
            if (p == null || u == null) {
                continue;
            }
            salida.add(new MaestroCercanoResponse(
                    u.getId(), u.getNombre(), u.getApellido(), p.getOficios(),
                    p.getZonaCobertura(), p.getAniosExperiencia(), p.getTarifaReferencial(),
                    aKilometros(r.getDistanciaM())));
        }
        return salida;
    }

    public MaestroPublicoResponse obtenerPublico(Long usuarioId) {
        PerfilMaestro p = perfiles.findByUsuarioId(usuarioId)
                .filter(perfil -> perfil.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));
        Usuario u = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));
        return new MaestroPublicoResponse(u.getId(), u.getNombre(), u.getApellido(),
                p.getOficios(), p.getDescripcion(), p.getAniosExperiencia(), p.getTarifaReferencial(),
                p.getZonaCobertura());
    }

    /** Metros -> kilómetros con 1 decimal. */
    private double aKilometros(Double metros) {
        if (metros == null) {
            return 0;
        }
        return Math.round(metros / 100.0) / 10.0;
    }
}
