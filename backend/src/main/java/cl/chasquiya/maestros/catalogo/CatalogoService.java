package cl.chasquiya.maestros.catalogo;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.catalogo.dto.ServicioRequest;
import cl.chasquiya.maestros.catalogo.dto.ServicioResponse;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;

/**
 * Catálogo de servicios con precio de cada maestro.
 *
 * <p>La plataforma no publica un tarifario: cada maestro arma el suyo y pone
 * sus montos (Ley 21.431). Aquí solo se valida que lo que publique sea
 * coherente con el perfil que tiene.
 */
@Service
public class CatalogoService {

    /** Tope para que el catálogo siga siendo elegible de un vistazo. */
    private static final int MAXIMO = 30;

    private final ServicioMaestroRepository servicios;
    private final PerfilMaestroRepository perfiles;

    public CatalogoService(ServicioMaestroRepository servicios, PerfilMaestroRepository perfiles) {
        this.servicios = servicios;
        this.perfiles = perfiles;
    }

    /** El catálogo completo del maestro, con los pausados incluidos. */
    public List<ServicioResponse> mios(Long maestroId) {
        return servicios.findByMaestroIdOrderByOficioAscTituloAsc(maestroId).stream()
                .map(ServicioResponse::de)
                .toList();
    }

    /** Lo que ve un cliente en el perfil público: solo lo publicado. */
    public List<ServicioResponse> publicosDe(Long maestroId) {
        return servicios.findByMaestroIdAndActivoTrueOrderByOficioAscTituloAsc(maestroId).stream()
                .map(ServicioResponse::de)
                .toList();
    }

    public ServicioResponse crear(Long maestroId, ServicioRequest req) {
        exigirOficioPropio(maestroId, req);
        if (servicios.countByMaestroId(maestroId) >= MAXIMO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Puedes publicar hasta " + MAXIMO + " servicios");
        }
        ServicioMaestro s = new ServicioMaestro(maestroId, req.oficio(), req.titulo().trim(),
                limpiar(req.descripcion()), req.precio(), req.precioFijo(), limpiar(req.unidad()));
        servicios.save(s);
        return ServicioResponse.de(s);
    }

    public ServicioResponse actualizar(Long maestroId, Long id, ServicioRequest req) {
        exigirOficioPropio(maestroId, req);
        ServicioMaestro s = mio(maestroId, id);
        s.setOficio(req.oficio());
        s.setTitulo(req.titulo().trim());
        s.setDescripcion(limpiar(req.descripcion()));
        s.setPrecio(req.precio());
        s.setPrecioFijo(req.precioFijo());
        s.setUnidad(limpiar(req.unidad()));
        servicios.save(s);
        return ServicioResponse.de(s);
    }

    /** Publicar o pausar. Pausado deja de ofrecerse, pero no se pierde lo escrito. */
    public ServicioResponse alternar(Long maestroId, Long id) {
        ServicioMaestro s = mio(maestroId, id);
        s.setActivo(!s.isActivo());
        servicios.save(s);
        return ServicioResponse.de(s);
    }

    public void eliminar(Long maestroId, Long id) {
        servicios.delete(mio(maestroId, id));
    }

    /**
     * El servicio que un cliente está pidiendo. Lo usa {@code SolicitudService}
     * para sacar de aquí el oficio y el precio, en vez de creerle al cliente.
     */
    public ServicioMaestro paraSolicitar(Long servicioId, Long maestroId) {
        return servicios.findByIdAndMaestroId(servicioId, maestroId)
                .filter(ServicioMaestro::isActivo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Ese servicio ya no está disponible"));
    }

    /**
     * El servicio activo más barato de cada maestro. Si se pide un oficio, solo
     * mira los de ese oficio: el precio que ve el cliente tiene que ser del
     * trabajo que está buscando, no un número general que no dice a qué
     * corresponde.
     */
    public Map<Long, ServicioMaestro> masBaratoPorMaestro(Collection<Long> maestroIds, Oficio oficio) {
        if (maestroIds.isEmpty()) {
            return Map.of();
        }
        return servicios.findByMaestroIdInAndActivoTrue(maestroIds).stream()
                .filter(s -> oficio == null || s.getOficio() == oficio)
                .collect(Collectors.toMap(ServicioMaestro::getMaestroId, s -> s,
                        (a, b) -> a.getPrecio() <= b.getPrecio() ? a : b));
    }

    /** Oficios en los que el maestro tiene algo publicado hoy. */
    public Set<Oficio> oficiosPublicados(Long maestroId) {
        return servicios.findByMaestroIdAndActivoTrueOrderByOficioAscTituloAsc(maestroId).stream()
                .map(ServicioMaestro::getOficio)
                .collect(Collectors.toSet());
    }

    /**
     * Precio publicado hoy de esos servicios, para precargarle el monto al
     * maestro cuando cotiza algo que salió de su catálogo.
     */
    public Map<Long, Integer> preciosDe(Collection<Long> servicioIds) {
        if (servicioIds.isEmpty()) {
            return Map.of();
        }
        return servicios.findAllById(servicioIds).stream()
                .collect(Collectors.toMap(ServicioMaestro::getId, ServicioMaestro::getPrecio));
    }

    /**
     * Un maestro solo publica servicios de los oficios que tiene en su perfil:
     * si no, cualquiera ofrecería gasfitería sin haberse verificado en eso.
     */
    private void exigirOficioPropio(Long maestroId, ServicioRequest req) {
        PerfilMaestro perfil = perfiles.findByUsuarioId(maestroId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Primero completa tu perfil de maestro"));
        if (!perfil.getOficios().contains(req.oficio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ese oficio no está en tu perfil");
        }
    }

    private ServicioMaestro mio(Long maestroId, Long id) {
        return servicios.findByIdAndMaestroId(id, maestroId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
    }

    private String limpiar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
