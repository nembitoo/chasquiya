# Fase 3 — Cerrar las brechas del diseño original

Surge de comparar `Prompt para generar bocetos e interfaces de ChasquiYa!.md`
(las 25 pantallas del diseño) contra lo que existe. La app cubría ~80%.

Este documento lista lo que falta, **priorizado por impacto sobre esfuerzo**.

## Criterio de orden

Primero lo que se ve y se usa en cada servicio (fotos, revisar antes de enviar,
saber en qué va el trabajo). Al final lo que necesita decisiones nuevas.

| # | Rebanada | Estado | Commit |
|---|----------|--------|--------|
| 3a | Fotos en la solicitud | ✅ | `d47a8d1` |
| 3b | Resumen antes de enviar + línea de tiempo | ✅ | `5b0cf32` |
| 3c/3d | Home completo, buscador por texto, trabajos hechos | ✅ | `b3f8ca7` |
| 3e | Agenda del maestro | ✅ | `d0bd3bb` |
| 3f | Soporte y reclamos con tickets | ✅ | `bb47831` |
| 3g | Mapa de maestros | ✅ | Falta probarlo en el teléfono |

## Nota sobre el mapa (3g)

**Librería:** `react-native-maps`, que funciona en Expo Go sin configurar nada.
Se descartó `expo-maps` porque exige un *development build*.

⚠️ **Pendiente para cuando publiques en Android:** un APK propio necesita una
**API key de Google Maps** (proyecto en Google Cloud, SDK de Maps activado y la
key en `app.json` bajo `android.config.googleMaps.apiKey`). Es gratis, pero pide
una cuenta con tarjeta. Hoy no hace falta: en Expo Go anda con la key de Expo, y
en iOS usa Apple Maps, que no necesita key.

**Privacidad:** el mapa nunca publica la coordenada exacta del maestro (ver
`UbicacionAproximada.java`). La ubicación que registra suele ser su casa, así que
se lleva a una grilla de ~500 m antes de salir de la API. El marcador dice "zona
aproximada" para no prometer lo que no muestra.

## Detalle

### 3a · Fotos en la solicitud
Una foto del problema evita media conversación: el maestro cotiza mejor y el
cliente explica menos. Tabla `fotos_solicitud`, archivos en MinIO (igual que los
documentos de verificación), tope de 5 por solicitud. Se ven en el detalle del
servicio por ambas partes.

### 3b · Resumen antes de enviar + línea de tiempo
Hoy la solicitud se envía sin revisión previa, y el estado es solo una etiqueta.
Falta el paso de confirmación (pantalla 9 del diseño) y el progreso visual
`Solicitado → Cotizado → Aceptado → En curso → Completado` (pantalla 12).

### 3c · Home del cliente completo
El home tiene saludo, buscador y categorías. Faltan maestros cercanos, servicios
recientes y la ubicación actual (pantalla 4).

### 3d · Buscador por texto + trabajos realizados
Hoy solo se busca por categoría. Además, la tarjeta y el perfil del maestro no
muestran cuántos trabajos lleva completados, que es señal de confianza.

### 3e · Agenda del maestro
Pantalla 18. Lista de trabajos agrupada por fecha, **no** un calendario con
librería: para el volumen actual no se justifica.

### 3f · Soporte y reclamos
Pantalla 25. Existen las disputas (ligadas a un servicio), pero no un canal para
problemas que no son de un servicio puntual. Tickets con
`Nuevo → En revisión → Resuelto`, gestionados desde el backoffice.

### 3g · Mapa de maestros — PENDIENTE DE DECISIÓN
Pantalla 6. El backend ya calcula distancias con PostGIS; falta la vista.
Necesita una librería de mapas nativa, así que **espera aprobación explícita** y
además hay que probarla en el teléfono: puede requerir un *development build*.

## Fuera de alcance (decisiones ya tomadas, no son deuda)

- **Disponible / No disponible** del maestro y filtro por disponibilidad:
  un interruptor gestionado por la plataforma sugiere relación laboral
  (Ley 21.431).
- **Aceptar / Rechazar** del maestro: quedó como **Cotizar / Declinar**, porque
  el maestro fija su propio precio.
- **Métodos de pago con tarjeta**: el pago es simulado y nunca se almacenan
  datos de tarjeta. Llega con la pasarela real.
