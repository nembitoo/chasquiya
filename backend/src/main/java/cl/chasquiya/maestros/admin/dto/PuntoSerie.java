package cl.chasquiya.maestros.admin.dto;

/** Un día de la serie temporal del dashboard. La fecha viaja como "2026-08-15". */
public record PuntoSerie(String fecha, long servicios, long comisiones, long usuariosNuevos) {
}
