package cl.chasquiya.maestros.descubrimiento;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.calificaciones.CalificacionService;
import cl.chasquiya.maestros.calificaciones.dto.ReputacionResponse;
import cl.chasquiya.maestros.catalogo.CatalogoService;
import cl.chasquiya.maestros.catalogo.ServicioMaestro;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.descubrimiento.dto.MaestroPublicoResponse;
import cl.chasquiya.maestros.favoritos.Favorito;
import cl.chasquiya.maestros.favoritos.FavoritoRepository;
import cl.chasquiya.maestros.perfiles.EstadoVerificacion;
import cl.chasquiya.maestros.perfiles.MaestroCercanoProjection;
import cl.chasquiya.maestros.perfiles.Oficio;
import cl.chasquiya.maestros.perfiles.PerfilMaestro;
import cl.chasquiya.maestros.perfiles.PerfilMaestroRepository;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.Usuario;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/** Búsqueda de maestros aprobados por cercanía y su perfil público. */
@Service
public class DescubrimientoService {

    private static final double RADIO_KM_POR_DEFECTO = 25.0;

    private final PerfilMaestroRepository perfiles;
    private final UsuarioRepository usuarios;
    private final CalificacionService calificaciones;
    private final FavoritoRepository favoritos;
    private final SolicitudRepository solicitudes;
    private final CatalogoService catalogo;

    public DescubrimientoService(PerfilMaestroRepository perfiles, UsuarioRepository usuarios,
                                 CalificacionService calificaciones, FavoritoRepository favoritos,
                                 SolicitudRepository solicitudes, CatalogoService catalogo) {
        this.perfiles = perfiles;
        this.usuarios = usuarios;
        this.calificaciones = calificaciones;
        this.favoritos = favoritos;
        this.solicitudes = solicitudes;
        this.catalogo = catalogo;
    }

    /**
     * Maestros aprobados cerca de (lat, lon), con filtros opcionales.
     *
     * @param clienteId quién busca, para marcar sus favoritos (puede ser null)
     */
    public List<MaestroCercanoResponse> buscar(double lat, double lon, Double radioKm, Oficio oficio,
                                               Long clienteId, Integer precioMaximo,
                                               Double calificacionMinima, String orden) {
        double radioM = (radioKm != null ? radioKm : RADIO_KM_POR_DEFECTO) * 1000.0;

        List<MaestroCercanoProjection> ranking = (oficio == null)
                ? perfiles.buscarCercanos(lat, lon, radioM)
                : perfiles.buscarCercanosPorOficio(lat, lon, radioM, oficio.name());
        if (ranking.isEmpty()) {
            return List.of();
        }

        List<Long> ids = ranking.stream().map(MaestroCercanoProjection::getUsuarioId).toList();
        Map<Long, Double> distancias = ranking.stream().collect(Collectors.toMap(
                MaestroCercanoProjection::getUsuarioId, r -> aKilometros(r.getDistanciaM()), (a, b) -> a));

        // El precio de la ficha es el del oficio buscado: si cambia el filtro,
        // cambia el precio que ve el cliente.
        List<MaestroCercanoResponse> salida = new ArrayList<>(fichasDe(ids, clienteId, distancias, oficio));

        // --- Filtros que se aplican sobre la ficha ya construida ---
        if (precioMaximo != null) {
            salida.removeIf(m -> m.precio() != null && m.precio() > precioMaximo);
        }
        if (calificacionMinima != null) {
            salida.removeIf(m -> m.calificacionPromedio() < calificacionMinima);
        }

        // --- Orden ---
        if ("calificacion".equals(orden)) {
            salida.sort((a, b) -> Double.compare(b.calificacionPromedio(), a.calificacionPromedio()));
        } else if ("precio".equals(orden)) {
            salida.sort((a, b) -> Integer.compare(
                    a.precio() == null ? Integer.MAX_VALUE : a.precio(),
                    b.precio() == null ? Integer.MAX_VALUE : b.precio()));
        } else {
            salida.sort((a, b) -> Double.compare(a.distanciaKm(), b.distanciaKm()));
        }
        return salida;
    }

    /**
     * Construye las fichas de varios maestros. Lo usa la búsqueda y también
     * la lista de favoritos, para no duplicar el armado de la tarjeta.
     */
    public List<MaestroCercanoResponse> fichasDe(Collection<Long> usuarioIds, Long clienteId,
                                                 Map<Long, Double> distanciasKm) {
        // Sin oficio de contexto (favoritos, cotizaciones): el precio que se
        // muestra es el más bajo que tenga publicado.
        return fichasDe(usuarioIds, clienteId, distanciasKm, null);
    }

