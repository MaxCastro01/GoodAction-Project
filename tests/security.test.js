const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { app, resetData, crearUsuarioYToken } = require('./helpers');
const { createLimiter } = require('../src/middleware/rateLimit');

beforeEach(resetData);

describe('Seguridad: cabeceras HTTP', () => {
  test('incluye cabeceras de seguridad y oculta X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('Seguridad: limite de intentos', () => {
  test('createLimiter responde 429 al superar el limite', async () => {
    const mini = express();
    mini.use(createLimiter({ limit: 3 }));
    mini.get('/', (req, res) => res.json({ ok: true }));
    for (let i = 0; i < 3; i += 1) {
      expect((await request(mini).get('/')).status).toBe(200);
    }
    const res = await request(mini).get('/');
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Demasiados/);
  });

  test('el login de la aplicacion aplica el limite configurado', async () => {
    process.env.LOGIN_RATE_LIMIT_MAX = '3';
    let limitedApp;
    jest.isolateModules(() => {
      limitedApp = require('../src/app');
    });
    process.env.LOGIN_RATE_LIMIT_MAX = '1000';
    for (let i = 0; i < 3; i += 1) {
      const r = await request(limitedApp).post('/api/auth/login').send({ email: 'x@example.com', password: `mala${i}mala` });
      expect(r.status).toBe(401);
    }
    const bloqueado = await request(limitedApp).post('/api/auth/login').send({ email: 'x@example.com', password: 'otra-mala1' });
    expect(bloqueado.status).toBe(429);
  });
});

describe('Seguridad: manejo de errores y tokens', () => {
  test('JSON mal formado devuelve 400 sin trazas', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.text).not.toMatch(/at .*\.js/);
  });

  test('cuerpo demasiado grande devuelve 413', async () => {
    const res = await request(app).post('/api/auth/registro').send({ nombre: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('errores del cliente no filtran detalles internos', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json; charset=bad').send('{}');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.text).not.toMatch(/node_modules/);
  });

  test('rutas de API desconocidas devuelven 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('un token expirado o firmado con otra clave es rechazado', async () => {
    const expirado = jwt.sign({ sub: 1, rol: 'usuario' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const ajeno = jwt.sign({ sub: 1, rol: 'administrador' }, 'otra-clave', { expiresIn: '1h' });
    for (const t of [expirado, ajeno]) {
      const res = await request(app).get('/api/donaciones').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(401);
    }
  });

  test('sin JWT_SECRET las rutas protegidas responden 401', async () => {
    const token = await crearUsuarioYToken('u@example.com');
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const res = await request(app).get('/api/donaciones').set('Authorization', `Bearer ${token}`);
    process.env.JWT_SECRET = original;
    expect(res.status).toBe(401);
  });
});
