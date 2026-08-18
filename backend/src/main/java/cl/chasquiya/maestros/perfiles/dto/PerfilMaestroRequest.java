package cl.chasquiya.maestros.perfiles.dto;

import java.util.Set;

import cl.chasquiya.maestros.perfiles.Oficio;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Datos que envía el maestro para crear o actualizar su perfil. */
public record PerfilMaestroRequest(
        @NotEmpty(message = "Elige al menos un oficio") Set<Oficio> oficios,
        @Size(max = 1000) String descripcion,
        @Min(0) int aniosExperiencia,
        // Los precios NO viven aquí: cada uno va en su servicio del catálogo,
        // atado al trabajo que describe.
        @Size(max = 120) String zonaCobertura,
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double latitud,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double longitud) {
}
