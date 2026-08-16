package cl.chasquiya.maestros.catalogo.dto;

import cl.chasquiya.maestros.perfiles.Oficio;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Lo que el maestro envía para publicar o corregir un servicio suyo. */
public record ServicioRequest(
        @NotNull Oficio oficio,
        @NotBlank @Size(max = 80) String titulo,
        @Size(max = 500) String descripcion,
        @NotNull @Positive Integer precio,
        /** true = se compromete a ese monto; false = es un "desde". */
        boolean precioFijo,
        @Size(max = 30) String unidad) {
}
