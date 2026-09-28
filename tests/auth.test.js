const request = require('supertest');
const { app, resetData, PASSWORD } = require('./helpers');
const { seedAdmin, findUserByEmail, getJwtSecret } = require('../src/modules/auth/auth.service');

beforeEach(resetData);

const registrar = (body) => request(app).post('/api/auth/registro').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);

describe('Auth: registro', () => {
  test('registra un usuario con rol "usuario" y sin exponer el hash', async () => {
    const res = await registrar({ nombre: 'Ana Donante', email: 'ana@example.com', password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(res.body.user.rol).toBe('usuario');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('ignora el campo "rol": nadie puede auto-asignarse administrador', async () => {
    const res = await registrar({ nombre: 'Intruso', email: 'intruso@example.com', password: PASSWORD, rol: 'administrador' });
    expect(res.status).toBe(201);
    expect(res.body.user.rol).toBe('usuario');
    expect(findUserByEmail('intruso@example.com').rol).toBe('usuario');
  });

  test('rechaza campos faltantes', async () => {
    const res = await registrar({ email: 'sin-nombre@example.com', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test.each(['sin-arroba', 'a@b', 'a b@example.com', '@example.com', 'a@@example.com', 'a@example.'])(
    'rechaza el correo invalido "%s"',
    async (email) => {
      const res = await registrar({ nombre: 'Ana', email, password: PASSWORD });
      expect(res.status).toBe(400);
    }
  );

  test('rechaza contrasenas cortas y no textuales', async () => {
    expect((await registrar({ nombre: 'Ana', email: 'a@example.com', password: '1234' })).status).toBe(400);
    expect((await registrar({ nombre: 'Ana', email: 'a@example.com', password: 12345678 })).status).toBe(400);
  });

  test('rechaza nombres vacios o demasiado largos', async () => {
    expect((await registrar({ nombre: '   ', email: 'a@example.com', password: PASSWORD })).status).toBe(400);
    expect((await registrar({ nombre: 'x'.repeat(101), email: 'a@example.com', password: PASSWORD })).status).toBe(400);
  });

  test('rechaza correos duplicados sin distinguir mayusculas', async () => {
    await registrar({ nombre: 'Ana', email: 'ana@example.com', password: PASSWORD });
    const res = await registrar({ nombre: 'Ana Otra', email: 'ANA@example.com', password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test('responde 400 cuando no hay cuerpo', async () => {
    const res = await request(app).post('/api/auth/registro');
    expect(res.status).toBe(400);
  });
});

describe('Auth: login', () => {
  beforeEach(async () => {
    await registrar({ nombre: 'Ana', email: 'ana@example.com', password: PASSWORD });
  });

  test('login exitoso devuelve token y usuario', async () => {
    const res = await login({ email: 'ana@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@example.com');
  });

  test('falla con contrasena incorrecta o correo inexistente', async () => {
    expect((await login({ email: 'ana@example.com', password: 'incorrecta1' })).status).toBe(401);
    expect((await login({ email: 'no-existe@example.com', password: PASSWORD })).status).toBe(401);
  });

  test('rechaza cargas de inyeccion y tipos inesperados sin errores 500', async () => {
    const payloads = [
      { email: "' OR '1'='1", password: "' OR '1'='1" },
      { email: 'admin\'--', password: 'x' },
      { email: { $ne: null }, password: { $ne: null } },
      { email: 'ana@example.com', password: { $ne: null } },
      {},
    ];
    for (const p of payloads) {
      const res = await login(p);
      expect(res.status).toBe(401);
    }
  });

  test('responde 500 generico (sin detalles) si falta JWT_SECRET', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const res = await login({ email: 'ana@example.com', password: PASSWORD });
    process.env.JWT_SECRET = original;
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });
});

describe('Auth: administrador inicial y clave JWT', () => {
  test('seedAdmin crea el administrador una sola vez', async () => {
    const a = await seedAdmin({ nombre: 'Admin', email: 'admin@example.com', password: PASSWORD });
    const b = await seedAdmin({ nombre: 'Admin', email: 'admin@example.com', password: PASSWORD });
    expect(a.rol).toBe('administrador');
    expect(b.id).toBe(a.id);
    const res = await login({ email: 'admin@example.com', password: PASSWORD });
    expect(res.body.user.rol).toBe('administrador');
  });

  test('getJwtSecret falla si la variable no esta definida', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
    process.env.JWT_SECRET = original;
    expect(getJwtSecret()).toBe(original);
  });
});
