# Blueprint — App de Maestros (Marketplace de Servicios)

> **Plan maestro del proyecto.** Este documento reúne toda la planificación previa al desarrollo.
> Es la fuente de verdad del proyecto y el "puente" hacia Claude Code: al iniciar Claude Code
> en la carpeta del proyecto, pídele que lea este archivo para que tenga todo el contexto.
>
> Chile, 2026 · Proyecto individual · Dedicación media jornada · Prioridad: costo cero en desarrollo.

---

## Cómo usar este documento en Claude Code

1. Instala Claude Code (instalador nativo recomendado; ver `code.claude.com/docs/en/setup`). Requiere cuenta Claude Pro/Max/Team o API — **no** funciona con el plan gratuito.
2. Crea la carpeta del proyecto (ej. `maestros-app/`) y guarda este archivo en `docs/blueprint.md`.
3. Abre la terminal **dentro de esa carpeta** y ejecuta `claude`.
4. Primer mensaje sugerido: *"Lee `docs/blueprint.md`. Es el plan maestro. Empezaremos por el Hito 0. Antes de escribir código, propón el plan y espera mi aprobación."*
5. Una de las primeras tareas: pedirle a Claude que genere un `CLAUDE.md` corto en la raíz a partir de este blueprint.
6. Verifica la instalación con `claude doctor` si algo falla.

---

# Fase 1 — Comprensión del proyecto

## Objetivo
Marketplace móvil de dos lados que conecta **clientes** que necesitan servicios de oficio en el hogar (gasfitería, electricidad, pintura, jardinería, etc.) con **maestros** que los prestan, dentro del marco legal chileno. La plataforma es un **intermediario tecnológico** que facilita descubrimiento, confianza, comunicación y transacción, y cobra una comisión.

## Actores
- **Cliente:** busca maestro, describe problema, recibe cotización, contrata, paga, califica.
- **Maestro:** se registra, se verifica, recibe solicitudes, cotiza, ejecuta, cobra. Es el lado difícil de conseguir (sembrar oferta primero).
- **Administrador:** aprueba maestros, modera, gestiona disputas, ve métricas. Vive en un backoffice web.

## Funcionalidades (por dominio)
- **Identidad y cuentas:** registro/login cliente y maestro, verificación de maestro, perfiles.
- **Descubrimiento:** geolocalización de maestros cercanos, búsqueda por categoría, filtros, perfil.
- **Transacción:** solicitud, cotización, contratación, máquina de estados, pago (simulado) con comisión.
- **Comunicación:** chat interno, notificaciones push.
- **Confianza:** calificaciones y reseñas, disputas/reclamos.
- **Administración:** backoffice de aprobación, moderación, disputas y métricas.

## Requerimientos funcionales (muestra)
- RF-01 Registro de clientes y maestros con roles diferenciados.
- RF-02 El maestro sube documentos de verificación; no se publica hasta ser aprobado por un admin.
- RF-03 El cliente crea solicitud con categoría, descripción, fotos y ubicación.
- RF-04 Listado de maestros por cercanía geográfica y categoría.
- RF-05 El maestro cotiza una solicitud; el cliente acepta o rechaza.
- RF-06 El servicio transita por estados: solicitado → cotizado → aceptado → en curso → completado → pagado → calificado (con cancelado / en disputa).
- RF-07 Chat interno ligado a la solicitud.
- RF-08 Procesamiento de pago (simulado) y registro de comisión.
- RF-09 Calificación mutua al finalizar.
- RF-10 Apertura y mediación de disputas.
- RF-11 Notificaciones push ante eventos clave.
- RF-12 Exportar y eliminar cuenta y datos (exigencia Ley 21.719).

## Requerimientos no funcionales
- **Costo cero en desarrollo:** herramientas gratuitas / open source / planes free. Costos solo al publicar o escalar.
- **Privacidad (Ley 21.719):** privacy by design — consentimientos, cifrado, logs de auditoría, borrado/exportación.
- **Seguridad:** autenticación robusta, autorización por rol, nunca almacenar datos de tarjetas.
- **Geolocalización eficiente:** consultas de proximidad rápidas (PostGIS).
- **Usabilidad:** público no técnico.
- **Mantenibilidad:** código y contexto ordenados (ahorro de tokens con Claude).
- **Escalabilidad futura:** empezar simple, poder crecer.

