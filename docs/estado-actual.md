# Estado actual de ChasquiYa!

> Punto de partida para retomar el trabajo. Si estás leyendo esto en una
> conversación nueva: esto es lo que hay, lo que falta y lo que **no** hay que
> romper.
>
> Última actualización: agosto 2026 · 21 migraciones · 161 tests verdes.

## Qué es

Marketplace móvil (Chile) que conecta **clientes** con **maestros** de oficios
(gasfitería, electricidad, etc.). La plataforma es intermediario tecnológico y
cobra 10% de comisión, **descontada al maestro**. Proyecto individual, media
jornada, costo cero en desarrollo.

Fuente de verdad completa: `docs/blueprint.md`.
Reglas permanentes de trabajo: `CLAUDE.md`.

## Stack y cómo levantarlo

- `app/` — React Native + Expo SDK 54 + TypeScript
- `backend/` — Spring Boot 4 + Java 21 + Maven (`cl.chasquiya.maestros`)
- PostgreSQL 16 + PostGIS · Flyway · MinIO · Mailpit

```bash
docker compose up -d                       # base, MinIO, Mailpit
cd backend && ./mvnw spring-boot:run       # API en :8080
cd app && npx expo start --tunnel          # app en el teléfono
```

- Backoffice: http://localhost:8080/backoffice/ (admin@chasquiya.cl)
- Swagger: http://localhost:8080/swagger-ui.html
- Correos de prueba: http://localhost:8025

## Lo que está construido

**Hitos 0–8 (roadmap del blueprint):** identidad con JWT, perfil y verificación
de maestros, descubrimiento por cercanía con PostGIS, la transacción completa
con su máquina de estados, chat en tiempo real (WebSocket + STOMP), pago
simulado con comisión, calificaciones y disputas, y backoffice web.

**Fase 0–1 (visual y funcional):** sistema de diseño, navegación por pestañas
según rol, iconos reales, favoritos, filtros de búsqueda, fotos de perfil,
historial con "volver a contratar", direcciones guardadas.

**Fase 2 (legal y robustez):** Ley 21.719 (exportar datos y eliminar cuenta por
anonimización), términos y privacidad, recuperar contraseña por correo, centro
de notificaciones in-app, Swagger, CI escrito, dashboard con períodos y
gráficos.

**Fase 3 (cerrar el diseño original):** fotos del problema, resumen antes de
enviar, línea de tiempo del servicio, home completo, buscador por texto, agenda
del maestro, soporte con tickets, y mapa de maestros.

**Fase 4 (marketplace de verdad):**
- **Solicitud abierta**: el cliente publica un trabajo sin elegir maestro,
  varios cotizan y él compara y elige.
- **Cotización honesta**: precio `CERRADO` o `ESTIMADO`, costo de visita
  declarado por adelantado, y ajuste de precio que el cliente debe aprobar.

**Fase 5 (catálogo con precio):** cada maestro publica sus servicios con su
precio, marcados como **precio fijo** o **desde**. El cliente los ve en el
perfil y los pide directo; si es precio fijo, la solicitud llega ya cotizada a
ese monto y el maestro no tiene que responder nada.

**Fase 5b (el catálogo manda):** se eliminó la "tarifa referencial" del perfil.
El precio que ve el cliente es siempre el del **oficio que está buscando**: si
filtra gasfitería ve lo que ese maestro cobra por gasfitería, y si cambia a
electricidad cambia el número. Sin catálogo publicado, el maestro no aparece en
la búsqueda ni puede cotizar trabajos abiertos.

**Fase 6 (arreglos y rediseño, agosto 2026).** Nace de una lista de 11
problemas que Kevin encontró probando la app. Se resolvió por cortes:

- **Corte 1 — poder escribir** (`5a66ea9`): el teclado tapaba el campo en tres
  hojas de formulario que no tenían `KeyboardAvoidingView`; las píldoras de
  categoría se recortaban; y el selector de fecha era invisible en iPhone
  porque el spinner de iOS sigue el tema del **sistema**, no el de la app
  (faltaba `themeVariant`).
- **Corte 2 — mapa** (`7e994ff`): el marcador dibujado a mano fallaba distinto
  en cada plataforma por la misma causa. Ahora usa el pin nativo y el precio
  vive en la tarjeta inferior. **Cierra el bug de los 5 intentos de la Fase 3.**
- **Corte 3 — información que nadie veía** (`eaf1922`): pantalla "Mis
  calificaciones" para el maestro, y ficha del maestro en el backoffice con sus
  documentos. El admin aprobaba a ciegas: la tabla solo tenía Aprobar/Rechazar.
