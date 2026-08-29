package cl.chasquiya.maestros.soporte.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EscribirMensajeRequest(
        @NotBlank @Size(max = 2000) String cuerpo) {
}
