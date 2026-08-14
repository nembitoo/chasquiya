package cl.chasquiya.maestros.favoritos;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.descubrimiento.DescubrimientoService;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;

/** "Mis maestros": los que el cliente guardó para volver a contratarlos. */
@Service
public class FavoritoService {

    private final FavoritoRepository favoritos;
    private final PerfilMaestroRepository perfiles;
    private final DescubrimientoService descubrimiento;

    public FavoritoService(FavoritoRepository favoritos, PerfilMaestroRepository perfiles,
                           DescubrimientoService descubrimiento) {
        this.favoritos = favoritos;
        this.perfiles = perfiles;
        this.descubrimiento = descubrimiento;
    }

    /** Agrega o quita el favorito. Devuelve true si quedó guardado. */
    public boolean alternar(Long clienteId, Long maestroId) {
        if (clienteId.equals(maestroId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes guardarte a ti mismo");
        }
        perfiles.findByUsuarioId(maestroId)
                .filter(p -> p.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));

        return favoritos.findByClienteIdAndMaestroId(clienteId, maestroId)
                .map(f -> {
                    favoritos.delete(f);
                    return false;
                })
                .orElseGet(() -> {
                    favoritos.save(new Favorito(clienteId, maestroId));
                    return true;
                });
    }

    public List<MaestroCercanoResponse> listar(Long clienteId) {
        List<Long> ids = favoritos.findByClienteIdOrderByFechaCreacionDesc(clienteId).stream()
                .map(Favorito::getMaestroId)
                .toList();
        // Sin distancia: la lista de favoritos no depende de dónde esté el cliente.
        return descubrimiento.fichasDe(ids, clienteId, Map.of());
    }
}