- **Notificaciones** (`3f403db`): el destino se decide por tipo de aviso, no por
  si trae `solicitudId`.
- **Home del maestro** (`439882d`): trabajos disponibles, en curso y
  calificación, grilla de accesos y un consejo contextual. El perfil dejó de ser
  pestaña y se abre como ventana desde el avatar, para los tres roles.
- **Home del cliente** (`51771ec`, `a889547`, `359627d`): cabecera con
  degradado, **publicar un trabajo arriba del todo**, categorías con color y
  recomendados.
- **Buscar** (`c503dca`, `01be3bc`, `bd38eb6`): tocar una categoría ahora
  filtra de verdad, los maestros a menos de 50 m dicen "muy cerca" en vez de
  quedarse sin distancia, y la fila de píldoras respira.

## Decisiones que NO hay que romper

Estas se tomaron por razones legales o de producto. Cambiarlas sin entenderlas
rompe algo importante.

**Ley 21.431 — el maestro es independiente.** La app no impone horarios, no
penaliza rechazar trabajos, no fija tarifas. Por eso:
- No existe interruptor de "disponible/no disponible" gestionado por la app.
- El maestro **cotiza o declina**, no "acepta o rechaza" un precio impuesto.
- Publicar una solicitud abierta **no empuja avisos** uno por uno: aparece en su
  lista de trabajos disponibles.
- La reputación es informativa, nunca sanción automática.
- **El catálogo de precios es del maestro, no de la plataforma.** No existe un
  tarifario de ChasquiYa!: cada uno publica sus servicios y sus montos, y solo
  de los oficios que tiene en su perfil.
- Un pedido de **precio fijo** entra ya cotizado, pero **no** queda cerrado: el
  cliente todavía acepta y el maestro puede declinar desde "Solicitudes"
  (estado `COTIZADO`). Sin esa salida, la app lo estaría atando a un trabajo
  que nunca eligió.
- **No existe un precio general del maestro.** Cada precio vive en un servicio
  del catálogo y se muestra junto al nombre de ese servicio: un monto suelto
  haría creer al cliente que ESE es el precio de cualquier trabajo.
- **Para aparecer hay que tener precios publicados de ese oficio**, tanto en la
  búsqueda y el mapa como para cotizar trabajos abiertos. No es fijar tarifas
  —los montos los pone él—, es el mismo tipo de requisito que estar verificado.
  El filtro va dentro de la consulta PostGIS, no después del `LIMIT 50`.

**Ley 19.496 — protección del consumidor.**
- **Nada se cobra si no estaba en la cotización que el cliente aceptó.** El
  costo de visita vive EN la cotización, no aparece después.
- El precio no cambia por decisión de una sola parte: el ajuste requiere
  aprobación explícita del cliente y el trabajo queda detenido mientras tanto.
- Un reclamo no se puede cerrar sin escribir una respuesta.

**Ley 21.719 — datos personales.**
- Eliminar cuenta **anonimiza**, no borra: se conservan los pagos por
  contabilidad y se limpian los datos personales.
- Se borran fotos, notificaciones, direcciones y favoritos.
- El mapa **nunca publica la coordenada exacta** del maestro: se difumina a una
  grilla de ~500 m (`UbicacionAproximada.java`), porque suele ser su casa.

**Pago simulado.** No hay pasarela ni se almacenan datos de tarjeta. Nunca.

**La máquina de estados es sagrada** (`EstadoServicio.java`). Cuando un flujo
nuevo no calzaba, se lo hizo pasar por los estados existentes en vez de abrir
atajos.

## Lo que falta

### Del roadmap (`docs/analisis-mejoras.md`)

| Pendiente | Valor | Esfuerzo |
|---|---|---|
| Chat con fotos | Medio | Muy bajo (la infraestructura ya está) |
| Insignias de verificación en el perfil | Medio | Bajo |
| Verificación de correo al registrarse | Medio | Medio |
| Portafolio del maestro | Medio | Medio |
| Comprobante de pago descargable | Bajo | Bajo |
| Dashboard: rankings, embudo, geografía | Bajo | Medio |
| Refresh tokens y auditoría del admin | Bajo | Medio |

### Deuda técnica

- **`fecha_preferida` se guarda como texto**, no como fecha. Por eso la agenda
  interpreta cadenas y no se puede filtrar por fecha en la base.

### Lo próximo acordado: Reclamos 2.0

Es lo que sigue en el plan. Son cuatro puntos de la lista de Kevin (3, 8, 9 y
11) que en realidad son **un hito**, no cuatro arreglos.

