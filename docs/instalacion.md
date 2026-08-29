# Instalar ChasquiYa! en un PC nuevo (Windows)

> Para levantar el proyecto desde cero en otra máquina. Si ya lo tienes andando,
> lo que buscas es `docs/estado-actual.md`.
>
> Tiempo estimado: 40–60 min, casi todo esperando descargas.

## Resumen de lo que se instala

| Qué | Para qué | Versión |
|---|---|---|
| Git | Clonar el repo | cualquiera reciente |
| **Java 21 (Temurin)** | Compilar y correr el backend | **21, no 22+** |
| **Docker Desktop** | Postgres+PostGIS, MinIO y Mailpit | última |
| **Node.js 20 LTS** | Expo y la app | **20** (es lo que usa el CI) |
| Android Studio | Emulador (opcional) | última |

Las versiones de Java y Node no son sugerencias: son las que usa
`.github/workflows/ci.yml`. Si usas otras, puede compilar en tu PC y fallar en CI.

## 1. Instalar todo

Abre **PowerShell como administrador** y pega esto. `winget` viene con Windows 11.

```powershell
winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-package-agreements
winget install --id Docker.DockerDesktop -e --accept-package-agreements
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements
winget install --id GitHub.cli -e --accept-package-agreements
```

**Cierra y reabre la terminal** al terminar, o los comandos nuevos no aparecen.

Docker Desktop pide **reiniciar el PC** la primera vez y que WSL2 esté activo
(el instalador lo hace solo; si reclama, corre `wsl --install` y reinicia).

### Comprobar que quedó bien

```powershell
git --version; node --version; docker --version; java -version
```

Espera Java **21.x**, Node **20.x**. Si `java -version` muestra otra versión,
es que tienes más de un JDK: sigue al paso 2.

## 2. JAVA_HOME (el tropiezo más común)

Maven no usa el `java` del PATH, usa `JAVA_HOME`. Sin esto, `./mvnw` falla o
—peor— compila con otro JDK.

Permanente (PowerShell como administrador, **una sola vez**):

```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", (Get-Item "C:\Program Files\Eclipse Adoptium\jdk-21*").FullName, "Machine")
```

Reabre la terminal y verifica con `$env:JAVA_HOME`.

**En Git Bash hay que exportarlo en cada shell** (es el gotcha que ya está en
`estado-actual.md`):

```bash
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot"
```

Ajusta el número de versión al que instalaste. Para no repetirlo cada vez,
agrégalo al final de `~/.bashrc`.

## 3. Clonar el repositorio

```bash
gh auth login
git clone https://github.com/<tu-usuario>/chasquiya.git
cd chasquiya
```

Sin `gh`, sirve `git clone` normal: pedirá tus credenciales de GitHub.

## 4. Crear el `.env`

**Este archivo no está en el repo a propósito** (tiene las claves). Hay que
crearlo desde la plantilla:

```bash
cp .env.example .env
```

Abre `.env` y reemplaza cada `cambia_esto` por un valor propio. Para desarrollo
local sirve cualquier cosa, pero **el `JWT_SECRET` necesita mínimo 32
caracteres** o el backend no arranca. Uno rápido:

```bash
openssl rand -base64 32
```

(`openssl` viene con Git Bash.)

Las claves de tu otro PC no tienen por qué coincidir: cada máquina tiene su base
de datos local.

## 5. Levantar la infraestructura

Con Docker Desktop **abierto** (el icono de la ballena, no basta con instalarlo):

```bash
docker compose up -d
docker compose ps
```

Los tres —`db`, `minio`, `mailpit`— tienen que decir `running`. La primera vez
descarga ~1 GB de imágenes.

## 6. Levantar el backend

```bash
cd backend
./mvnw spring-boot:run
```

La primera vez Maven baja las dependencias (varios minutos). Al arrancar,
**Flyway corre sus 24 migraciones y arma el esquema solo**, y `AdminSeeder` crea
el usuario admin con el `ADMIN_EMAIL` y `ADMIN_PASSWORD` de tu `.env`.

Comprueba:

- API: http://localhost:8080/actuator/health → `{"status":"UP"}`
- Backoffice: http://localhost:8080/backoffice/
- Swagger: http://localhost:8080/swagger-ui.html
- Correos de prueba: http://localhost:8025
- MinIO: http://localhost:9001

## 7. Levantar la app

En **otra terminal** (el backend se queda corriendo):

```bash
cd app
npm install
npx expo start --tunnel
```

Escanea el QR con **Expo Go** en tu teléfono. `--tunnel` evita tener que estar
en la misma Wi-Fi; sin él, el teléfono y el PC deben compartir red y el firewall
de Windows tiene que dejar pasar el 8080.

**La app apunta al backend por la IP del PC**, no por localhost. Esa IP vive en
`app/src/api/config.ts` y **es distinta en cada máquina**: revísala en el PC
nuevo con `ipconfig` y ajústala si no conecta.

## 8. Datos de prueba

Ojo con esto: en el PC nuevo la base arranca **vacía salvo el admin**. Los
5 maestros y 2 clientes de `estado-actual.md` se crearon a mano y **no viven en
el repo** (`AdminSeeder` solo crea el admin).

Para tener con qué probar, regístralos desde la app: crea un par de clientes y
un par de maestros, y aprueba los maestros desde el backoffice. Un maestro no
aparece en la búsqueda hasta que está **aprobado y con precios publicados** de
ese oficio.

## 9. Emulador de Android (opcional)

Solo si quieres probar sin teléfono. `winget install Google.AndroidStudio`, y
desde Android Studio crea un AVD (Pixel 7, Android 15). Después:

```bash
"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd <nombre-del-avd>
adb emu geo fix -70.6693 -33.4489
npx expo start --port 8082
```

La ubicación vuelve a California en cada arranque, y en `geo fix` va **la
longitud primero**. El 8082 es para no chocar con el `--tunnel` del teléfono.

## Si algo falla

| Síntoma | Causa y salida |
|---|---|
| `Connection to localhost:5432 refused` | Docker Desktop no está corriendo. Ábrelo y espera a que la ballena deje de animarse. |
| `Port 8080 was already in use` | Otro backend quedó vivo: `taskkill //F //IM java.exe`. Puede pasar **sin que haya Java corriendo** si Windows le dio el 8080 a otra conexión; se ve con `netstat -ano \| grep ":8080 "`. Salida: `./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8091`. |
| `./mvnw` no encuentra Java | Falta `JAVA_HOME` (paso 2). En Git Bash hay que exportarlo en cada shell. |
| La app no conecta con el backend | La IP de `app/src/api/config.ts` es la del otro PC. Corrige con tu `ipconfig`. |
| Flyway: `Validate failed` | La base quedó a medias de una migración. En desarrollo: `docker compose down -v` y volver a `up -d`. **Borra todos los datos locales.** |
| Expo se comporta raro tras instalar algo nativo | Cierra y reabre Expo Go en el teléfono. |

Los gotchas de Windows que solo aparecen trabajando (curl y UTF-8, capturas del
emulador, rutas msys) están en `docs/estado-actual.md`.
