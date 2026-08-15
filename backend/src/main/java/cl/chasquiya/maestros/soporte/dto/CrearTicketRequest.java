package cl.chasquiya.maestros.soporte.dto;

import cl.chasquiya.maestros.soporte.CategoriaTicket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CrearTicketRequest(
        @NotNull CategoriaTicket categoria,
        @NotBlank @Size(max = 120) String asunto,
        @NotBlank @Size(max = 2000) String mensaje,
        /** Opcional: si el reclamo es sobre un servicio concreto. */
        Long solicitudId) {
}
