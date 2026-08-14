package cl.chasquiya.maestros.solicitudes.dto;

import cl.chasquiya.maestros.perfiles.Oficio;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Datos que envía el cliente para pedir un servicio a un maestro. */
public record CrearSolicitudRequest(
        @NotNull Long maestroId,
        @NotNull Oficio oficio,
        @NotBlank @Size(max = 1000) String descripcion,
        @NotBlank @Size(max = 255) String direccion,
        @Size(max = 30) String fechaPreferida,
        @PositiveOrZero Integer presupuestoEstimado) {
}
