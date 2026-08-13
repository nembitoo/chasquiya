# Modelo de datos — Chasquiya

Se amplía por hito. Fuente de verdad de la estructura de la BD (junto con las migraciones Flyway).

## usuarios (Hito 1)
Clientes, maestros y admins comparten tabla; los distingue `rol`.
- `id`, `nombre`, `apellido`, `email` (único), `telefono`
- `password_hash` (BCrypt — nunca texto plano)
- `rol`: `CLIENTE | MAESTRO | ADMIN`
- `acepto_terminos`, `fecha_creacion`

## perfiles_maestro (Hito 2)
Datos profesionales de un maestro. Un usuario MAESTRO tiene 0 o 1 perfil.
- `id`, `usuario_id` (FK único → usuarios)
- `descripcion`, `anios_experiencia`, `tarifa_referencial` (CLP), `zona_cobertura`
- `latitud`, `longitud`: coordenadas que ingresa el maestro
- `ubicacion`: `geography(Point,4326)` — **columna GENERADA por PostGIS** a partir de lat/lon.
  Es la base para "maestros cercanos" (Hito 3). Java escribe lat/lon; Postgres calcula el punto.
- `estado_verificacion`: `PENDIENTE | APROBADO | RECHAZADO`. Un maestro no se publica hasta `APROBADO`.
- `fecha_creacion`, `fecha_actualizacion`

### perfil_maestro_oficios (Hito 2)
Oficios del maestro (1..N). Valores: `ELECTRICIDAD, GASFITERIA, CERRAJERIA, PINTURA, LIMPIEZA,
REPARACIONES, INSTALACIONES, MANTENCION, OTROS`.

## Relaciones
```
usuarios (1) ──< perfiles_maestro (0..1, solo rol MAESTRO)
perfiles_maestro (1) ──< perfil_maestro_oficios (N)
```
