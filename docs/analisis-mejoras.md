# Análisis de mejoras — ChasquiYa!
### Benchmarking, funcionalidades, dashboard, rediseño móvil y sistema de diseño

> **Documento de trabajo.** Guía de desarrollo para llevar ChasquiYa! de un MVP funcional
> a un marketplace de servicios profesional y competitivo, **sin perder el realismo** de un
> proyecto individual, a media jornada y con costo cero en desarrollo.
>
> Fecha: agosto 2026 · Basado en el estado real del código (9 hitos completos, 84 tests)

---

## Índice

1. [Punto de partida: qué hay hoy](#1-punto-de-partida-qué-hay-hoy)
2. [Benchmarking de marketplaces](#2-benchmarking-de-marketplaces)
3. [Filtro legal: qué NO copiar](#3-filtro-legal-qué-no-copiar)
4. [Funcionalidades propuestas por categoría](#4-funcionalidades-propuestas-por-categoría)
5. [Dashboard: propuesta completa](#5-dashboard-propuesta-completa)
6. [KPIs y métricas financieras](#6-kpis-y-métricas-financieras)
7. [Rediseño de la app móvil](#7-rediseño-de-la-app-móvil)
8. [Sistema de diseño](#8-sistema-de-diseño)
9. [Componentes reutilizables](#9-componentes-reutilizables)
10. [Tecnologías y herramientas recomendadas](#10-tecnologías-y-herramientas-recomendadas)
11. [Qué necesito de tu parte](#11-qué-necesito-de-tu-parte)
12. [Protocolo para las referencias visuales](#12-protocolo-para-las-referencias-visuales)
13. [Roadmap y priorización general](#13-roadmap-y-priorización-general)
14. [Futuras versiones](#14-futuras-versiones)

---

## 1. Punto de partida: qué hay hoy

Antes de proponer, conviene ser preciso sobre lo que ya existe. **ChasquiYa! no es un
prototipo**: es un marketplace funcional de punta a punta.

### Lo que ya funciona
| Área | Estado |
|---|---|
| Identidad | Registro/login, JWT, BCrypt, 3 roles (cliente, maestro, admin) |
| Perfil del maestro | Oficios, ubicación PostGIS, tarifa, documentos en MinIO, aprobación por admin |
| Descubrimiento | Búsqueda por cercanía real (ST_Distance/ST_DWithin) + filtro por oficio |
| Transacción | Máquina de estados de 9 estados con validación de permisos y transiciones |
| Comunicación | Chat en tiempo real (WebSocket + STOMP) con badges de no leídos |
| Pagos | Pago simulado, comisión 10% descontada al maestro, panel de ingresos |
| Confianza | Calificación mutua (estrellas + puntualidad/calidad/trato), disputas con mediación |
| Backoffice | Panel web con métricas, gestión de maestros/usuarios/servicios y disputas |

**Stack:** React Native + Expo SDK 54 + TypeScript · Spring Boot 4 + Java 21 ·
PostgreSQL 16 + PostGIS · MinIO · Flyway (V1–V9) · Docker Compose.

### Inventario actual del frontend
- **16 pantallas**, **6 componentes** reutilizables (`Boton`, `CampoTexto`, `EstadoBadge`,
  `BotonChat`, `Estrellas`, `SelectorFechaHora`)
- **Tokens de diseño**: 10 colores, 5 espacios, 4 radios, 4 tamaños de tipografía
- **13 dependencias** de producción
- **Navegación**: solo *stack* (pila de pantallas)

### Diagnóstico honesto: por qué "se ve básica"

No es falta de funcionalidades — es **falta de sistema visual**. Cinco causas concretas,
en orden de impacto:

1. **No hay navegación por pestañas.** Todo cuelga de una pila desde "Inicio", que es una
   pantalla-menú con botones apilados. Las apps comerciales tienen una **barra inferior
   permanente**: es el cambio estructural que más cambia la percepción.
2. **Los iconos son emojis.** 🔧⚡🎨 se ven distinto en cada teléfono y gritan "prototipo".
3. **No hay imágenes.** Sin fotos de perfil ni de trabajos, todo es texto sobre blanco.
   Los marketplaces son visuales por naturaleza.
4. **Tipografía del sistema, sin jerarquía.** Solo 4 tamaños y sin fuente propia.
5. **Espaciado inconsistente y botones apilados.** El problema que notaste: acciones
   primarias y secundarias con el mismo peso, pegadas, sin agrupación visual.

> **Conclusión estratégica:** el mayor salto de percepción **no viene de agregar 30
> funcionalidades**, sino de arreglar estas 5 cosas + agregar 4 o 5 funcionalidades
> que los usuarios esperan (favoritos, notificaciones, historial, fotos, búsqueda).
> Todo eso está en la Fase 1 del roadmap.

---

## 2. Benchmarking de marketplaces

Análisis basado en los patrones consolidados de cada plataforma. Para cada una: qué hace
bien, **qué tomamos** y **qué NO tomamos** (por escala, costo o riesgo legal).

### 2.1 Uber
| | |
|---|---|
| **Modelo** | Marketplace de transporte con asignación algorítmica |
| **Fortalezas UX** | Estado del viaje siempre visible; precio conocido antes de confirmar; rating bidireccional; teléfono enmascarado; flujo de 3 toques |
| **✅ Tomamos** | **Seguimiento por etapas visual** (timeline con el estado actual destacado); **precio claro antes de confirmar**; rating bidireccional (ya lo tenemos) |
| **❌ NO tomamos** | Asignación automática forzada, tasas de aceptación obligatorias, penalización por rechazar — **riesgo legal directo** (ver §3) |

### 2.2 Uber Eats / PedidosYa / Rappi
| | |
|---|---|
| **Modelo** | Delivery on-demand, altísima frecuencia |
| **Fortalezas UX** | Home dominado por **categorías con iconos**; buscador prominente arriba; tarjetas ricas (foto + rating + tiempo + precio); seguimiento con timeline animado; cupones y promos; "volver a pedir" |
| **✅ Tomamos** | **Home por categorías** (tu documento de diseño ya lo pedía); **tarjetas con foto y rating**; buscador arriba; **historial con "volver a contratar"**; cupones (fase 2) |
| **❌ NO tomamos** | Gamificación agresiva del repartidor; promos permanentes que erosionan el margen; tiempos de entrega prometidos (un maestro no es un delivery) |

### 2.3 Mercado Libre
| | |
|---|---|
| **Modelo** | Marketplace de productos con reputación fuerte y protección al comprador |
| **Fortalezas UX** | **Filtros con facetas** y contadores; **reputación muy detallada** (nivel, % de ventas completadas, tiempos); preguntas públicas; historial de compras completo; **mediación de reclamos** con evidencias |
| **✅ Tomamos** | **Filtros potentes** (distancia, precio, calificación, disponibilidad); **reputación detallada** en el perfil del maestro; **disputas con evidencia y plazos** |
| **❌ NO tomamos** | Preguntas públicas (en servicios el chat privado funciona mejor); catálogo/envíos |

### 2.4 Airbnb
| | |
|---|---|
| **Modelo** | Marketplace de alojamiento, alto valor por transacción, mucha confianza involucrada |
| **Fortalezas UX** | Fichas ricas con galería de fotos; **wishlist (favoritos)**; **reseñas por categorías** (limpieza, comunicación, ubicación); políticas de cancelación explícitas; verificación de identidad con insignias; **badge "Superhost"** |
| **✅ Tomamos** | **Favoritos**; **reseñas por categorías** (ya tienes puntualidad/calidad/trato ✔); **insignias de verificación**; **políticas de cancelación claras**; galería de fotos del maestro |
| **❌ NO tomamos** | Calendario de disponibilidad estricto (ojo legal: la disponibilidad debe ser **declarada voluntariamente**, no impuesta) |

### 2.5 Fiverr
| | |
|---|---|
| **Modelo** | Marketplace de servicios digitales con **paquetes de precio fijo** |
| **Fortalezas UX** | El prestador **publica servicios con precio** (básico/estándar/premium) → el cliente compra sin negociar; niveles de vendedor; entregables y plazos claros |
| **✅ Tomamos** | **Catálogo de servicios con precio publicado** — la mejora individual de mayor impacto para ChasquiYa! (ver C8/P1): elimina la fricción de cotizar cada cosa |
| **❌ NO tomamos** | Estructura de 3 paquetes obligatorios (excesiva para oficios); métricas de respuesta que presionan al prestador |

### 2.6 TaskRabbit
| | |
|---|---|
| **Modelo** | **El más parecido a ChasquiYa!**: tareas del hogar con prestadores independientes |
| **Fortalezas UX** | **Tarifa por hora publicada** por cada "tasker"; catálogo de tareas típicas (armar mueble, montar TV); selección por precio + rating + disponibilidad; chat; pago tras completar; seguro de responsabilidad |
| **✅ Tomamos** | **Tarifa por hora/por trabajo visible**; **catálogo de trabajos típicos** por oficio; comparación directa entre maestros |
| **❌ NO tomamos** | Seguro (requiere aseguradora real); verificación de antecedentes automatizada (tiene costo) |

### 2.7 Thumbtack (referencia adicional muy relevante)
| | |
|---|---|
| **Modelo** | El cliente publica una necesidad y **varios profesionales cotizan** |
| **✅ Tomamos** | **Solicitud abierta a varios maestros** — hoy ChasquiYa! es 1-a-1 (eliges maestro → solicitas). El modelo de "publicar y recibir cotizaciones" resuelve el problema de que el cliente no sepa a quién elegir. Es la segunda mejora estructural más importante. |

### 2.8 Síntesis: patrones comunes a todas
Los 8 patrones que **toda** plataforma consolidada tiene y ChasquiYa! aún no:

1. Navegación por pestañas inferiores permanentes
2. Fotos en todo (perfil, trabajos, solicitudes)
3. Búsqueda por texto + filtros combinables
4. Favoritos / guardados
5. Notificaciones (push + centro in-app)
6. Historial rico con recompra
7. Seguimiento visual del estado
8. Perfil de usuario editable con configuración

---

## 3. Filtro legal: qué NO copiar

Esta sección es **la que ninguna investigación genérica te va a dar**, y es la que protege
el proyecto. La mayoría de los patrones de Uber/Rappi asumen una relación de control sobre
el prestador que en Chile es **jurídicamente peligrosa**.

### Ley 21.431 — riesgo de recalificación laboral
El riesgo #1 del proyecto es que la relación con el maestro se interprete como **vínculo
laboral dependiente**. Estos patrones aumentan ese riesgo y **quedan descartados**:

| Patrón común en apps | Por qué es riesgoso | Alternativa segura para ChasquiYa! |
|---|---|---|
| Asignación automática de trabajos | La plataforma dirige el trabajo | El maestro elige qué solicitudes tomar |
| Tasa de aceptación mínima | Castiga el rechazo → subordinación | Rechazar es libre y sin consecuencia |
| Bloqueo automático por baja nota | Sanción unilateral | La nota es informativa; suspender lo decide un admin caso a caso |
| Tarifas fijadas por la plataforma | Fija el precio del servicio ajeno | El maestro define su tarifa; la plataforma sugiere rangos |
| Horarios obligatorios / turnos | Control de jornada | Disponibilidad **declarada voluntariamente** |
| Penalización por cancelar | Disciplina laboral | Cancelación libre antes de iniciar (ya implementado ✔) |

> **Ya lo estás haciendo bien:** la máquina de estados permite al maestro cancelar sin
> castigo, y la reputación está documentada explícitamente como no sancionadora. Mantén
> ese criterio en cada funcionalidad nueva.

### Ley 21.719 — protección de datos (vigencia plena: 1 dic 2026)
**Pendiente crítico:** el RF-12 del blueprint (exportar y eliminar datos) **no está
implementado**. Con la vigencia plena tan cerca, esto sube a **prioridad alta legal**.

### Ley 19.496 / SERNAC
- Precios y comisiones informados **antes** de contratar ✔ (ya lo hace la pantalla de pago)
- Mecanismo de reclamos accesible ✔ (disputas) → mejorable con centro de ayuda
- Definir y publicar **hasta dónde responde la plataforma** (términos y condiciones reales)

---

## 4. Funcionalidades propuestas por categoría

Formato de cada ficha: **Qué es · Problema · En ChasquiYa! · Usuarios · Prioridad ·
Complejidad · Beneficio · Referencia**.

Complejidad estimada en jornadas de trabajo tuyas (media jornada):
**Baja** = 1–2 sesiones · **Media** = 3–6 sesiones · **Alta** = 7+ sesiones

---

### 4.1 Cliente

#### C1 · Fotos en perfiles y solicitudes ⭐
- **Qué es:** avatar del usuario, galería de trabajos del maestro y fotos del problema en la solicitud.
- **Problema:** sin imágenes la app se ve vacía y el cliente no puede evaluar al maestro ni explicar su problema.
- **En ChasquiYa!:** reusar el módulo `documentos/` + MinIO que ya existe. Nuevo endpoint de avatar y de galería; `expo-image-picker` ya está instalado.
- **Usuarios:** cliente, maestro
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** el cambio visual más grande por unidad de esfuerzo; mejora la confianza y la calidad de las cotizaciones.
- **Referencia:** Airbnb, TaskRabbit, Mercado Libre

#### C2 · Favoritos ("Mis maestros") ⭐
- **Qué es:** guardar maestros para volver a contratarlos.
- **Problema:** hoy el cliente que quedó feliz con alguien tiene que volver a buscarlo desde cero.
- **En ChasquiYa!:** tabla `favoritos(cliente_id, maestro_id)`, corazón en la tarjeta de búsqueda y en el perfil, pestaña en el perfil del cliente.
- **Usuarios:** cliente
- **Prioridad:** **ALTA** · **Complejidad:** Baja
- **Beneficio:** recurrencia — el activo más valioso de un marketplace de servicios.
- **Referencia:** Airbnb (wishlist), Rappi

#### C3 · Historial con filtros y "volver a contratar" ⭐
- **Qué es:** pantalla de historial separada de los servicios activos, con filtros por estado/fecha/categoría.
- **Problema:** "Mis servicios" mezcla lo activo con lo terminado; a los 20 servicios es inusable.
- **En ChasquiYa!:** dividir en pestañas *Activos / Historial*; botón "Volver a contratar" que precarga una solicitud nueva con los mismos datos.
- **Usuarios:** cliente, maestro
- **Prioridad:** **ALTA** · **Complejidad:** Baja
- **Beneficio:** usabilidad a escala + recompra en 2 toques.
- **Referencia:** Uber Eats, Mercado Libre

#### C4 · Búsqueda por texto y filtros combinables ⭐
- **Qué es:** buscador ("¿qué servicio necesitas?") + filtros de distancia, precio, calificación mínima y disponibilidad, con orden configurable.
- **Problema:** hoy solo se filtra por oficio y se ordena por distancia. No hay forma de decir "electricista barato bien evaluado a menos de 5 km".
- **En ChasquiYa!:** extender `DescubrimientoService` con parámetros opcionales; búsqueda de texto sobre descripción y oficio (PostgreSQL `ILIKE` o full-text search, sin librerías nuevas).
- **Usuarios:** cliente
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** el descubrimiento deja de ser una lista y pasa a ser una herramienta.
- **Referencia:** Mercado Libre (facetas), Airbnb

#### C5 · Home rediseñado por categorías ⭐
- **Qué es:** pantalla de inicio real con saludo, ubicación, buscador, grilla de categorías con iconos, maestros recomendados, cercanos y servicios recientes.
- **Problema:** la pantalla "Inicio" actual es un menú de botones, no un home.
- **En ChasquiYa!:** exactamente la pantalla 4 de tu documento de diseño. Reutiliza los endpoints de descubrimiento existentes.
- **Usuarios:** cliente
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** primera impresión profesional; es la pantalla que más se ve.
- **Referencia:** Rappi, PedidosYa, Uber Eats

#### C6 · Perfil del cliente con direcciones guardadas
- **Qué es:** editar datos, foto, y guardar direcciones ("Casa", "Trabajo").
- **Problema:** el cliente reescribe su dirección en cada solicitud; no puede cambiar sus datos.
- **En ChasquiYa!:** tabla `direcciones`; selector en `NuevaSolicitudScreen`.
- **Usuarios:** cliente
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** reduce fricción en el momento crítico (crear la solicitud).
- **Referencia:** Rappi, Uber Eats

#### C7 · Solicitud abierta a varios maestros ⭐⭐
- **Qué es:** el cliente publica su necesidad y **varios maestros cercanos cotizan**; elige la mejor.
- **Problema:** hoy debe elegir a ciegas **antes** de tener precio. Si ese maestro no responde, el flujo muere.
- **En ChasquiYa!:** cambio estructural — la solicitud deja de tener `maestro_id` obligatorio; se crea `solicitud_destinatarios` o se difunde por oficio+zona; múltiples cotizaciones por solicitud; al aceptar una, las demás se cierran.
- **Usuarios:** cliente, maestro
- **Prioridad:** **MEDIA-ALTA** · **Complejidad:** **Alta** (toca la máquina de estados)
- **Beneficio:** resuelve el problema #1 del arranque en frío (el cliente no sabe a quién elegir) y aumenta la competencia sana de precios.
- **Referencia:** Thumbtack, Houzz
- ⚠️ **Ojo:** afecta el núcleo del Hito 4. Hacerlo como un hito propio, con tests primero.

#### C8 · Seguimiento visual del servicio (timeline)
- **Qué es:** línea de tiempo con las etapas (Solicitado → Cotizado → Aceptado → En ejecución → Completado), marcando la actual.
- **Problema:** hoy el estado es solo una etiqueta de color; el cliente no ve el camino completo.
- **En ChasquiYa!:** componente `<Timeline>` alimentado por el mismo enum que ya existe.
- **Usuarios:** cliente, maestro
- **Prioridad:** **MEDIA** · **Complejidad:** Baja
- **Beneficio:** claridad y sensación de control; reduce consultas al chat.
- **Referencia:** Uber, Rappi, PedidosYa

---

### 4.2 Prestador de servicios (maestro)

#### P1 · Catálogo de servicios con precio ⭐⭐
- **Qué es:** el maestro publica servicios concretos con precio ("Cambio de enchufe — $15.000", "Revisión eléctrica — $25.000").
- **Problema:** hoy todo pasa por cotización manual: el cliente no sabe cuánto cuesta nada hasta pedir.
- **En ChasquiYa!:** tabla `servicios_maestro(perfil_id, titulo, descripcion, precio, duracion_estimada)`; se muestran en el perfil público y son solicitables directo (precotizados).
- **Usuarios:** maestro (publica), cliente (compra)
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** reduce enormemente la fricción; acorta el ciclo solicitud→aceptación; hace comparables a los maestros.
- **Referencia:** Fiverr, TaskRabbit
- ✅ **Legal:** el precio lo pone **el maestro**, nunca la plataforma.

#### P2 · Portafolio de trabajos
- **Qué es:** galería de fotos de trabajos anteriores (antes/después).
- **Problema:** el maestro no tiene cómo demostrar su calidad más allá de las estrellas.
- **En ChasquiYa!:** extensión del módulo `documentos/`, pero público.
- **Usuarios:** maestro
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** diferenciación entre maestros; más conversión.
- **Referencia:** Airbnb, Houzz, Instagram

#### P3 · Disponibilidad declarada + modo "no disponible"
- **Qué es:** interruptor de disponibilidad y días/horarios en que **el maestro decide** trabajar.
- **Problema:** el cliente solicita a maestros que están de vacaciones o copados.
- **En ChasquiYa!:** campo `disponible` en el perfil + franjas horarias opcionales; los no disponibles se muestran al final o con etiqueta.
- **Usuarios:** maestro
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** menos solicitudes muertas.
- **Referencia:** Uber (modo en línea), TaskRabbit
- ⚠️ **Legal:** debe ser **declarativo y libre**, nunca una obligación de estar disponible.

#### P4 · Agenda del maestro
- **Qué es:** vista de calendario con los trabajos próximos (pantalla 18 de tu diseño).
- **Problema:** el maestro ve una lista, no su semana.
- **En ChasquiYa!:** con la fecha ya en formato ISO (lo dejamos preparado), agrupar por día.
- **Usuarios:** maestro
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** herramienta de trabajo real → retención del maestro.
- **Referencia:** TaskRabbit, Booksy
- 📌 **Nota técnica:** aquí conviene migrar `fecha_preferida` de texto a `timestamptz`.

#### P5 · Panel de ingresos mejorado + exportación
- **Qué es:** filtros por período, detalle por servicio y exportar a CSV.
- **Problema:** el maestro necesita esos datos para su contabilidad (boletas, SII).
- **En ChasquiYa!:** extender `IngresosScreen` y el endpoint `/maestros/mis-ingresos`.
- **Usuarios:** maestro
- **Prioridad:** **MEDIA** · **Complejidad:** Baja
- **Beneficio:** utilidad real fuera de la app; muy valorado por el lado difícil del marketplace.
- **Referencia:** Uber (resumen de ganancias), Mercado Pago

#### P6 · Plantillas de cotización rápida
- **Qué es:** guardar cotizaciones frecuentes para responder en un toque.
- **Prioridad:** **BAJA** · **Complejidad:** Baja
- **Beneficio:** velocidad de respuesta → más trabajos ganados.
- **Referencia:** Fiverr (respuestas rápidas)

---

### 4.3 Comunicación

#### CM1 · Notificaciones push reales ⭐
- **Qué es:** avisos al teléfono cuando llega una solicitud, cotización, mensaje o pago.
- **Problema:** hoy el maestro solo se entera si abre la app. **Es la pieza que falta para que el marketplace funcione de verdad**: sin push, los tiempos de respuesta se disparan.
- **En ChasquiYa!:** `expo-notifications` + tabla `dispositivos(usuario_id, token_expo)`; el backend llama a la API de Expo Push (gratis) en los eventos clave.
- **Usuarios:** todos
- **Prioridad:** **ALTA** · **Complejidad:** Media-Alta
- **Beneficio:** el más alto de todas las funcionalidades pendientes.
- **Referencia:** todas
- ⚠️ **Requisito:** necesita un *development build* de Expo (EAS free tier). Es el momento de dar ese paso.

#### CM2 · Centro de notificaciones in-app
- **Qué es:** campanita con historial de avisos.
- **Problema:** las push se pierden; no hay registro consultable.
- **En ChasquiYa!:** tabla `notificaciones` + pantalla; funciona **aunque no haya push**.
- **Usuarios:** todos
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** cubre el 70% del valor del push sin necesitar dev build.
- **Referencia:** Mercado Libre, Rappi

#### CM3 · Chat mejorado: fotos y estados
- **Qué es:** adjuntar fotos, marcar leído/entregado, indicador de escritura.
- **En ChasquiYa!:** el WebSocket ya está; falta el canal de imágenes (MinIO) y eventos de estado.
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** menos malentendidos ("mándame una foto del enchufe").
- **Referencia:** WhatsApp, Uber

#### CM4 · Correos transaccionales
- **Qué es:** email de bienvenida, recuperación de contraseña, comprobante de pago.
- **En ChasquiYa!:** **Mailpit ya está levantado en Docker sin usarse**. Spring Mail + plantillas.
- **Prioridad:** **MEDIA** (alta si se implementa recuperar contraseña) · **Complejidad:** Baja
- **Referencia:** todas

---

### 4.4 Pagos y comisiones

#### PG1 · Pasarela de pago real
- **Qué es:** Webpay (Transbank), Mercado Pago o Khipu.
- **Problema:** el pago simulado no cierra el negocio.
- **En ChasquiYa!:** el módulo `pagos/` ya está diseñado para enchufarla (el registro contable existe).
- **Prioridad:** **ALTA cuando se valide el negocio** — no antes · **Complejidad:** Alta
- **Beneficio:** habilita ingresos reales.
- **Referencia:** todas
- 💰 **Costo:** comisión por transacción + requisitos tributarios (SpA, inicio de actividades)

#### PG2 · Retención hasta completar (escrow)
- **Qué es:** el dinero se retiene y se libera al maestro cuando el servicio se completa.
- **Problema:** protege a ambas partes; es la base para que las disputas tengan sentido.
- **Prioridad:** **MEDIA** (junto con PG1) · **Complejidad:** Alta
- **Referencia:** Mercado Pago, Airbnb, Fiverr
- ⚠️ Tiene implicancias tributarias serias: definir con contador antes.

#### PG3 · Comprobantes descargables
- **Qué es:** PDF/HTML con el detalle del servicio, monto, comisión y fecha.
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Referencia:** Uber, Mercado Libre

#### PG4 · Liquidaciones al maestro (payouts)
- **Qué es:** panel de "pagos por recibir" y ciclo de liquidación (ej. semanal).
- **Prioridad:** **MEDIA** (requiere PG1) · **Complejidad:** Alta
- **Referencia:** Uber, Rappi

#### PG5 · Comisión configurable por categoría o plan
- **Qué es:** distintos porcentajes por oficio, o menor comisión para maestros suscritos.
- **En ChasquiYa!:** hoy es una variable global (`COMISION_PORCENTAJE`); pasa a tabla de reglas.
- **Prioridad:** **BAJA** · **Complejidad:** Baja
- **Beneficio:** palanca de negocio para atraer oferta.

---

### 4.5 Geolocalización

#### G1 · Autocompletado de direcciones ⭐
- **Qué es:** al escribir la dirección, sugerencias reales con coordenadas.
- **Problema:** hoy la dirección es texto libre → datos sucios y sin coordenadas exactas.
- **En ChasquiYa!:** **Nominatim/Photon de OpenStreetMap (gratis, sin tarjeta)**, acotado a Chile.
- **Prioridad:** **ALTA** · **Complejidad:** Media
- **Beneficio:** datos limpios + distancias reales + base para el mapa.
- **Referencia:** todas

#### G2 · Mapa de maestros
- **Qué es:** la pantalla 6 de tu diseño — mapa con marcadores y tarjeta inferior.
- **En ChasquiYa!:** MapLibre + tiles de OpenStreetMap (gratis). Los puntos PostGIS ya existen.
- **Prioridad:** **MEDIA** · **Complejidad:** Media-Alta
- **Beneficio:** muy vistoso para demostrar; útil de verdad en zonas densas.
- **Referencia:** Uber, Airbnb

#### G3 · Radio de cobertura del maestro
- **Qué es:** el maestro define hasta dónde se mueve (ej. 10 km).
- **Problema:** hoy aparece en búsquedas de clientes a los que no iría.
- **Prioridad:** **MEDIA** · **Complejidad:** Baja (un campo + un `AND` en la consulta)
- **Referencia:** TaskRabbit

---

### 4.6 Seguridad

#### S1 · Recuperar contraseña ⭐
- **Qué es:** el flujo "¿Olvidaste tu contraseña?" — **está en tu diseño pero no implementado**.
- **Problema:** hoy un usuario que olvida su clave pierde la cuenta para siempre.
- **En ChasquiYa!:** token temporal + correo por Mailpit (ya instalado).
- **Prioridad:** **ALTA** · **Complejidad:** Baja-Media
- **Beneficio:** funcionalidad básica esperada; su ausencia se nota de inmediato.

#### S2 · Verificación de correo y teléfono
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** reduce cuentas falsas; base de la confianza.
- **Referencia:** todas

#### S3 · Refresh tokens
- **Qué es:** hoy el token dura 12 h y luego hay que volver a entrar, sin renovación.
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Referencia:** estándar de la industria

#### S4 · Exportar y eliminar mis datos (Ley 21.719) ⚖️
- **Qué es:** el RF-12 del blueprint.
- **Problema:** **obligación legal** con vigencia plena el 1 de diciembre de 2026.
- **En ChasquiYa!:** endpoint que arma un JSON con todo lo del usuario + borrado con anonimización (conservando el registro contable).
- **Prioridad:** **ALTA (legal)** · **Complejidad:** Media
- **Referencia:** cualquier app post-GDPR

#### S5 · Insignias de verificación
- **Qué es:** "Identidad verificada", "Documentos aprobados", "X trabajos completados".
- **Prioridad:** **MEDIA** · **Complejidad:** Baja
- **Beneficio:** confianza visible en las tarjetas de búsqueda.
- **Referencia:** Airbnb, Mercado Libre

#### S6 · Auditoría de acciones del admin
- **Qué es:** log de quién aprobó, suspendió o resolvió qué y cuándo.
- **Prioridad:** **MEDIA** · **Complejidad:** Baja
- **Beneficio:** trazabilidad; exigible legalmente y útil ante conflictos.

#### S7 · Límite de intentos (rate limiting)
- **Prioridad:** **MEDIA** · **Complejidad:** Media
- **Beneficio:** protege el login de fuerza bruta.

---

### 4.7 Marketing y fidelización

| # | Funcionalidad | Descripción | Usuarios | Prioridad | Compl. | Referencia |
|---|---|---|---|---|---|---|
| M1 | **Cupones y descuentos** | Códigos con % o monto fijo, vigencia y tope de usos | Cliente | Media | Media | Rappi, PedidosYa |
| M2 | **Programa de referidos** | Código propio; ambos ganan crédito | Ambos | Media | Media | Uber, Rappi |
| M3 | **Banners promocionales** | Espacio en el home administrado desde el backoffice | Cliente | Baja | Baja | Rappi |
| M4 | **Compartir perfil (deep links)** | El maestro difunde su perfil por WhatsApp | Maestro | Baja | Media | Fiverr, Airbnb |
| F1 | **Niveles de maestro** | Bronce/Plata/Oro por trabajos y calificación | Maestro | Media | Media | Fiverr, Airbnb (Superhost) |
| F2 | **Créditos para clientes** | Puntos por servicio que se canjean como descuento | Cliente | Baja | Media | Rappi Prime |
| F3 | **Suscripción del maestro** | Plan mensual con comisión reducida y destaque | Maestro | Baja | Media | Fiverr, Thumbtack |

> ⚠️ **F1 con cuidado legal:** los niveles deben ser **reconocimiento**, no un sistema que
> restrinja el acceso al trabajo de quien tiene nivel bajo.

---

### 4.8 Soporte y reclamos

| # | Funcionalidad | Descripción | Prioridad | Compl. | Referencia |
|---|---|---|---|---|---|
| SR1 | **Centro de ayuda / FAQ** | Preguntas frecuentes en la app y contacto | Media | Baja | todas |
| SR2 | **Disputas con evidencia** | Adjuntar fotos y comentarios de ambas partes, con plazos | Media | Media | Mercado Libre |
| SR3 | **Reportar usuario o contenido** | Botón de denuncia que llega al backoffice | Media | Baja | Airbnb, ML |
| SR4 | **Tickets de soporte** | Conversación con el equipo, con estados | Baja | Media | Mercado Libre |
| SR5 | **Términos y política de privacidad** | Documentos reales aceptados al registrarse | **Alta (legal)** | Baja | todas |

---

## 5. Dashboard: propuesta completa

### 5.1 Diagnóstico del actual
Hoy el backoffice tiene 5 secciones y 11 tarjetas de métricas planas. Funciona, pero:
- no hay **evolución temporal** (todo es un total acumulado)
- no hay **comparación entre períodos**
- no hay **rankings** (mejores maestros, categorías más pedidas)
- no hay **alertas** (qué necesita atención hoy)
- no hay **filtros de fecha**
- los gráficos son barras HTML simples

### 5.2 Estructura propuesta: 15 secciones

```
┌─────────────────────────────────────────────────────────┐
│  BARRA SUPERIOR: logo · buscador global · 🔔 · admin ▾  │
├───────────────┬─────────────────────────────────────────┤
│ MENÚ LATERAL  │  CONTENIDO                              │
│               │  ┌───────────────────────────────────┐  │
│ 📊 Inicio     │  │ Filtro de período: Hoy/7d/30d/Año │  │
│ 👥 Usuarios   │  ├───────────────────────────────────┤  │
│ 🔧 Prestadores│  │ KPIs con variación vs período     │  │
│ 🧰 Servicios  │  │ anterior (↑12%)                   │  │
│ 🏷️ Categorías │  ├───────────────────────────────────┤  │
│ 📋 Solicitudes│  │ Gráficos: ingresos, servicios     │  │
│ 💳 Pagos      │  ├───────────────────────────────────┤  │
│ 💰 Comisiones │  │ Rankings + actividad reciente     │  │
│ 🔄 Transacc.  │  └───────────────────────────────────┘  │
│ ⚠️ Reclamos   │                                         │
│ ⭐ Calificac. │                                         │
│ 📈 Estadíst.  │                                         │
│ 📄 Reportes   │                                         │
│ 🔔 Notificac. │                                         │
│ ⚙️ Config.    │                                         │
└───────────────┴─────────────────────────────────────────┘
```

### 5.3 Detalle de cada sección

#### 1. Inicio (resumen ejecutivo)
- **Muestra:** selector de período (hoy / 7 / 30 / 90 días / año / personalizado); 6 KPIs
  principales con **variación vs. período anterior**; gráfico de líneas de ingresos y
  comisiones; gráfico de barras de servicios por día; dona de servicios por estado;
  **panel de alertas** (maestros pendientes, disputas abiertas, pagos atrasados,
  usuarios reportados); actividad reciente (últimos 10 eventos).
- **Acciones:** ir directo a lo que requiere atención; cambiar período; exportar resumen.

#### 2. Usuarios
- **Muestra:** tabla con búsqueda y filtros (rol, estado, fecha de registro, actividad);
  columnas: nombre, correo, teléfono, rol, servicios, gasto/ingreso total, última
  actividad, estado.
- **Acciones:** ver ficha 360°, suspender/reactivar, reenviar verificación, exportar CSV.

#### 3. Prestadores (maestros)
- **Muestra:** tabla enriquecida — oficios, zona, calificación, trabajos completados,
  tasa de aceptación *(informativa, nunca sancionadora)*, ingresos generados, comisión
  aportada, estado de verificación, documentos.
- **Acciones:** aprobar/rechazar con motivo, ver documentos, ver perfil público, suspender,
  destacar (si se implementa marketing).

#### 4. Servicios
- **Muestra:** todas las transacciones con filtros por estado, categoría, fecha, monto,
  comuna. Detalle expandible con la línea de tiempo del servicio y su chat.
- **Acciones:** ver detalle, forzar transición (excepcional, auditado), abrir disputa
  administrativa, exportar.

#### 5. Categorías
- **Muestra:** los 9 oficios con demanda (solicitudes), oferta (maestros activos), ticket
  promedio, tasa de conversión y **ratio oferta/demanda** — clave para saber dónde
  reclutar maestros.
- **Acciones:** activar/desactivar categorías, editar nombre e icono, crear nuevas.

#### 6. Solicitudes
- **Muestra:** el embudo: solicitadas → cotizadas → aceptadas → completadas, con
  porcentajes de caída en cada paso. Solicitudes sin respuesta hace más de X horas.
- **Acciones:** identificar cuellos de botella; contactar partes.

#### 7. Pagos
- **Muestra:** todos los pagos con método, monto, estado, fecha; totales por período;
  pagos fallidos.
- **Acciones:** ver comprobante, marcar revisado, exportar contabilidad.

#### 8. Comisiones
- **Muestra:** comisión generada por período, por categoría y por maestro; **comisiones
  cobradas vs. pendientes**; comisión promedio; evolución del *take rate*.
- **Acciones:** ajustar porcentaje (global o por categoría), exportar para el SII.

#### 9. Transacciones (libro contable)
- **Muestra:** movimiento por movimiento — cobro al cliente, comisión retenida,
  liquidación al maestro. Cuadratura del período.
- **Acciones:** exportar CSV/Excel, filtrar por tipo.

#### 10. Reclamos y disputas
- **Muestra:** cola priorizada por antigüedad; estados **Nuevo → En revisión → Resuelto**;
  evidencias de ambas partes; historial del servicio.
- **Acciones:** tomar caso, pedir información, resolver con motivo, escalar.

#### 11. Calificaciones
- **Muestra:** todas las reseñas con filtro por estrellas; promedio general y por
  categoría; **reseñas denunciadas**; maestros con caída de calificación.
- **Acciones:** moderar/ocultar reseñas abusivas (con registro), responder.

#### 12. Estadísticas
- **Muestra:** análisis profundo — crecimiento de usuarios, retención por cohorte,
  frecuencia de recompra, **distribución geográfica por comuna** (aprovechando PostGIS),
  horarios de mayor demanda, estacionalidad.
- **Acciones:** cruzar variables, exportar gráficos.

#### 13. Reportes
- **Muestra:** generador de informes por período (financiero, operacional, de calidad).
- **Acciones:** generar, descargar CSV/PDF, programar envío por correo.

#### 14. Notificaciones
- **Muestra:** historial de envíos y sus métricas de apertura.
- **Acciones:** **enviar comunicado** a un segmento (todos los maestros de una comuna,
  clientes inactivos…); plantillas.

#### 15. Configuración
- **Muestra:** parámetros de la plataforma — comisión por defecto, radio de búsqueda,
  categorías, textos legales, administradores.
- **Acciones:** editar parámetros (con auditoría), gestionar admins, activar
  mantenimiento.

---

## 6. KPIs y métricas financieras

### 6.1 KPIs de negocio
| KPI | Fórmula | Por qué importa |
|---|---|---|
| **GMV** (volumen transado) | Σ montos de servicios pagados | Tamaño real del marketplace |
| **Ingresos de la plataforma** | Σ comisiones | Lo que gana ChasquiYa! |
| **Take rate** | comisiones ÷ GMV | Salud del modelo (hoy 10%) |
| **Ticket promedio** | GMV ÷ servicios pagados | Valor por transacción |
| **Servicios completados** | # en estado PAGADO/CALIFICADO | Actividad real |
| **Tasa de conversión** | aceptados ÷ solicitados | Eficiencia del embudo |
| **Tasa de cancelación** | cancelados ÷ solicitados | Fricción o mala calidad de matching |
| **Tasa de disputa** | disputas ÷ completados | Salud de la confianza |
| **Tiempo de primera respuesta** | media entre solicitud y cotización | Experiencia del cliente |
| **Calificación promedio** | media de estrellas | Calidad percibida |
| **Ratio oferta/demanda** | maestros activos ÷ solicitudes, por categoría y comuna | **Dónde reclutar maestros** |

### 6.2 KPIs de crecimiento
- Usuarios nuevos por período (clientes y maestros por separado)
- **Usuarios activos** (con al menos una acción en 30 días)
- **Retención por cohorte**: de los que se registraron en el mes X, cuántos siguen activos
- **Tasa de recompra**: clientes con 2+ servicios
- Maestros activos (con al menos un trabajo en 30 días)
- Tiempo desde registro hasta primer servicio

### 6.3 Métricas financieras
- Ingresos por período, con **comparación contra el período anterior** (↑/↓ %)
- Comisiones **cobradas vs. pendientes de liquidar**
- Proyección simple del mes (ritmo actual × días restantes)
- Ingresos por categoría y por comuna
- Concentración: ¿qué % del GMV aportan los 10 mejores maestros? *(riesgo si es muy alto)*

### 6.4 Alertas operativas del dashboard
🔴 Disputas abiertas hace más de 48 h · 🟠 Maestros pendientes de aprobación hace más de
24 h · 🟠 Solicitudes sin cotizar hace más de 24 h · 🟡 Maestros con calificación bajo 3.0 ·
🟡 Categorías sin oferta en una comuna con demanda · 🔴 Usuarios reportados

---

## 7. Rediseño de la app móvil

### 7.1 El cambio estructural: navegación por pestañas

**Hoy:** todo cuelga de una pila desde "Inicio", que es un menú de botones.
**Propuesta:** barra inferior permanente distinta por rol.

```
CLIENTE    🏠 Inicio  ·  🔍 Buscar  ·  📋 Servicios  ·  💬 Chat  ·  👤 Perfil
MAESTRO    🏠 Inicio  ·  📥 Solicitudes  ·  📅 Agenda  ·  💬 Chat  ·  👤 Perfil
ADMIN      (se queda en el backoffice web; en la app solo lo esencial)
```

Con `@react-navigation/bottom-tabs` (misma familia que ya usas) + badge numérico en Chat.
**Este solo cambio hace que la app se sienta comercial.**

### 7.2 Pantalla por pantalla

#### 🏠 Home del cliente
```
┌──────────────────────────────┐
│ Hola, Kevin 👋      🔔(2) 👤 │   saludo + notificaciones + avatar
│ 📍 Providencia            ▾  │   ubicación editable
├──────────────────────────────┤
│ 🔍 ¿Qué servicio necesitas?  │   buscador destacado
├──────────────────────────────┤
│ CATEGORÍAS            Ver +  │
│ ⚡    🔧    🔑    🎨         │   grilla 4×2 con iconos reales
│ Elec  Gas  Cerr  Pint        │
│ 🧹    🔨    📦    ➕         │
├──────────────────────────────┤
│ MAESTROS DESTACADOS          │   carrusel horizontal
│ ┌────┐ ┌────┐ ┌────┐         │   foto + nombre + ⭐ + oficio
├──────────────────────────────┤
│ CERCA DE TI                  │   lista vertical de tarjetas
├──────────────────────────────┤
│ TU ÚLTIMO SERVICIO           │   acceso rápido a repetir
└──────────────────────────────┘
```

#### 🔍 Buscar
- Barra de búsqueda con historial de búsquedas recientes
- **Chips de filtro rápido** (Cerca de mí · Mejor evaluados · Más económicos · Disponibles hoy)
- Botón "Filtros" → **bottom sheet** con distancia (slider), precio (rango), calificación
  mínima (estrellas), disponibilidad y orden
- Alternador **Lista / Mapa** (cuando exista G2)
- Resultados con contador ("18 maestros cerca de ti")

#### 🃏 Tarjeta de maestro (el componente más importante)
```
┌────────────────────────────────────┐
│ ╭────╮  Ana Soto           ✓ Verif.│
│ │foto│  ⚡ Electricidad            │
│ ╰────╯  ⭐ 4.8 (23)  ·  2.4 km     │
│                                    │
│ Desde $15.000  ·  5 años exp.      │
│ 🟢 Disponible hoy                  │
│                          ♡    [Ver]│
└────────────────────────────────────┘
```
Foto, verificación, calificación con cantidad, distancia, precio desde, disponibilidad,
favorito y una sola acción primaria.

#### 👤 Perfil del maestro
Cabecera con foto grande y datos clave → chips de oficios → fila de métricas (trabajos,
años, calificación) → **catálogo de servicios con precios** → portafolio (galería) →
reseñas con las tres sub-notas → **barra inferior fija** con "Solicitar servicio" (primaria)
y "Mensaje" (secundaria).

#### 📝 Solicitud de servicio
Convertirla en **asistente de 3 pasos** con indicador de progreso:
1. Qué necesitas (categoría + descripción + fotos)
2. Dónde y cuándo (dirección guardada + selector de fecha)
3. Presupuesto y confirmación (resumen antes de enviar)

Es la pantalla con más campos: dividirla reduce el abandono.

#### 📋 Mis servicios
Pestañas **Activos / Historial**; tarjetas con timeline compacto; acción contextual según
estado; buscador en el historial.

#### 💬 Chat
Lista de conversaciones (foto, último mensaje, hora, badge) → conversación con burbujas,
adjuntar foto, y **encabezado con el contexto del servicio** ("Electricidad · En ejecución").

#### 💳 Pago
Ya está bien planteado. Mejoras: iconos de método, desglose expandible, animación de éxito.

#### ⭐ Calificar
Estrellas grandes con feedback ("¡Excelente!") al tocar; sub-notas; chips de comentarios
rápidos ("Puntual", "Ordenado", "Buen precio") además del texto libre.

#### 👤 Perfil del cliente (nuevo)
Cabecera con avatar → accesos: Mis datos · Direcciones · Favoritos · Métodos de pago ·
Historial · Notificaciones · Ayuda · Términos · **Privacidad (exportar/eliminar datos)** ·
Cerrar sesión.

### 7.3 Correcciones concretas de UX/UI

| Problema actual | Corrección |
|---|---|
| **Botones muy juntos** | Separación mínima de 12 px entre acciones; 16 px entre bloques |
| Todos los botones se ven igual | Jerarquía: **1 primaria** (rojo sólido) + secundaria (borde) + terciaria (solo texto) por pantalla |
| Botones de 52 px apilados | Altura 48 px; agrupar horizontalmente cuando son opuestos (Aceptar/Rechazar) |
| Sin jerarquía tipográfica | Escala de 7 tamaños con pesos definidos |
| Emojis como iconos | **`@expo/vector-icons`** (ya viene con Expo, costo cero) |
| Pantallas en blanco al cargar | **Skeletons** con la forma del contenido |
| Listas vacías sin guía | **Estados vacíos** con ilustración, texto y acción |
| Errores como texto rojo suelto | **Toasts** y banners con icono y acción de reintentar |
| Sin feedback al tocar | Estados `pressed`, animaciones sutiles (Reanimated) |
| Sin accesibilidad | `accessibilityLabel`, contraste AA, área táctil ≥ 44 px |
| Todo el ancho igual | Padding lateral 16–20 px consistente; contenido máx. 600 px en tablets |

---

## 8. Sistema de diseño

Propuesta concreta para reemplazar `app/src/tema/tema.ts`, manteniendo la identidad roja.

### 8.1 Color
```ts
// Marca
primario:        '#E11D2A'  // rojo ChasquiYa
primarioHover:   '#C4161F'
primarioActivo:  '#A31219'
primarioSuave:   '#FEF2F2'  // fondos
primarioBorde:   '#FECACA'

// Neutros (escala completa — hoy faltan)
neutral0:  '#FFFFFF'   neutral50: '#F9FAFB'   neutral100:'#F3F4F6'
neutral200:'#E5E7EB'   neutral300:'#D1D5DB'   neutral400:'#9CA3AF'
neutral500:'#6B7280'   neutral600:'#4B5563'   neutral700:'#374151'
neutral800:'#1F2937'   neutral900:'#111827'

// Semánticos (cada uno con fondo suave + texto)
exito:   '#16A34A' / fondo '#DCFCE7' / texto '#166534'
alerta:  '#F59E0B' / fondo '#FEF3C7' / texto '#92400E'
error:   '#DC2626' / fondo '#FEE2E2' / texto '#991B1B'
info:    '#2563EB' / fondo '#DBEAFE' / texto '#1E40AF'

// Por estado del servicio (mapa explícito, ya existe parcialmente)
```
**Regla:** ningún color literal en las pantallas — todo por token.

### 8.2 Tipografía
Fuente **Inter** (gratis, Google Fonts) vía `expo-font` + `@expo-google-fonts/inter`.

| Rol | Tamaño | Peso | Uso |
|---|---|---|---|
| display | 34 | 800 | Cifras destacadas (ingresos) |
| h1 | 28 | 800 | Título de pantalla |
| h2 | 22 | 700 | Sección |
| h3 | 18 | 700 | Título de tarjeta |
| body | 16 | 400 | Texto general |
| bodyStrong | 16 | 600 | Énfasis |
| small | 14 | 400 | Secundario |
| caption | 12 | 500 | Etiquetas, timestamps |

Interlineado: 1.4 en textos largos.

### 8.3 Espaciado (escala de 4)
`xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48`
Padding lateral estándar: **20**. Separación entre tarjetas: **12**.

### 8.4 Radios y sombras
```
radio: sm 8 · md 12 · lg 16 · xl 24 · completo 999
sombra1 (tarjetas):  y2  blur 8   opacidad .06
sombra2 (elevadas):  y4  blur 16  opacidad .10
sombra3 (modales):   y8  blur 32  opacidad .16
```
En Android usar `elevation` equivalente (2 / 4 / 8).

### 8.5 Especificación de componentes

**Botón** — variantes `primario · secundario · terciario · peligro`;
tamaños `sm 36 · md 44 · lg 52`; estados `normal · pressed (opacidad .85 + escala .98) ·
disabled (opacidad .5) · loading (spinner, texto oculto)`; ancho completo opcional; icono
izq/der.

**Input** — etiqueta arriba, altura 52, borde 1px `neutral200`; foco: borde primario +
halo suave; error: borde rojo + mensaje con icono; soporta icono, sufijo, contador y
texto de ayuda.

**Card** — fondo blanco, radio `md`, sombra1, padding 16; variantes: plana, presionable
(con feedback), con imagen.

**Badge/Chip** — badge (estado, no interactivo, radio completo, 12/600) y chip
(seleccionable con estado activo).

**Bottom sheet** — para filtros y confirmaciones; con `@gorhom/bottom-sheet`; handle,
título, contenido con scroll y acciones fijas abajo.

**Toast** — arriba o abajo, 3 s, variantes éxito/error/info, con acción opcional.

**Avatar** — tamaños 32/40/56/80; iniciales cuando no hay foto; punto de estado opcional.

**Skeleton** — bloques animados con la forma del contenido real.

**EmptyState** — icono grande, título, descripción y botón de acción.

---

## 9. Componentes reutilizables

Del inventario actual (6 componentes) a un sistema. **En negrita, los prioritarios.**

### Base (`componentes/base/`)
**Boton** (mejorado) · **CampoTexto** (mejorado) · **Card** · **Avatar** · **Badge** ·
**Chip** · Divider · **Icono** (envuelve `@expo/vector-icons` para unificar tamaños)

### Feedback (`componentes/feedback/`)
**Skeleton** · **EmptyState** · **ErrorState** · **Toast** · Spinner · **PullToRefresh**

### Layout (`componentes/layout/`)
**Pantalla** (SafeArea + padding + scroll + estados de carga/error unificados — elimina
código repetido en las 16 pantallas) · **Encabezado** · SectionHeader · **BottomBar**

### Dominio (`componentes/dominio/`)
**TarjetaMaestro** · **TarjetaServicio** · **EstadoBadge** (existe) · **Estrellas**
(existe) · **TimelineServicio** · **PrecioEtiqueta** · **SelectorOficio** ·
**BotonFavorito** · ChipDisponibilidad

### Formularios (`componentes/formulario/`)
**SelectorFechaHora** (existe) · SelectorDireccion · SelectorFotos · CampoMoneda ·
CampoBusqueda

> **Ganancia clave:** hoy cada pantalla repite el patrón
> `cargando ? spinner : error ? texto : contenido`. Un componente `<Pantalla>` que
> encapsule eso elimina ~15 repeticiones y unifica la experiencia.

---

## 10. Tecnologías y herramientas recomendadas

> **Nota:** el frontend **no es Angular** — es React Native + Expo. Todo lo siguiente es
> compatible con Expo Go salvo donde se indique.

### 10.1 App móvil — alta prioridad
| Librería | Para qué | Costo | Justificación |
|---|---|---|---|
| **`@expo/vector-icons`** | Iconos reales | **Ya incluido** | Elimina los emojis. Cero instalación |
| **`@react-navigation/bottom-tabs`** | Pestañas inferiores | Gratis | El cambio estructural clave |
| **`expo-font` + Inter** | Tipografía propia | Gratis | Identidad visual |
| **`@tanstack/react-query`** | Datos, caché y reintentos | Gratis | Reemplaza ~20 `useState/useEffect` manuales; da caché, refresco y estados de carga gratis |
| **`react-native-reanimated`** | Microinteracciones | Ya en Expo | Transiciones suaves |

### 10.2 App móvil — segunda etapa
`@gorhom/bottom-sheet` (filtros) · `expo-notifications` (push, requiere dev build) ·
`react-native-maps` o MapLibre (mapa) · `react-hook-form` + `zod` (formularios y
validación compartida con el backend) · `date-fns` (fechas en español) ·
`expo-image` (caché de imágenes)

### 10.3 Backoffice
**Opción A (recomendada ahora):** mantener HTML/JS y agregar **Chart.js** (una etiqueta
`<script>`, sin build) → gráficos profesionales de inmediato. Además: filtros de fecha,
menú lateral y componentes JS reutilizables.

**Opción B (cuando el panel crezca):** migrar a **React + Vite + TypeScript**, reutilizando
tus tipos. Recomendable solo si el panel supera ~10 secciones.

### 10.4 Backend
| Herramienta | Para qué | Prioridad |
|---|---|---|
| **springdoc-openapi** | Documentación Swagger — **está en el blueprint y falta** | Alta |
| **Testcontainers** | Tests con Postgres+PostGIS real | Media |
| **GitHub Actions** | Correr los 84 tests en cada push | **Alta** |
| Spring Mail | Correos (Mailpit ya levantado) | Media |
| Bucket4j | Rate limiting | Media |
| Sentry | Errores en producción | Baja (al publicar) |

### 10.5 Ecosistema Claude Code
Ya hay código real suficiente para justificar lo que el blueprint dejó pendiente:
- **Skill `nueva-pantalla-app`** — con 16 pantallas, el patrón es claro y repetitivo
- **Skill `nuevo-modulo-backend`** — 11 módulos con la misma estructura de 4 capas
- **Agente `code-reviewer`** — especialmente valioso al tocar pagos y datos personales
- **Skill `estandares-de-codigo`** — con el checklist legal (21.431 / 21.719) incorporado

---

## 11. Qué necesito de tu parte

**Código, estructura y capturas: NO los necesito.** Construimos juntos cada archivo;
conozco el proyecto completo. Lo que sí necesito son **decisiones y contexto que solo tú
tienes**:

### Imprescindible
1. **Las imágenes de referencia** del dashboard (punto 7 de tu encargo).
2. **Objetivo real del proyecto ahora:** ¿evaluación universitaria (prioriza impacto
   visual y demostrabilidad) o marcha blanca real (prioriza push, pagos y legal)?
   *Cambia completamente el orden del roadmap.*
3. **Fecha límite**, si existe.
4. **Decisión sobre C7** (solicitud abierta a varios maestros): es el cambio más profundo;
   define si el producto es "elijo maestro" o "recibo ofertas".

### Útil
5. Cuántas horas por semana puedes dedicar (para dimensionar las fases).
6. Si quieres dar el paso al **development build** de Expo (habilita push).
7. Preferencia de estilo visual: sobrio/corporativo vs. cercano/colorido.
8. Si vas a publicar en Play Store en esta etapa.

---

## 12. Protocolo para las referencias visuales

Cuando me envíes las imágenes, para cada una haré:

1. **Descripción objetiva** — qué muestra, cómo está organizada.
2. **Estructura** — grilla, distribución, proporciones, densidad.
3. **Análisis de componentes** — tarjetas, gráficos, tablas, menús: forma, sombras,
   radios, espaciado.
4. **Color y jerarquía** — paleta, uso del acento, contraste, qué destaca primero.
5. **Qué adaptar a ChasquiYa!** — solo lo que aporte a tus datos reales.
6. **Qué descartar** — elementos que no aplican a un marketplace de servicios.
7. **Propuesta propia** — una interfaz **inspirada, no copiada**: tomo patrones de
   estructura y jerarquía (que no son protegibles) y los combino con tu identidad roja.
   No replico diseños concretos.

Ideal si me indicas, para cada imagen, **qué te gustó exactamente** — así distingo si te
atrae la estructura, los colores o los gráficos.

---

## 13. Roadmap y priorización general

### 🔴 Prioridad ALTA — implementar primero

#### Fase 0 · Quick wins visuales (2–3 sesiones) — *máximo impacto por esfuerzo*
1. Iconos reales (`@expo/vector-icons`) en vez de emojis
2. Tipografía Inter + escala tipográfica completa
3. Tokens de color y espaciado ampliados
4. **Navegación por pestañas inferiores**
5. Espaciado y jerarquía de botones corregidos

> Sin agregar **ninguna** funcionalidad, la app pasa de "prototipo" a "producto".

#### Fase 1 · Funcionalidades esperadas (6–8 sesiones)
6. Home rediseñado con categorías (C5)
7. Fotos: avatares y galería (C1)
8. Favoritos (C2)
9. Historial con pestañas y recompra (C3)
10. Búsqueda con filtros (C4)
11. Perfil del cliente + direcciones (C6)
12. Componentes: Card, Skeleton, EmptyState, Toast, Pantalla

#### Fase 2 · Robustez y legal (5–7 sesiones)
13. **Recuperar contraseña** (S1)
14. **Exportar/eliminar datos — Ley 21.719** (S4)
15. Términos y política de privacidad reales (SR5)
16. Centro de notificaciones in-app (CM2)
17. Autocompletado de direcciones (G1)
18. Swagger + GitHub Actions
19. Dashboard: filtros de período, Chart.js, comparación entre períodos, alertas

### 🟠 Prioridad MEDIA — después

20. Notificaciones push reales (CM1) — requiere dev build
21. **Catálogo de servicios con precio** (P1) ⭐ *alto valor*
22. Timeline del servicio (C8)
23. Portafolio del maestro (P2)
24. Disponibilidad y radio de cobertura (P3, G3)
25. Agenda del maestro (P4) + migrar fecha a `timestamptz`
26. Chat con fotos (CM3)
27. Insignias de verificación (S5)
28. Mapa de maestros (G2)
29. Dashboard: rankings, categorías, embudo, estadísticas geográficas
30. Disputas con evidencias (SR2), centro de ayuda (SR1)
31. Refresh tokens (S3), verificación de correo (S2), auditoría (S6)
32. Comprobantes descargables (PG3)
33. **Solicitud abierta a varios maestros (C7)** — como hito propio

### 🟢 Prioridad BAJA — futuro

34. Pasarela de pago real + escrow + liquidaciones (PG1, PG2, PG4) — *cuando el negocio se valide*
35. Cupones y referidos (M1, M2)
36. Niveles de maestro y créditos (F1, F2)
37. Suscripción del maestro (F3)
38. Banners y deep links (M3, M4)
39. Tickets de soporte (SR4)
40. Comisión por categoría (PG5), propinas, 2FA admin

### Vista temporal

| Plazo | Foco | Resultado |
|---|---|---|
| **Corto** (1–2 meses) | Fases 0–1 | App visualmente competitiva con las funcionalidades que todos esperan |
| **Mediano** (3–4 meses) | Fase 2 + media | Plataforma robusta, legal al día, dashboard profesional, push funcionando |
| **Largo** (5+ meses) | Pagos reales, marketing, fidelización | Marketplace listo para operar comercialmente |

---

## 14. Futuras versiones

Ideas más allá del roadmap, cuando el negocio esté validado:

- **ChasquiYa! Empresas** — cuentas para edificios, administradoras e inmobiliarias con
  facturación mensual y maestros preferentes.
- **Servicios recurrentes** — mantención mensual, jardinería semanal (ingreso predecible
  para el maestro y para la plataforma).
- **Presupuesto por foto con IA** — el cliente sube una foto y recibe un rango estimado.
- **Garantía ChasquiYa!** — respaldo por X días sobre el trabajo realizado (diferenciador
  fuerte; requiere respaldo financiero).
- **Verificación con Clave Única / Registro Civil** — confianza de nivel bancario.
- **Academia ChasquiYa!** — capacitación y certificación de oficios; genera lealtad del
  lado difícil del marketplace.
- **Marketplace de materiales** — alianzas con ferreterías, comisión adicional.
- **Modo offline parcial** y **soporte multi-ciudad** con parámetros por región.
- **App para tablets / versión web del cliente**.

---

## Cierre: la recomendación en una frase

> **No agregues 40 funcionalidades. Haz la Fase 0 completa (2–3 sesiones) y verás el 70%
> del salto de percepción que buscas.** Después construye la Fase 1, que son las cinco
> cosas que cualquier usuario espera de un marketplace y hoy faltan. Recién ahí evalúa las
> funcionalidades grandes (C7, P1, pagos reales), cuando tengas usuarios reales diciéndote
> cuál necesitan.

*Documento vivo — actualizar a medida que se implementen las fases.*
