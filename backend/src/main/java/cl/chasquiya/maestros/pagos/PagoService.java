package cl.chasquiya.maestros.pagos;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import cl.chasquiya.maestros.notificaciones.NotificacionService;
import cl.chasquiya.maestros.notificaciones.TipoNotificacion;
import cl.chasquiya.maestros.pagos.dto.IngresosResponse;
import cl.chasquiya.maestros.pagos.dto.PagoResponse;
import cl.chasquiya.maestros.pagos.dto.ResumenPagoResponse;
import cl.chasquiya.maestros.solicitudes.Cotizacion;
import cl.chasquiya.maestros.solicitudes.CotizacionRepository;
import cl.chasquiya.maestros.solicitudes.EstadoServicio;
import cl.chasquiya.maestros.solicitudes.Solicitud;
import cl.chasquiya.maestros.solicitudes.SolicitudRepository;
import cl.chasquiya.maestros.usuarios.UsuarioRepository;

/**
 * Cierre del servicio: pago simulado y registro de la comisión.
 * NO hay pasarela ni datos de tarjeta: solo queda el registro contable.
 */
@Service
public class PagoService {

    private static final ZoneId ZONA = ZoneId.of("America/Santiago");
    private static final String[] MESES = {
        "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"
    };

    private final PagoRepository pagos;
    private final SolicitudRepository solicitudes;
    private final CotizacionRepository cotizaciones;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;
    private final int porcentajeComision;

    public PagoService(PagoRepository pagos, SolicitudRepository solicitudes,
                       CotizacionRepository cotizaciones, UsuarioRepository usuarios,
                       NotificacionService notificaciones,
                       @Value("${chasquiya.comision.porcentaje}") int porcentajeComision) {
        this.pagos = pagos;
        this.solicitudes = solicitudes;
        this.cotizaciones = cotizaciones;
        this.usuarios = usuarios;
        this.notificaciones = notificaciones;
        this.porcentajeComision = porcentajeComision;
    }

    /** Desglose que ve el cliente antes de confirmar. */
    public ResumenPagoResponse resumen(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);
        int monto = montoAcordado(s);
        var reparto = CalculadoraComision.repartir(monto, porcentajeComision);
        String maestro = usuarios.findById(s.getMaestroId())
                .map(u -> u.getNombre() + " " + u.getApellido())
                .orElse("—");
        return new ResumenPagoResponse(s.getId(), maestro, reparto.montoServicio(),
                reparto.porcentaje(), reparto.comision(),
                pagos.findBySolicitudId(solicitudId).isPresent());
    }

    /** Ejecuta el pago simulado: registra el reparto y pasa la solicitud a PAGADO. */
    public PagoResponse pagar(Long clienteId, Long solicitudId) {
        Solicitud s = deCliente(clienteId, solicitudId);

        if (pagos.findBySolicitudId(solicitudId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este servicio ya fue pagado");
        }
        // La máquina de estados manda: solo se paga un servicio completado.
        if (!s.getEstado().puedePasarA(EstadoServicio.PAGADO)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede pagar un servicio en estado " + s.getEstado());
        }

        var reparto = CalculadoraComision.repartir(montoAcordado(s), porcentajeComision);
        Pago pago = new Pago(solicitudId, reparto);
        pagos.save(pago);

        s.setEstado(EstadoServicio.PAGADO);
        solicitudes.save(s);

        notificaciones.avisar(s.getMaestroId(), TipoNotificacion.PAGO_RECIBIDO, s.getId(),
                enPesos(reparto.montoMaestro()));
        return aResponse(pago);
    }

    /** Formato chileno: 45000 -> "$45.000". */
    private String enPesos(int monto) {
        return "$" + String.format("%,d", monto).replace(',', '.');
    }

    /** Panel de ingresos del maestro. */
    public IngresosResponse ingresosDe(Long maestroId) {
        List<Solicitud> suyas = solicitudes.findByMaestroIdOrderByFechaCreacionDesc(maestroId);
        if (suyas.isEmpty()) {
            return new IngresosResponse(0, 0, 0, 0, List.of());
        }
        List<Pago> susPagos = pagos.findBySolicitudIdIn(suyas.stream().map(Solicitud::getId).toList());

        int totalAcumulado = susPagos.stream().mapToInt(Pago::getMontoMaestro).sum();
        YearMonth mesActual = YearMonth.now(ZONA);
        int totalMes = susPagos.stream()
                .filter(p -> YearMonth.from(p.getFechaCreacion().atZone(ZONA)).equals(mesActual))
                .mapToInt(Pago::getMontoMaestro)
                .sum();
        // Trabajos terminados que el cliente todavía no paga.
        int porCobrar = (int) suyas.stream()
                .filter(s -> s.getEstado() == EstadoServicio.COMPLETADO)
                .count();

        return new IngresosResponse(totalAcumulado, totalMes, susPagos.size(), porCobrar,
                ultimosMeses(susPagos));
    }

    /** Agrupa los ingresos por mes (últimos 6) para el gráfico. */
    private List<IngresosResponse.IngresoMensual> ultimosMeses(List<Pago> lista) {
        Map<YearMonth, Integer> porMes = new LinkedHashMap<>();
        lista.stream()
                .sorted(Comparator.comparing(Pago::getFechaCreacion))
                .forEach(p -> porMes.merge(YearMonth.from(p.getFechaCreacion().atZone(ZONA)),
                        p.getMontoMaestro(), Integer::sum));

        List<IngresosResponse.IngresoMensual> salida = new ArrayList<>();
        porMes.forEach((ym, monto) -> salida.add(
                new IngresosResponse.IngresoMensual(MESES[ym.getMonthValue() - 1] + " " + ym.getYear(), monto)));
        return salida.size() > 6 ? salida.subList(salida.size() - 6, salida.size()) : salida;
    }

    private int montoAcordado(Solicitud s) {
        return cotizaciones.findBySolicitudId(s.getId())
                .map(Cotizacion::getMonto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "El servicio no tiene una cotización acordada"));
    }

    private Solicitud deCliente(Long clienteId, Long solicitudId) {
        Solicitud s = solicitudes.findById(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!s.getClienteId().equals(clienteId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta solicitud no es tuya");
        }
        return s;
    }

    private PagoResponse aResponse(Pago p) {
        return new PagoResponse(p.getId(), p.getSolicitudId(), p.getMontoServicio(),
                p.getPorcentajeComision(), p.getComision(), p.getMontoMaestro(),
                p.getMetodo(), p.getFechaCreacion());
    }
}
