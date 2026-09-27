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

async function crearUsuarioYToken(email, rol) {
  await request(app).post('/api/auth/registro').send({
    nombre: 'Usuario Prueba', email, password: '12345678', rol,
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: '12345678' });
  return login.body.token;
}

describe('Donaciones: proteccion por JWT', () => {
  test('rechaza creacion sin token', async () => {
    const res = await request(app).post('/api/donaciones').send({ tipo: 'dinero', cantidad: 100 });
    expect(res.status).toBe(401);
  });

  test('rechaza token invalido', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', 'Bearer token-invalido')
      .send({ tipo: 'dinero', cantidad: 100 });
    expect(res.status).toBe(401);
  });
});

describe('Donaciones: registro', () => {
  test('un usuario autenticado puede registrar una donacion y recibe folio unico', async () => {
    const token = await crearUsuarioYToken('donante@example.com', 'usuario');
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'dinero', cantidad: 500, descripcion: 'Apoyo mensual' });
    expect(res.status).toBe(201);
    expect(res.body.donacion.folio).toMatch(/^GA-\d{8}-[A-F0-9]{6}$/);
    expect(res.body.donacion.estado).toBe('registrado');
  });

  test('rechaza donacion sin tipo ni cantidad', async () => {
    const token = await crearUsuarioYToken('donante2@example.com', 'usuario');
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ descripcion: 'sin tipo ni cantidad' });
    expect(res.status).toBe(400);
  });
});

describe('Donaciones: listado por rol', () => {
  test('un usuario solo ve sus propias donaciones', async () => {
    const tokenA = await crearUsuarioYToken('a@example.com', 'usuario');
    const tokenB = await crearUsuarioYToken('b@example.com', 'usuario');

    await request(app).post('/api/donaciones').set('Authorization', `Bearer ${tokenA}`)
      .send({ tipo: 'dinero', cantidad: 100 });

    const res = await request(app).get('/api/donaciones').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.donaciones.length).toBe(0);
  });

  test('un administrador ve todas las donaciones', async () => {
    const tokenUser = await crearUsuarioYToken('c@example.com', 'usuario');
    const tokenAdmin = await crearUsuarioYToken('admin@example.com', 'administrador');

    await request(app).post('/api/donaciones').set('Authorization', `Bearer ${tokenUser}`)
      .send({ tipo: 'alimento', cantidad: 10 });

    const res = await request(app).get('/api/donaciones').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.donaciones.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Donaciones: reporte de impacto', () => {
  test('un usuario normal no puede ver el reporte de impacto', async () => {
    const token = await crearUsuarioYToken('d@example.com', 'usuario');
    const res = await request(app)
      .get('/api/donaciones/reportes/impacto')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('un administrador si puede ver el reporte de impacto', async () => {
    const tokenUser = await crearUsuarioYToken('e@example.com', 'usuario');
    const tokenAdmin = await crearUsuarioYToken('admin2@example.com', 'administrador');

    await request(app).post('/api/donaciones').set('Authorization', `Bearer ${tokenUser}`)
      .send({ tipo: 'insumo', cantidad: 3 });

    const res = await request(app)
      .get('/api/donaciones/reportes/impacto')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.totalDonaciones).toBeGreaterThanOrEqual(1);
    expect(res.body.porTipo.insumo).toBeGreaterThanOrEqual(1);
  });
});
