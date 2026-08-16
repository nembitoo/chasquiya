# Estado actual de ChasquiYa!

> Punto de partida para retomar el trabajo. Si estás leyendo esto en una
> conversación nueva: esto es lo que hay, lo que falta y lo que **no** hay que
> romper.
>
> Última actualización: agosto 2026 · 19 migraciones · 142 tests verdes.

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
| Catálogo de servicios con precio | ⭐ Alto | Medio |
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

### Bugs conocidos

- **Marcadores del mapa cortados en Android** (cosmético; el mapa funciona). Ya
  se descartaron cinco arreglos, ver `docs/fase-3.md`. La salida sugerida es
  usar un marcador estándar sin vista propia.

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
- `curl` en Git Bash rompe UTF-8: usar ASCII en los cuerpos JSON de prueba.