## Restricciones
- Presupuesto mínimo; prioridad a gratuito/OSS. No se asume AWS, DB cloud ni APIs de pago contratadas.
- Legales (Chile): Ley 21.431 (clasificación maestros), Ley 21.719 (datos), Ley 19.496/SERNAC (consumidor), SII (tributación).
- Proyecto individual, media jornada, en aprendizaje del ecosistema Claude.
- Marcha blanca acotada a comunas de Santiago.

## Riesgos técnicos
- Arranque en frío del marketplace (sembrar maestros antes que clientes).
- Geolocalización a escala (mitigado con PostGIS + índices).
- Chat en tiempo real (complejidad; simplificable en MVP).
- Pagos / flujo de dinero (por ahora simulado, se posterga la parte delicada).
- Cumplimiento de datos (mejor desde el diseño).
- Sobre-ingeniería (mitigado con "todo empieza en cero").

## Decisiones tomadas (contexto del proyecto)
- Desarrollo con **Claude Code**.
- **Pago simulado** por ahora (sin pasarela, sin cuenta bancaria, sin SII todavía).
- App para **iOS + Android** (multiplataforma).
- Datos ficticios para pruebas.
- Costo objetivo en desarrollo: **USD 0**.

---

# Fase 2 — Arquitectura

## Vista general
```
[ App móvil (React Native + Expo) ]  ← cliente/maestro
            │  (API REST sobre HTTPS)
[ Backend / API (Spring Boot, Java) ] ← lógica: matching, cotizaciones, comisión, estados
            │
[ PostgreSQL + PostGIS ]              ← datos + geolocalización

Apoyo local (dev): almacenamiento de fotos · notificaciones · correos de prueba
```

## Stack (decidido)
- **Frontend:** React Native + Expo + TypeScript. Expo simplifica compilar iOS/Android y probar en el teléfono gratis.
- **Backend:** Spring Boot (Java). Robusto y estructurado. (Nota: implica dos lenguajes en el proyecto — Java + TypeScript.)
- **Base de datos:** PostgreSQL + **PostGIS** (extensión geoespacial — clave para "maestros cercanos"). Local en Docker.
- **Camino A (decidido):** se construye la base de datos y la autenticación a mano (no se usa Supabase). Máximo aprendizaje y control; Supabase queda como plan B.
- **API:** REST + documentación OpenAPI/Swagger.
- **Autenticación:** JWT dentro del backend (+ refresh tokens).
- **Migraciones de BD:** Flyway o Liquibase.

## Servicios de apoyo (todo local en dev)
- **Almacenamiento de fotos:** filesystem local o MinIO ("S3 gratis" en Docker).
- **Notificaciones push:** Expo Push Notifications (gratis).
- **Correos (dev):** Mailhog (captura correos localmente).
- **Chat en tiempo real:** WebSocket (Spring STOMP) — simplificable en MVP.
- **Mapas:** OpenStreetMap + MapLibre (gratis, sin tarjeta). Evitar Google Maps en dev.

## Entorno, testing y CI/CD
- **Entorno local:** Docker Compose (un comando levanta Postgres+PostGIS, MinIO, Mailhog).
- **Testing:** Jest/JUnit para lógica de negocio; Testcontainers para BD real de prueba; prueba manual en el teléfono con Expo.
- **Control de versiones:** Git + GitHub (repos privados gratis).
- **CI/CD:** GitHub Actions (corre tests en cada push).
- **Observabilidad:** Sentry (capa gratis) cuando haya producción.
- **Producción:** aplazada. Opciones gratis/baratas: Render/Railway/Fly.io (backend), Neon/Supabase (BD con PostGIS).

---

# Fase 3 — Ecosistema Claude (conceptos)

Todo el ecosistema existe para **gestionar el contexto de forma inteligente**: cargar lo justo, cuando se necesita. Principio para este proyecto: **empezar con lo mínimo y crecer según dolor real.**

- **Contexto:** lo que Claude "tiene en la cabeza" en cada momento. Tiene límite (tokens). Cada archivo que lee lo consume. Proyecto ordenado = menos lectura = menos tokens.
- **CLAUDE.md:** archivo en la raíz que Claude Code lee automáticamente. Reglas permanentes y CORTAS del proyecto. Se dice una vez, sirve siempre.
- **Tools:** las "manos" de Claude Code — leer/escribir archivos, correr comandos, git. Convierten a Claude de asesor en desarrollador. El usuario autoriza las acciones con consecuencias.
- **Skills:** instructivos LARGOS para tareas repetibles con reglas propias. Claude las abre solo cuando las necesita (no gastan contexto el resto del tiempo).
- **Subagentes:** "clones" con contexto propio para tareas acotadas; protegen el contexto principal. El Claude principal los orquesta (no se hablan entre ellos).
- **MCP:** "enchufe" estándar para conectar Claude a sistemas externos (una BD, memoria de código, etc.).
- **Memoria de código:** técnicas para no releer todo. Se empieza con memoria "por documentación" (gratis: `docs/` + `CLAUDE.md`); el indexado por MCP se evalúa solo si el proyecto crece.

