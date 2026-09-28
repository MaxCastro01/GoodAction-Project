# Good Action — Sistema de Gestion de Donaciones y Comprobantes

Backend en Node.js/Express con autenticacion JWT y roles, registro de donativos con folio
unico, pruebas unitarias (Jest + Supertest), pipeline CI/CD (GitHub Actions) y analisis de
seguridad y calidad (OWASP ZAP y SonarQube Cloud).

## Estructura

```
src/
  app.js                  -> Express: helmet, limite de intentos, rutas, manejo de errores
  server.js               -> arranque (carga .env, exige JWT_SECRET, crea el administrador inicial)
  middleware/
    auth.js               -> valida JWT y roles (usuario / administrador)
    rateLimit.js          -> limite de peticiones por IP
  modules/
    auth/                 -> registro publico (siempre rol "usuario"), login, administrador inicial
    donaciones/           -> registro y consulta de donativos, reporte de impacto (solo admin)
    comprobantes/         -> folio unico
    instituciones/        -> alta (admin) y listado
    notificaciones/       -> simulacion (consola)
tests/                    -> pruebas Jest (auth, donaciones, seguridad)
security/pruebas-manuales.js -> pruebas manuales de SQLi, XSS, control de acceso, fuerza bruta y cabeceras
public/                   -> frontend
.github/workflows/ci.yml  -> pipeline: pruebas, despliegue de prueba y analisis Sonar
sonar-project.properties  -> configuracion de SonarQube Cloud
```

## Como correrlo

```bash
npm install
cp .env.example .env      # en Windows (cmd): copy .env.example .env
# edita .env: JWT_SECRET (obligatoria), ADMIN_EMAIL y ADMIN_PASSWORD
npm start                 # http://localhost:3000
```

- `JWT_SECRET` es obligatoria: sin ella el servidor no arranca.
- El registro publico solo crea cuentas con rol `usuario`. El administrador se crea al arrancar
  con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (si no existe).

## Pruebas

```bash
npm test                  # Jest con cobertura (umbral 80 %)
node security/pruebas-manuales.js   # con el servidor corriendo (npm start)
```

Nota: el login limita a 10 intentos por IP cada 15 minutos (`LOGIN_RATE_LIMIT_MAX`). Si repites
las pruebas manuales dentro de esa ventana veras respuestas 429; reinicia el servidor o espera.

## Correcciones de seguridad aplicadas

| Hallazgo (informe, seccion 7.1) | Correccion |
|---|---|
| Auto-registro como administrador (alta) | El registro ignora `rol`; el admin inicial se crea con variables de entorno. Hay una prueba que lo verifica. |
| Sin limite de intentos de login (media) | `express-rate-limit` en `/api/auth/login` y `/api/auth/registro`. |
| Faltan cabeceras de seguridad (media) | `helmet`: CSP sin estilos ni scripts en linea, HSTS, X-Content-Type-Options, X-Frame-Options. |
| `JWT_SECRET` con valor por defecto (media) | Sin valor por defecto: el servidor no arranca sin la variable. |
| `X-Powered-By` expuesto (baja) | Desactivada. |

Ademas: validacion de entradas (correo, contrasena de 8 a 72 caracteres, tipo y cantidad de
donativo), limite de 10 KB para el cuerpo JSON, verificacion de JWT solo con HS256, respuestas de
error genericas (sin trazas) y todas las acciones de GitHub fijadas por SHA con permisos minimos.

## Analisis de SonarQube Cloud

1. En https://sonarcloud.io importa el repositorio y copia `organization` y `project key`.
2. Pegalos en `sonar-project.properties` (`sonar.organization` y `sonar.projectKey`).
3. Administration > Analysis Method: desactiva "Automatic Analysis".
4. Crea un token y guardalo en GitHub como secreto `SONAR_TOKEN`
   (Settings > Secrets and variables > Actions).
5. Haz push: el job `analisis-sonar` corre las pruebas y sube el analisis con la cobertura.

Alternativa local:

```bash
npm install -D @sonar/scan
npm test
set SONAR_TOKEN=<tu-token>        # cmd de Windows
npx sonar-scanner-npm
```
