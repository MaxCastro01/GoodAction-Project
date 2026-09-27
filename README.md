# Good Action — Sistema de Gestion de Donaciones y Comprobantes

Version simplificada del proyecto (avance previo) enfocada en cumplir la actividad de
Implementacion y seguridad + Pruebas y calidad. Backend real en Node.js/Express con
JWT y roles; frontend en HTML/JS puro (sin React) solo para probar el flujo.

## Estructura (fiel a la arquitectura del avance, sin microservicios)

```
src/
  app.js                 -> arma la app de Express y monta las rutas
  server.js              -> levanta el servidor
  db.js                  -> almacenamiento simple en archivo JSON (sustituye a PostgreSQL para esta demo)
  middleware/auth.js      -> valida JWT y roles (administrador/usuario)
  modules/
    auth/                -> registro, login, emision de JWT
    donaciones/          -> registro y listado de donativos (modulo "basico" pedido por la actividad)
    comprobantes/        -> generador de folio unico
    instituciones/       -> alta y listado simple de instituciones
    notificaciones/      -> stub que simula el envio de notificaciones
tests/                   -> pruebas Jest + Supertest (auth y donaciones)
public/                  -> frontend minimo en HTML/CSS/JS vanilla
.github/workflows/ci.yml -> pipeline CI/CD (pruebas + arranque en entorno de prueba)
```

## Como correrlo

```bash
npm install
cp .env.example .env     # ajustar JWT_SECRET si quieres
npm start                # sirve la API y el frontend en http://localhost:3000
```

## Como correr las pruebas (con cobertura)

```bash
npm test
```

La configuracion de Jest en `package.json` mide cobertura solo sobre el modulo
basico pedido por la actividad (auth + donaciones + comprobantes + middleware),
con un umbral de 80% en statements, funciones, lineas y branches.

## Mapeo con las instrucciones de la actividad

1. **Implementacion y seguridad**
   - Modulo basico = registro/login de donantes (`modules/auth`) + registro de
     donativos (`modules/donaciones`).
   - JWT + roles: `middleware/auth.js` (`requireAuth`, `requireRole`).
   - Pruebas unitarias Jest con cobertura >= 80%: `tests/auth.test.js`,
     `tests/donaciones.test.js`.
   - CI/CD con GitHub Actions: `.github/workflows/ci.yml` corre `npm test` y
     luego levanta el servidor para simular el despliegue a un entorno de prueba.
2. **Pruebas y calidad**
   - OWASP ZAP: se apunta al servidor local (`npm start`) contra los endpoints
     `/api/auth/registro`, `/api/auth/login` y `/api/donaciones`.
   - SonarQube/SonarCloud: se corre sobre todo el repositorio para medir deuda
     tecnica y code smells (requiere agregar el token/proyecto de Sonar, no
     incluido aqui).
3. **Cierre y evaluacion**
   - Pendiente de redactar una vez ejecutados los pasos 1 y 2 (comparar
     planificado vs. ejecutado, lecciones aprendidas, plan de mejora continua).

## Como ejecutar el analisis de SonarQube / SonarCloud

El archivo `sonar-project.properties` ya esta configurado para leer el reporte
de cobertura que genera Jest (`coverage/lcov.info`).

**Opcion A — SonarCloud (recomendada si el repo ya esta en GitHub):**
1. Entra a https://sonarcloud.io y da de alta el repositorio con tu cuenta de GitHub.
2. Genera un token en SonarCloud (My Account > Security).
3. Corre localmente:
   ```bash
   npm test                # genera coverage/lcov.info
   npx sonar-scanner \
     -Dsonar.host.url=https://sonarcloud.io \
     -Dsonar.organization=<tu-organizacion> \
     -Dsonar.login=<tu-token>
   ```
4. Los resultados (deuda tecnica, code smells, duplicacion) apareceran en el
   dashboard de SonarCloud del proyecto.

**Opcion B — SonarQube local (con Docker):**
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community
# espera unos segundos a que levante, luego entra a http://localhost:9000
# usuario/clave por defecto: admin / admin (te pedira cambiarla)
npm test
npx sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=<token-generado-en-sonarqube>
```

## Nota sobre la base de datos

El avance original especificaba PostgreSQL. Para esta version simplificada se
usa un archivo JSON (`data/db.json`, generado automaticamente) como capa de
datos, de modo que el proyecto corra sin depender de un servidor de base de
datos externo. La logica de cada modulo esta separada de `db.js`, por lo que
cambiar a PostgreSQL despues implica solo reescribir ese archivo.