---

# Fase 4 — Agentes (subagentes)

**Regla:** arrancar con CERO. Un subagente se justifica solo si (1) la tarea se repite, (2) requiere contexto distinto, (3) contaminaría la conversación principal.

## Plan de incorporación
- **Inicio del MVP:** 0 subagentes. Solo Claude principal + `CLAUDE.md`.
- **Al terminar la 1ª funcionalidad:** agregar `code-reviewer`.
- **Cuando el testing manual pese:** agregar `qa-tester`.
- **Especialistas backend/frontend:** solo si el contexto llega a ser un problema real (probablemente nunca en el MVP).

## `code-reviewer` (futuro)
- **Objetivo:** segunda opinión crítica sobre código recién escrito.
- **Hace:** revisa seguridad (no guardar tarjetas, permisos por rol), reglas de negocio (máquina de estados), reglas legales convertidas en técnicas (independencia del maestro, consentimiento de datos). Devuelve observaciones priorizadas.
- **No hace:** escribir ni modificar código.
- **Herramientas:** solo lectura (leer archivos, grep, git diff). Sin escritura.
- **Usa skill:** `estandares-de-codigo`.

## `qa-tester` (futuro)
- **Objetivo:** escribir y ejecutar tests de lógica de negocio y reportar fallos.
- **Hace:** tests de matching por cercanía, cálculo de comisión, transiciones de estado.
- **No hace:** arreglar código de producción; solo toca carpetas de tests.
- **Usa skill:** `escribir-tests`.

## Coordinación
El **Claude principal es el orquestador**. Delega tareas puntuales a subagentes y recibe sus reportes. Los subagentes no se comunican entre sí. El usuario siempre interactúa con el principal.

## Descartados
Agente arquitecto, documentador, de base de datos y coordinador/orquestador (este último rol lo cumple el Claude principal por diseño).

---

# Fase 5 — Skills

**Criterio:** una skill vale la pena si la tarea (1) se repite mucho, (2) tiene reglas propias del proyecto, (3) su instructivo es largo. Si es una regla corta → va al `CLAUDE.md`. Si es de una vez → se pide en el momento. Si Claude ya lo hace bien → no se documenta.

**Decisión:** NO crear skills al inicio. Son **candidatas**; se evalúan al terminar la primera funcionalidad de cada tipo, con el código real delante (así el contenido sale del patrón real, no de adivinar).

## Skills candidatas
- **`nuevo-modulo-backend`:** crear un módulo Spring Boot con la estructura estándar (controlador → servicio → repositorio → modelo), validaciones, manejo de errores, migración y esqueleto de tests. Entrada: nombre y propósito del módulo. Salida: módulo completo consistente.
- **`nueva-pantalla-app`:** crear una pantalla Expo con estructura, navegación, conexión a la API (con carga y errores) y estilo consistentes. Entrada: nombre y propósito. Salida: pantalla lista y conectada.
- **`escribir-tests`:** tests de lógica de negocio con la convención del proyecto (qué sí testear vs. qué no). La usará el `qa-tester` cuando exista.
- **`estandares-de-codigo`** (ligada al `code-reviewer`): checklist de revisión — seguridad, permisos por rol, reglas de negocio, reglas legales como técnicas.

## Relación entre piezas
`CLAUDE.md` (reglas cortas, siempre activas) · Skills (instructivos largos, bajo demanda) · Agentes (contexto aislado, usan skills).
Regla mental: **corto y siempre-válido → CLAUDE.md; largo y ocasional → skill; contexto aislado → agente.**

---

# Fase 6 — MCP y herramientas externas

**Decisión:** arrancar con CERO MCPs.

