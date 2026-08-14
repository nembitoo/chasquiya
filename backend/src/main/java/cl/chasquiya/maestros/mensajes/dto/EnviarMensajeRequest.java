package cl.chasquiya.maestros.mensajes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EnviarMensajeRequest(
        @NotBlank @Size(max = 1000) String texto) {
}
