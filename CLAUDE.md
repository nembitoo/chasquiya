# CLAUDE.md — Chasquiya

Reglas permanentes del proyecto. Cortas y siempre válidas.
La **fuente de verdad** completa está en `docs/blueprint.md` (léelo si falta contexto).

## Qué es
Marketplace móvil (Chile) que conecta **clientes** con **maestros** de oficios
(gasfitería, electricidad, etc.). La plataforma es intermediario tecnológico y cobra comisión.
Proyecto individual, media jornada, en aprendizaje. **Costo cero en desarrollo.**

## Stack
- **App:** React Native + Expo (SDK 54) + TypeScript → carpeta `app/`
- **Backend:** Spring Boot 4 (Java 21) + Maven → carpeta `backend/`
- **BD:** PostgreSQL 16 + PostGIS (geolocalización) en Docker
- **Entorno local:** Docker Compose (Postgres+PostGIS, MinIO, Mailpit)
- **Migraciones:** Flyway (`backend/src/main/resources/db/migration`)
- **Auth (desde Hito 1):** JWT propio

## Cómo trabajamos (el flujo es sagrado)
1. **Proponer el plan y ESPERAR aprobación explícita antes de escribir código.** Nunca saltar este paso.
2. Una sola funcionalidad por vez. Trabajar un hito a la vez (ver roadmap en el blueprint).
3. Priorizar soluciones simples. **No agregar librerías/dependencias sin justificarlo antes.**
4. Si una tarea toca muchos archivos, avisar antes de empezar.
5. Al terminar: indicar qué documentar (solo si cambió algo importante) y proponer el mensaje de commit.
6. Actuar como arquitecto y mentor: explicar el porqué de las decisiones que importan.

## Reglas de negocio y legales (traducir a técnica)
- **Maestros son independientes por diseño legal (Ley 21.431).** La app NO impone horarios,
  NO castiga rechazos, NO fija tarifas unilateralmente. Evitar todo lo que huela a relación laboral.
- **Pago simulado por ahora.** Sin pasarela real, sin cuenta bancaria.
- **Nunca almacenar datos de tarjetas.**
- **Privacidad (Ley 21.719):** consentimiento explícito, y a futuro exportar/eliminar datos.
- Datos ficticios para pruebas.

## Máquina de estados del servicio
`solicitado → cotizado → aceptado → en curso → completado → pagado → calificado`
(+ `cancelado` y `en disputa`). Es lógica crítica: se testea automáticamente.

## Convenciones
- Monorepo: `app/` (front) · `backend/` (API) · `docs/` (memoria del proyecto).
- Backend: **una funcionalidad = una carpeta** con 4 capas (controlador → servicio → repositorio → modelo).
- Nombres del dominio en español (`solicitudes`, `maestros`, `cotizaciones`...).
- `.env` nunca se sube; `.env.example` sí.

## Entorno de desarrollo (referencia rápida)
- Levantar todo: `docker compose up -d` · Apagar: `docker compose down`
- Backend (Java 21): `cd backend && ./mvnw spring-boot:run` (requiere `JAVA_HOME` = Temurin 21)
- App: `cd app && npx expo start` (abrir con Expo Go en el teléfono, misma Wi-Fi)
- Correos de prueba: http://localhost:8025 (Mailpit) · MinIO: http://localhost:9001

## Ecosistema (por ahora mínimo)
0 subagentes, 0 skills, 0 MCPs. Se agregan solo cuando un dolor real lo justifique
(ver Fases 4–6 del blueprint). No sobre-ingeniería.