## `codebase-memory-mcp` (evaluado)
- **Qué es:** servidor MCP que indexa el código en un grafo de conocimiento (funciones, clases, quién llama a quién) para responder consultas sin releer archivos. Local, sin API keys, sin telemetría, open source (MIT). Gratis.
- **Qué resuelve:** el gasto de tokens al explorar código grande.
- **Veredicto:** NO instalar ahora. Está diseñado para codebases grandes; el proyecto arranca en cero líneas. El beneficio es proporcional al tamaño del código. Además modifica archivos de configuración del agente (mejor no meterlo antes de tener rodaje).
- **Gatillo para reconsiderarlo:** cuando el proyecto pase de ~50-80 archivos **Y** se note gasto real de contexto buscando cosas. Probablemente bien avanzado el MVP o después.
- **Alternativa gratis para la etapa actual:** `CLAUDE.md` + `docs/` bien mantenidos (memoria "por documentación").

## Otros MCP
- **MCP de PostgreSQL:** candidato para la fase de depuración (consultar la BD directo). No al inicio.
- **MCP de GitHub y otros:** innecesarios para una persona sola. Descartados.

---

# Fase 7 — Servicios y costos

**Conclusión: todo el desarrollo del MVP cuesta USD 0.** Los primeros costos reales aparecen al publicar en tiendas y al poner la app online.

## Desarrollo (gratis)
Docker, Spring Boot, PostgreSQL+PostGIS, Expo, MinIO, JWT propio, Expo Push, Mailhog, pago simulado, Git+GitHub, GitHub Actions, datos ficticios. **Mapas: OpenStreetMap + MapLibre** (gratis, sin tarjeta).

## Punto a vigilar en dev
Mapas: Google Maps en Android pide API key con tarjeta. **Se evita usando OpenStreetMap.**

## Al publicar en tiendas
- Google Play: ~USD 25 (pago único).
- Apple Developer: ~USD 99 / año (solo si se hace iOS).
- Dominio: ~USD 10-15 / año (opcional).
- Nota: se puede probar en el propio teléfono sin estas cuentas (Expo).

## Al poner online (marcha blanca chica) — capas gratis suficientes
Hosting backend (Render/Railway/Fly.io), BD en la nube con PostGIS (Neon/Supabase), almacenamiento (Cloudflare R2/Supabase), correos (Resend/Brevo), monitoreo (Sentry).

## Al crecer (negocio validado)
Pasarela de pago real (comisión por transacción), Google Maps con volumen, verificación automatizada de antecedentes, infraestructura escalada.

## Línea de tiempo del gasto
Desarrollo → USD 0 · Publicar → ~USD 25 (Android) / ~USD 99 año (iOS) · Online → ~USD 0 con capas gratis · Crecer → costos que el negocio ya paga.

**Estrategia sugerida:** para la marcha blanca, publicar primero en Android (pago único) y dejar iOS para cuando se valide.

---

# Fase 8 — Estructura del proyecto

**Decisión: monorepo** (un solo repositorio). Más simple para una persona y permite a Claude ver la relación app↔backend en una sesión.

```
maestros-app/
├── CLAUDE.md                  ← reglas permanentes (Claude lo lee solo)
├── README.md                  ← qué es y cómo arrancar (humanos)
├── docker-compose.yml         ← levanta Postgres+PostGIS + MinIO + Mailhog
├── .gitignore                 ← qué NO se sube (incluye .env)
├── .env.example               ← plantilla de variables SIN secretos
│
├── docs/                      ← memoria "barata" del proyecto (reemplaza MCP de memoria)
│   ├── blueprint.md           ← este documento
│   ├── arquitectura.md        ← decisiones técnicas y diagramas
│   ├── modelo-datos.md        ← entidades y relaciones
│   ├── flujos.md              ← flujos clave (contratación, disputa, etc.)
│   ├── legal.md               ← requisitos legales como reglas técnicas
│   └── decisiones/            ← registro de decisiones (una por archivo)
│
├── backend/                   ← API Spring Boot (Java)
│   ├── build.gradle | pom.xml
│   ├── src/main/java/.../maestros/
│   │   ├── usuarios/          ← un módulo = controlador + servicio + repositorio + modelo
│   │   ├── maestros/
│   │   ├── solicitudes/
│   │   └── ...
│   ├── src/main/resources/db/migration/   ← migraciones (Flyway)
│   └── src/test/
│
├── app/                       ← app React Native + Expo (TypeScript)
│   ├── package.json
│   ├── app.json
│   ├── src/
│   │   ├── pantallas/
│   │   ├── componentes/
│   │   ├── navegacion/
│   │   ├── api/               ← funciones que llaman al backend
│   │   └── estado/
│   └── assets/
│
└── .claude/                   ← configuración de Claude Code (vacía al inicio)
    ├── agents/                ← code-reviewer, qa-tester (cuando existan)
    └── skills/                ← skills (cuando se creen)
```

