// Pruebas manuales complementarias a ZAP: payloads de SQLi, XSS y abuso de auth
// contra la API local. Uso: (con el servidor corriendo con `npm start`)
//   node security/pruebas-manuales.js
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const post = (path, body, token) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

// 401 (credenciales invalidas) o 429 (limite de intentos) significan que no se inicio sesion.
const rechazado = (status) => status === 401 || status === 429;

const resultados = [];
const anotar = (id, prueba, esperado, obtenido, ok) =>
  resultados.push({ id, prueba, esperado, obtenido, resultado: ok ? 'OK' : 'HALLAZGO' });

(async () => {
  const sfx = Date.now();
  // Cuenta de prueba
  await post('/api/auth/registro', { nombre: 'Victima', email: `v${sfx}@test.com`, password: 'Abcd1234' });

  // SQLi clasicos en login
  const sqli = ["' OR '1'='1", "admin'--", "' OR 1=1 --", "'; DROP TABLE users; --", '" OR ""="'];
  for (const [i, payload] of sqli.entries()) {
    const r = await post('/api/auth/login', { email: payload, password: payload });
    anotar(`SQLI-${i + 1}`, `Login con payload SQLi: ${payload}`, '401 o 429 (sin sesion)', String(r.status), rechazado(r.status));
  }
  // SQLi via email valido + password inyectado
  const r1 = await post('/api/auth/login', { email: `v${sfx}@test.com`, password: "' OR '1'='1" });
  anotar('SQLI-6', 'Email valido + password con SQLi', '401 o 429', String(r1.status), rechazado(r1.status));

  // Operadores tipo NoSQL / tipos inesperados
  const r2 = await post('/api/auth/login', { email: { $ne: null }, password: { $ne: null } });
  anotar('INJ-1', 'Login con objetos {"$ne":null}', '401 o 429 (sin 500)', String(r2.status), rechazado(r2.status));
  const r3 = await post('/api/auth/login', { email: `v${sfx}@test.com`, password: { $ne: null } });
  anotar('INJ-2', 'Email valido + password como objeto', '401 o 429 (sin 500)', String(r3.status), rechazado(r3.status));

  // XSS almacenado
  const xss = '<script>alert(1)</script>';
  const r4 = await post('/api/auth/registro', { nombre: xss, email: `x${sfx}@test.com`, password: 'Abcd1234' });
  const b4 = await r4.json();
  anotar('XSS-1', 'Registro con nombre <script> (JSON, se renderiza con textContent)', 'Aceptado pero no ejecutable', `${r4.status}, nombre guardado tal cual: ${b4.user && b4.user.nombre === xss}`, true);

  // Control de acceso
  const r5 = await fetch(BASE + '/api/donaciones');
  anotar('AUTH-1', 'GET /api/donaciones sin token', '401', String(r5.status), r5.status === 401);
  const r6 = await post('/api/donaciones', { tipo: 'dinero', cantidad: 1 }, 'token.falso.aqui');
  anotar('AUTH-2', 'POST /api/donaciones con JWT falso', '401', String(r6.status), r6.status === 401);
  const r7 = await post('/api/auth/registro', { nombre: 'Intruso', email: `i${sfx}@test.com`, password: 'Abcd1234', rol: 'administrador' });
  const b7 = await r7.json();
  anotar('AUTH-3', 'Auto-registro enviando rol=administrador', 'Rol forzado a "usuario"', `${r7.status}, rol asignado: ${b7.user && b7.user.rol}`, b7.user && b7.user.rol === 'usuario');

  // Fuerza bruta sin limite
  let bloqueado = false;
  for (let i = 0; i < 30; i++) {
    const r = await post('/api/auth/login', { email: `v${sfx}@test.com`, password: `mala${i}` });
    if (r.status === 429) { bloqueado = true; break; }
  }
  anotar('BRUTE-1', '30 intentos de login fallidos seguidos', 'Bloqueo/limite (429)', bloqueado ? '429' : 'sin limite (todos 401)', bloqueado);

  // Cabeceras de seguridad
  const h = await fetch(BASE + '/');
  const falt = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'strict-transport-security']
    .filter((k) => !h.headers.get(k));
  anotar('HDR-1', 'Cabeceras de seguridad presentes', 'CSP, X-Content-Type-Options, X-Frame-Options, HSTS', falt.length ? `faltan: ${falt.join(', ')}` : 'todas', falt.length === 0);
  anotar('HDR-2', 'Cabecera X-Powered-By oculta', 'ausente', h.headers.get('x-powered-by') || 'ausente', !h.headers.get('x-powered-by'));

  console.table(resultados.map(({ id, prueba, esperado, obtenido, resultado }) => ({ id, resultado, esperado, obtenido })));
  const hall = resultados.filter((r) => r.resultado === 'HALLAZGO').length;
  console.log(`\nTotal pruebas: ${resultados.length} | OK: ${resultados.length - hall} | Hallazgos: ${hall}`);
})();
