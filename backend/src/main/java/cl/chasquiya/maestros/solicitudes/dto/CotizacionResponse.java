package cl.chasquiya.maestros.solicitudes.dto;

import java.time.Instant;

import cl.chasquiya.maestros.descubrimiento.dto.MaestroCercanoResponse;
import cl.chasquiya.maestros.solicitudes.Cotizacion;

/**
 * Una oferta recibida, con los datos del maestro que la hizo.
 *
 * <p>Van juntos a propósito: para elegir, el precio solo no basta. El cliente
 * necesita ver a quién le está comprando.
 */
public record CotizacionResponse(
        Long id,
        Long maestroId,
        String maestroNombre,
        boolean maestroTieneAvatar,
        int monto,
        String mensaje,
        double calificacionPromedio,
        long cantidadCalificaciones,
        long trabajosCompletados,
        int aniosExperiencia,
        Instant fechaCreacion) {

    public static CotizacionResponse de(Cotizacion c, MaestroCercanoResponse m) {
        return new CotizacionResponse(
                c.getId(),
                c.getMaestroId(),
                m == null ? "—" : m.nombre() + " " + m.apellido(),
                m != null && m.tieneAvatar(),
                c.getMonto(),
                c.getMensaje(),
                m == null ? 0 : m.calificacionPromedio(),
                m == null ? 0 : m.cantidadCalificaciones(),
                m == null ? 0 : m.trabajosCompletados(),
                m == null ? 0 : m.aniosExperiencia(),
                c.getFechaCreacion());
    }
}
