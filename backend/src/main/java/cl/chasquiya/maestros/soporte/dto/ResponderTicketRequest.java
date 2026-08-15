package cl.chasquiya.maestros.soporte.dto;

import cl.chasquiya.maestros.soporte.EstadoTicket;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResponderTicketRequest(
        @NotNull EstadoTicket estado,
        @Size(max = 2000) String respuesta) {
}