Hoy `TicketSoporte` tiene un solo campo `respuesta`: una respuesta y se acabó.
Ya trae `solicitudId` opcional, pero la app no lo ofrece al crear el reclamo.

Falta:

1. **Contexto**: elegir de qué servicio es el reclamo, y que el backoffice
   muestre el servicio, el maestro y la fecha. Hoy el admin lee un texto suelto
   sin saber de qué habla.
2. **Evidencias**: fotos adjuntas (la infraestructura de MinIO ya existe, ver
   `FotoSolicitudService`).
3. **Conversación**: tabla nueva de mensajes del ticket, para seguir aportando
   información mientras el reclamo esté abierto.
4. **Avisos**: notificar cuando el admin responde (tipo nuevo en
   `TipoNotificacion`).

Lleva migración propia. La regla de la Ley 19.496 que ya está y hay que
mantener: **un reclamo no se cierra sin respuesta escrita**.

### Agujeros de seguridad detectados (sin arreglar)

- **`/auth/registro` acepta el rol que le manden**: cualquiera puede
  registrarse como `ADMIN` desde la app y entrar al backoffice. Es lo más
  urgente de esta lista.
- **5 sitios con `s.getMaestroId().equals(...)`** que dan 500 en vez de 403 si
  llama un tercero: `SolicitudService` (519 y 528), `MensajeService`,
  `ChatAuthInterceptor` y `CalificacionService`.

### Pendiente de verificar en iPhone

No hay forma de ejecutar iOS en este entorno; ambos se escribieron razonando
sobre el código y **los tiene que probar Kevin**:

- Que se pueda tocar un pin del mapa y se abra la tarjeta del maestro.
- Que el calendario y el selector de hora aparezcan (era `themeVariant`).

### No es código, pero bloquea

1. **Revisión legal** de `app/src/datos/textosLegales.ts` — es un BORRADOR, lo
   debe revisar un abogado/a antes de operar con usuarios reales.
2. **Subir el repo a GitHub** — `.github/workflows/ci.yml` está escrito y
   esperando; hoy no corre porque el repo es solo local.
3. **Development build de Expo** — desbloquea notificaciones push reales.
4. **API key de Google Maps** — necesaria solo al publicar un APK de Android.

## Gotchas del entorno (Windows)

- `JAVA_HOME` debe exportarse en cada shell de Git Bash:
  `export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot"`
- Si el puerto 8080 está ocupado: `taskkill //F //IM java.exe`
- El teléfono llega al backend por la IP de la PC (`app/src/api/config.ts`), no
  por localhost. Requiere misma red y firewall abierto.
- Al instalar dependencias nativas nuevas hay que cerrar y reabrir Expo Go.
- **Emulador Android** instalado (agosto 2026): AVD `chasquiya`, Pixel 7,
  Android 15. Se levanta con
  `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd chasquiya`.
  La ubicación vuelve a California en cada arranque; se fija con
  `adb emu geo fix -70.6693 -33.4489` (**longitud primero**).
  Metro para el emulador va en el **8082**, porque Kevin suele tener su
  `expo start --tunnel` ocupando el 8081 para el teléfono.
- **Capturas del emulador**: `adb exec-out screencap -p > x.png` rompe el PNG en
  PowerShell (le mete BOM). Usar `adb shell screencap` + `adb pull`. Y para
  mirar un detalle de layout, **recortar y ampliar la captura**: a tamaño real
  un borde de 1 px que falta parece un problema de forma.
- **El puerto 8080 puede estar tomado sin que haya ningún Java corriendo**: si
  Claude Code abrió una conexión saliente y Windows le asignó el 8080 como
  puerto de origen, el backend no puede tomarlo. Se ve con
  `netstat -ano | grep ":8080 "`. Salida: levantar el backend en otro puerto
  (`--server.port=8090`) y apuntar `app/src/api/config.ts` ahí **temporalmente**.
  `config.ts` tiene que quedar siempre en 8080 al commitear.
- `curl` en Git Bash rompe UTF-8: usar ASCII en los cuerpos JSON de prueba.

## Datos de prueba

La base quedó sembrada con 1 admin, 5 maestros aprobados con catálogo y 2
clientes. **Todos con clave `1234`**:

| Correo | Quién |
|---|---|
| `admin@chasquiya.cl` | Admin |
| `maestro1@gmail.com` … `maestro5@gmail.com` | Luis, Carla, Diego, Paula, Marco |
| `cliente1@gmail.com`, `cliente2@gmail.com` | Kevin, Francisca |

Marco (maestro5) tiene dos oficios: sirve para probar que el precio cambia
según el oficio que se filtre.
