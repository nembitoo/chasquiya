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

## documentos_maestro (Hito 2d)
Metadatos de los documentos de verificación. El archivo vive en **MinIO**.
- `id`, `usuario_id` (FK), `nombre_archivo`, `objeto` (clave en el bucket), `tipo_contenido`, `fecha_creacion`

## solicitudes (Hito 4)
Servicio que un cliente pide a un maestro concreto. Su `estado` recorre la **máquina de estados**.
- `id`, `cliente_id` (FK), `maestro_id` (FK), `oficio`, `descripcion`, `direccion`
- `fecha_preferida` (texto libre por ahora), `presupuesto_estimado` (CLP)
- `estado`: `SOLICITADO | COTIZADO | ACEPTADO | EN_CURSO | COMPLETADO | PAGADO | CALIFICADO | CANCELADO | EN_DISPUTA`
- `motivo_cancelacion`, `fecha_creacion`, `fecha_actualizacion`

### cotizaciones (Hito 4)
Una por solicitud. `id`, `solicitud_id` (FK único), `monto` (CLP), `mensaje`, `fecha_creacion`.

**Reglas de transición** (en `EstadoServicio.java`, testeadas): no se saltan etapas ni se retrocede;
cancelar solo antes de `EN_CURSO` (el maestro puede declinar sin castigo — Ley 21.431);
la disputa solo desde trabajo iniciado. `PAGADO`/`CALIFICADO` se habilitan en los Hitos 6 y 7.

## Relaciones
```
usuarios (1) ──< perfiles_maestro (0..1, solo rol MAESTRO)
perfiles_maestro (1) ──< perfil_maestro_oficios (N)
usuarios (1) ──< documentos_maestro (N)
usuarios (cliente) (1) ──< solicitudes (N) >── (1) usuarios (maestro)
solicitudes (1) ──< cotizaciones (0..1)
```