    /**
     * @param oficio qué está buscando el cliente. Decide qué precio se muestra:
     *               el del servicio más barato de ese oficio. Con null, el más
     *               barato de todo su catálogo.
     */
    public List<MaestroCercanoResponse> fichasDe(Collection<Long> usuarioIds, Long clienteId,
                                                 Map<Long, Double> distanciasKm, Oficio oficio) {
        if (usuarioIds.isEmpty()) {
            return List.of();
        }
        Map<Long, ServicioMaestro> precios = catalogo.masBaratoPorMaestro(usuarioIds, oficio);
        Map<Long, PerfilMaestro> perfilPorUsuario = perfiles.findByUsuarioIdIn(usuarioIds).stream()
                .collect(Collectors.toMap(PerfilMaestro::getUsuarioId, Function.identity()));
        Map<Long, Usuario> usuarioPorId = usuarios.findAllById(usuarioIds).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));
        Map<Long, ReputacionResponse> reputaciones = calificaciones.reputacionesDe(usuarioIds);
        Set<Long> favoritosDelCliente = favoritosDe(clienteId);
        Map<Long, Long> completados = trabajosCompletadosDe(usuarioIds);

        List<MaestroCercanoResponse> salida = new ArrayList<>();
        for (Long id : usuarioIds) {
            PerfilMaestro p = perfilPorUsuario.get(id);
            Usuario u = usuarioPorId.get(id);
            if (p == null || u == null) {
                continue;
            }
            ReputacionResponse rep = reputaciones.getOrDefault(id, ReputacionResponse.vacia());
            ServicioMaestro barato = precios.get(id);
            salida.add(new MaestroCercanoResponse(
                    u.getId(), u.getNombre(), u.getApellido(), p.getOficios(),
                    p.getZonaCobertura(), p.getAniosExperiencia(),
                    barato == null ? null : barato.getPrecio(),
                    barato != null && barato.isPrecioFijo(),
                    barato == null ? null : barato.getTitulo(),
                    distanciasKm.getOrDefault(id, 0.0), rep.promedio(), rep.cantidad(),
                    favoritosDelCliente.contains(id), u.tieneAvatar(),
                    completados.getOrDefault(id, 0L),
                    // Al mapa va la zona, nunca la coordenada exacta del maestro.
                    UbicacionAproximada.latitud(p.getLatitud(), id),
                    UbicacionAproximada.longitud(p.getLongitud(), id)));
        }
        return salida;
    }

    /**
     * Trabajos terminados por maestro, en una sola consulta.
     * "Terminado" es desde COMPLETADO en adelante: el trabajo se hizo, aunque el
     * pago o la calificación todavía estén pendientes.
     */
    private Map<Long, Long> trabajosCompletadosDe(Collection<Long> maestroIds) {
        return solicitudes.findByMaestroIdIn(maestroIds).stream()
                .filter(s -> s.getEstado() == EstadoServicio.COMPLETADO
                        || s.getEstado() == EstadoServicio.PAGADO
                        || s.getEstado() == EstadoServicio.CALIFICADO)
                .collect(Collectors.groupingBy(Solicitud::getMaestroId, Collectors.counting()));
    }

    public MaestroPublicoResponse obtenerPublico(Long usuarioId, Long clienteId) {
        PerfilMaestro p = perfiles.findByUsuarioId(usuarioId)
                .filter(perfil -> perfil.getEstadoVerificacion() == EstadoVerificacion.APROBADO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));
        Usuario u = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maestro no disponible"));
        ReputacionResponse rep = calificaciones.reputacionDe(usuarioId);
        boolean esFavorito = clienteId != null && favoritos.existsByClienteIdAndMaestroId(clienteId, usuarioId);

        return new MaestroPublicoResponse(u.getId(), u.getNombre(), u.getApellido(),
                p.getOficios(), p.getDescripcion(), p.getAniosExperiencia(),
                p.getZonaCobertura(), rep.promedio(), rep.cantidad(), esFavorito, u.tieneAvatar(),
                trabajosCompletadosDe(List.of(usuarioId)).getOrDefault(usuarioId, 0L));
    }

    private Set<Long> favoritosDe(Long clienteId) {
        if (clienteId == null) {
            return Set.of();
        }
        return favoritos.findByClienteIdOrderByFechaCreacionDesc(clienteId).stream()
                .map(Favorito::getMaestroId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /** Metros -> kilómetros con 1 decimal. */
    private double aKilometros(Double metros) {
        if (metros == null) {
            return 0;
        }
        return Math.round(metros / 100.0) / 10.0;
    }
}
