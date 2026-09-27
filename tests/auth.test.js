process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../src/app');
const { data } = require('../src/db');

beforeEach(() => {
  data.users.length = 0;
  data.donaciones.length = 0;
  data.instituciones.length = 0;
});

describe('Auth: registro', () => {
  test('registra un nuevo usuario con rol por defecto "usuario"', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Ana Donante',
      email: 'ana@example.com',
      password: '12345678',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(res.body.user.rol).toBe('usuario');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('permite registrar un administrador explicitamente', async () => {
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Admin',
      email: 'admin@example.com',
      password: '12345678',
      rol: 'administrador',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.rol).toBe('administrador');
  });

  test('rechaza registro con campos faltantes', async () => {
    const res = await request(app).post('/api/auth/registro').send({ email: 'sin-nombre@example.com' });
    expect(res.status).toBe(400);
  });

  test('rechaza registro con correo duplicado', async () => {
    await request(app).post('/api/auth/registro').send({
      nombre: 'Ana', email: 'ana@example.com', password: '12345678',
    });
    const res = await request(app).post('/api/auth/registro').send({
      nombre: 'Ana Otra', email: 'ana@example.com', password: '87654321',
    });
    expect(res.status).toBe(400);
  });
});

describe('Auth: login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/registro').send({
      nombre: 'Ana', email: 'ana@example.com', password: '12345678',
    });
  });

  test('login exitoso devuelve token y usuario', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ana@example.com', password: '12345678',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@example.com');
  });

  test('login falla con contrasena incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ana@example.com', password: 'incorrecta',
    });
    expect(res.status).toBe(401);
  });

  test('login falla con correo inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'no-existe@example.com', password: '12345678',
    });
    expect(res.status).toBe(401);
  });
});