## Notas clave
- **CLAUDE.md** en la raíz: stack, estados del servicio, "maestros independientes por diseño legal", "pago simulado por ahora", convenciones, qué no tocar. Corto y filoso.
- **docs/** es la memoria gratuita: se le apunta a Claude al doc relevante en vez de que escanee el código. Mantenerlos al día reemplaza herramientas de pago.
- **docs/legal.md**: traduce leyes a reglas técnicas verificables (base para el `code-reviewer`).
- **backend/** y **app/** separadas: permiten enfocar contexto en una mitad y ahorrar tokens.
- **.env** nunca se sube (va en `.gitignore`); **.env.example** sí (plantilla sin valores). Hábito de seguridad desde el día uno.
- **Regla mental backend:** una funcionalidad = una carpeta con las 4 capas.

---

# Fase 9 — Flujo de trabajo

## Flujo actual (sin agentes)
```
1. DESCRIBIR   → decir qué funcionalidad se quiere
2. DISEÑAR     → Claude propone el plan (archivos, enfoque) SIN escribir código
3. APROBAR     → ⭐ el usuario revisa el plan y da el OK (o ajusta)
4. IMPLEMENTAR → Claude escribe el código según el plan aprobado
5. PROBAR      → tests de lógica crítica + prueba manual en el teléfono
6. CORREGIR    → si algo falla, se arregla (vuelve a 4 si hace falta)
7. DOCUMENTAR  → actualizar el doc relevante en /docs SOLO si cambió algo importante
8. COMMIT      → guardar en Git con mensaje claro → siguiente funcionalidad
```

**El paso 3 (APROBAR) es el hábito más importante:** Claude propone *cómo* lo hará y el usuario aprueba antes de que escriba código. Evita generar código en la dirección equivocada (ahorra tokens y tiempo) y sirve para aprender.

**Documentar (paso 7):** solo decisiones nuevas, no acciones rutinarias. El diseño del paso 2 es efímero; el blueprint/docs es permanente. No confundirlos.

## Flujo futuro (con `code-reviewer`)
Se inserta entre implementar y probar:
```
4. IMPLEMENTAR → Claude escribe el código
4.5 REVISAR    → el code-reviewer revisa (seguridad, reglas, legal)
5. PROBAR      → tests + prueba manual
```

## Reglas para el CLAUDE.md (hacen cumplir el flujo)
- Siempre proponer el plan y esperar aprobación antes de escribir código.
- No implementar más de una funcionalidad por vez.
- Priorizar soluciones simples; no agregar librerías sin justificar.
- Al terminar, indicar qué documentar y proponer el mensaje de commit.
- Si una tarea toca muchos archivos, avisar antes de empezar.

## Ritmo (media jornada)
Trabajar en unidades pequeñas y completas (diseño → código → test → commit en una sesión). Funcionalidades cerradas y commiteadas = retomar barato = menos tokens.

---

# Fase 10 — Roadmap de implementación

**Principio:** construir en capas que se sostienen — nunca algo que dependa de lo que aún no existe. Cada hito termina en algo que se puede ver y probar; no se avanza sin validar.

## Hitos
- **Hito 0 — Cimientos:** monorepo, docker-compose (Postgres+PostGIS, MinIO, Mailhog), CLAUDE.md, backend que arranca, app Expo que abre en el teléfono. *Valida:* todo levanta con un comando; la app abre. *Depende de:* nada.
- **Hito 1 — Identidad:** registro/login cliente y maestro, JWT, roles, hasheo de contraseñas. *Valida:* te registras e inicias sesión en ambos roles. *Depende de:* Hito 0.
- **Hito 2 — Perfil + verificación del maestro:** perfil (oficios, ubicación con PostGIS, documentos) y flujo de aprobación por admin. *Valida:* un maestro se registra, completa perfil y es aprobado. *Depende de:* Hito 1.
- **Hito 3 — Descubrimiento:** búsqueda por categoría y cercanía (PostGIS), pantallas de búsqueda y perfil. *Valida:* como cliente ves maestros reales ordenados por distancia. *Depende de:* Hito 2.
- **Hito 4 — Transacción (núcleo):** solicitud → cotización → contratación, con la **máquina de estados**. *Valida:* flujo completo de punta a punta. *Depende de:* Hito 3.
- **Hito 5 — Comunicación:** chat interno ligado a la solicitud + notificaciones push. *Valida:* cliente y maestro conversan y reciben avisos. *Depende de:* Hito 4.
- **Hito 6 — Cierre y pago simulado:** completar servicio, pago simulado con registro de comisión, liberación. Diseñado para enchufar pasarela real después. *Valida:* el servicio se completa y la comisión queda registrada. *Depende de:* Hito 4 (idealmente 5).
- **Hito 7 — Confianza:** calificación mutua + disputas con mediación del admin. *Valida:* ambos se califican; se abre y resuelve una disputa. *Depende de:* Hito 6.
- **Hito 8 — Backoffice:** web simple para aprobar maestros, ver transacciones, gestionar disputas y métricas. *Valida:* se gestiona sin tocar la BD a mano. *Depende de:* Hitos 2, 6, 7.

## Mapa de dependencias
```
Hito 0 → Hito 1 → Hito 2 → Hito 3 → Hito 4 (núcleo)
                                      ├── Hito 5
                                      └── Hito 6 → Hito 7
Hito 8 (backoffice) ← se nutre de 2, 6, 7 · va al final
```

## Paralelismo
Trabajando solo, la secuencia de hitos es estricta. Dentro de cada hito, Claude alterna dos frentes: primero el backend (el dato), luego la app (mostrarlo).

## Dónde entra el ecosistema
- Hito 0–1: solo Claude principal + CLAUDE.md. Al terminar el 1er módulo, evaluar la skill `nuevo-modulo-backend`.
- Cierre Hito 1: evaluar activar `code-reviewer` (código de auth es sensible).
- Hito 4–5: evaluar `qa-tester` (la máquina de estados tiene mucha lógica).
- ~50-80 archivos (¿Hito 6-7?): reconsiderar `codebase-memory-mcp`.

## Estrategia de testing
- **Automático** para lógica que rompe en silencio: comisión (H6), transiciones de estado (H4), matching por distancia (H3).
- **Manual en el teléfono** para lo visual y de flujo.
- No "cubrir todo": cubrir **lo que duele si falla**. Datos ficticios para simular flujos completos.

## Estrategia de despliegue (para cuando el MVP esté listo)
Publicar primero en Android (~USD 25 único) para la marcha blanca; backend en capa gratuita (Render/Fly.io), BD en Neon/Supabase (gratis, con PostGIS). iOS (~USD 99/año) al validar.

---

# Anexo — Marco legal (resumen operativo)

> Orientación para planificar, **no asesoría legal**. Validar con abogado/a (digital + laboral) y contador/a antes de operar con datos y dinero reales. En desarrollo se usan datos ficticios y pago simulado, por lo que varias obligaciones aún no aplican, pero se construye con buenas prácticas desde el diseño.

- **Ley 21.431 (clasificación de maestros) — riesgo #1.** Evitar que la relación se recalifique como vínculo laboral dependiente. La app no debe imponer horarios, castigar rechazos ni fijar tarifas unilateralmente. Contrato que declare independencia. Traducir esto a reglas técnicas en `docs/legal.md`.
- **Ley 21.719 (protección de datos).** Vigencia plena 1 de diciembre de 2026. Privacy by design: consentimiento explícito, política de privacidad, cifrado, logs de auditoría, endpoints de exportar/eliminar datos.
- **Ley 19.496 / SERNAC (consumidor).** Términos claros sin cláusulas abusivas, información de precios y comisiones antes de contratar, mecanismo de reclamos, definir hasta dónde responde la plataforma.
- **SII (tributación).** Futuro: sociedad (SpA) + inicio de actividades; factura por comisión; el maestro emite su boleta. Definir si el dinero pasa por la plataforma (escrow) o va directo. Hoy: pago simulado, sin obligaciones aún.
- **Confianza:** verificación de identidad y antecedentes de maestros (dato sensible), certificaciones de oficio cuando aplique, y a futuro seguro de responsabilidad civil.

---

# Estado del ecosistema al iniciar (resumen)

| Pieza | Al inicio | Se suma cuando… |
|---|---|---|
| Claude principal + CLAUDE.md | ✅ Sí | — |
| docs/ (memoria por documentación) | ✅ Sí | — |
| Subagentes | ❌ 0 | code-reviewer tras 1ª funcionalidad; qa-tester cuando el testing pese |
| Skills | ❌ 0 (candidatas) | tras la 1ª funcionalidad de cada tipo, con el código delante |
| MCPs | ❌ 0 | codebase-memory-mcp a ~50-80 archivos + gasto real de contexto |

**Filosofía transversal:** todo empieza en cero y se agrega solo cuando un dolor real y medible lo justifica.
