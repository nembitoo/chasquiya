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

## mensajes (Hito 5)
Chat ligado a una solicitud (mantiene contexto y privacidad: solo sus dos partes acceden).
- `id`, `solicitud_id` (FK), `autor_id` (FK), `texto`, `leido`, `fecha_creacion`
- Entrega en tiempo real por **WebSocket/STOMP** (`/topic/solicitudes/{id}`); el envío va por
  REST para reusar validación y persistencia. El JWT se valida en el CONNECT de STOMP y los
  permisos del chat en el SUBSCRIBE (ver `ChatAuthInterceptor`).

## pagos (Hito 6)
Registro contable del pago **simulado**. **NUNCA contiene datos de tarjeta ni medio de pago real.**
- `id`, `solicitud_id` (FK único), `monto_servicio` (lo que paga el cliente = cotización)
- `porcentaje_comision`, `comision`, `monto_maestro`, `metodo` (`SIMULADO`), `fecha_creacion`

**Regla de negocio:** la comisión se **descuenta al maestro**. El cliente paga exactamente lo
cotizado; la plataforma retiene el % (config. `COMISION_PORCENTAJE`, por defecto 10) y el maestro
recibe el resto. El cálculo vive en `CalculadoraComision` y está testeado a fondo (invariante:
`comisión + monto del maestro = monto del servicio`, sin perder pesos por redondeo).

## calificaciones (Hito 7)
Calificación mutua al cerrar el servicio. Cada parte califica **una vez** (`UNIQUE(solicitud_id, autor_id)`).
- `id`, `solicitud_id` (FK), `autor_id`, `destinatario_id`, `estrellas` (1-5), `comentario`
- `puntualidad`, `calidad`, `trato` (1-5): **solo se llenan al calificar a un maestro**
- Cuando **ambas** partes califican, la solicitud pasa a `CALIFICADO`.
- El promedio alimenta las tarjetas de búsqueda y el perfil público del maestro.

> **Regla legal (Ley 21.431):** la reputación es información pública, **no** un mecanismo de sanción
> automática. El sistema nunca bloquea a un maestro por su nota; cualquier medida la toma un admin.

**Disputas:** `solicitudes.resolucion_disputa` guarda lo que resolvió el admin. La máquina de estados
permite `EN_DISPUTA → CANCELADO` (a favor del cliente) o `EN_DISPUTA → COMPLETADO` (a favor del maestro).
Con pago simulado **no hay devolución de dinero**; eso se define al integrar una pasarela real.

## Relaciones
```
usuarios (1) ──< perfiles_maestro (0..1, solo rol MAESTRO)
perfiles_maestro (1) ──< perfil_maestro_oficios (N)
usuarios (1) ──< documentos_maestro (N)
usuarios (cliente) (1) ──< solicitudes (N) >── (1) usuarios (maestro)
solicitudes (1) ──< cotizaciones (0..1)
solicitudes (1) ──< mensajes (N)
solicitudes (1) ──< pagos (0..1)
solicitudes (1) ──< calificaciones (0..2, una por parte)
```
