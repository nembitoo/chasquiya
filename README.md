# Chasquiya

Marketplace móvil que conecta **clientes** con **maestros** de oficios del hogar
(gasfitería, electricidad, pintura, jardinería…) en Chile. La plataforma facilita
descubrimiento, confianza y transacción, y cobra una comisión.

> Proyecto en desarrollo · costo cero · datos ficticios · pago simulado.
> Plan maestro completo en [`docs/blueprint.md`](docs/blueprint.md).

## Stack
- **App:** React Native + Expo (SDK 57) + TypeScript — `app/`
- **Backend:** Spring Boot 4 (Java 21) + Maven — `backend/`
- **Base de datos:** PostgreSQL 16 + PostGIS (geolocalización)
- **Entorno local:** Docker Compose (Postgres+PostGIS, MinIO, Mailpit)

## Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [JDK 21](https://adoptium.net/) (Eclipse Temurin) — con `JAVA_HOME` apuntando a él
- [Node.js 20 LTS](https://nodejs.org/)
- App **Expo Go** en el teléfono (para probar la app)

## Cómo arrancar

**1. Configurar variables de entorno** (una sola vez):
```bash
cp .env.example .env
```

**2. Levantar el entorno local** (Postgres+PostGIS, MinIO, Mailpit):
```bash
docker compose up -d
```

**3. Arrancar el backend:**
```bash
cd backend
./mvnw spring-boot:run
```
Prueba: http://localhost:8080/ping y http://localhost:8080/actuator/health

**4. Arrancar la app:**
```bash
cd app
npx expo start
```
Escanea el código QR con **Expo Go** (teléfono en la misma Wi-Fi).

## Servicios locales
| Servicio | URL |
|---|---|
| Backend | http://localhost:8080 |
| MinIO (consola) | http://localhost:9001 |
| Mailpit (correos de prueba) | http://localhost:8025 |

## Apagar
```bash
docker compose down      # conserva los datos
docker compose down -v   # borra también los datos
```

## Estructura
```
chasquiya/
├── app/        App móvil (Expo + TypeScript)
├── backend/    API (Spring Boot + Java)
├── docs/       Documentación y plan maestro
├── docker-compose.yml
├── CLAUDE.md   Reglas para Claude Code
└── .env.example
```
