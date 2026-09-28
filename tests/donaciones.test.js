const request = require('supertest');
const { app, resetData, crearUsuarioYToken } = require('./helpers');

beforeEach(resetData);

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const crear = (token, body) => request(app).post('/api/donaciones').set(auth(token)).send(body);

describe('Donaciones: proteccion por JWT', () => {
  test('rechaza creacion sin token', async () => {
    const res = await request(app).post('/api/donaciones').send({ tipo: 'dinero', cantidad: 100 });
    expect(res.status).toBe(401);
  });

  test('rechaza token invalido', async () => {
    const res = await crear('token-invalido', { tipo: 'dinero', cantidad: 100 });
    expect(res.status).toBe(401);
  });
});

describe('Donaciones: registro y validacion', () => {
  test('un usuario autenticado registra una donacion y recibe folio unico', async () => {
    const token = await crearUsuarioYToken('donante@example.com');
    const res = await crear(token, { tipo: 'dinero', cantidad: 500, valorEstimado: 500, descripcion: 'Apoyo mensual' });
    expect(res.status).toBe(201);
    expect(res.body.donacion.folio).toMatch(/^GA-\d{8}-[A-F0-9]{6}$/);
    expect(res.body.donacion.estado).toBe('registrado');
    expect(res.body.donacion.valorEstimado).toBe(500);
  });

  test('los folios generados son distintos', async () => {
    const token = await crearUsuarioYToken('donante@example.com');
    const a = await crear(token, { tipo: 'alimento', cantidad: 1 });
    const b = await crear(token, { tipo: 'alimento', cantidad: 1 });
    expect(a.body.donacion.folio).not.toBe(b.body.donacion.folio);
  });

  test.each([
    ['sin tipo ni cantidad', { descripcion: 'x' }],
    ['tipo fuera del catalogo', { tipo: 'oro', cantidad: 1 }],
    ['cantidad cero', { tipo: 'dinero', cantidad: 0 }],
    ['cantidad negativa', { tipo: 'dinero', cantidad: -5 }],
    ['cantidad no numerica', { tipo: 'dinero', cantidad: 'abc' }],
    ['valor estimado negativo', { tipo: 'dinero', cantidad: 1, valorEstimado: -1 }],
    ['valor estimado no numerico', { tipo: 'dinero', cantidad: 1, valorEstimado: 'mucho' }],
    ['descripcion demasiado larga', { tipo: 'dinero', cantidad: 1, descripcion: 'x'.repeat(501) }],
    ['descripcion que no es texto', { tipo: 'dinero', cantidad: 1, descripcion: { a: 1 } }],
  ])('rechaza %s', async (_nombre, body) => {
    const token = await crearUsuarioYToken('donante2@example.com');
    const res = await crear(token, body);
    expect(res.status).toBe(400);
  });
});

describe('Donaciones: listado por rol', () => {
  test('un usuario solo ve sus propias donaciones', async () => {
    const tokenA = await crearUsuarioYToken('a@example.com');
    const tokenB = await crearUsuarioYToken('b@example.com');
    await crear(tokenA, { tipo: 'dinero', cantidad: 100 });
    const res = await request(app).get('/api/donaciones').set(auth(tokenB));
    expect(res.status).toBe(200);
    expect(res.body.donaciones.length).toBe(0);
  });

  test('un administrador ve todas las donaciones', async () => {
    const tokenUser = await crearUsuarioYToken('c@example.com');
    const tokenAdmin = await crearUsuarioYToken('admin@example.com', { admin: true });
    await crear(tokenUser, { tipo: 'alimento', cantidad: 10 });
    const res = await request(app).get('/api/donaciones').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.donaciones.length).toBe(1);
  });
});

describe('Donaciones: reporte de impacto', () => {
  test('un usuario normal no puede ver el reporte', async () => {
    const token = await crearUsuarioYToken('d@example.com');
    const res = await request(app).get('/api/donaciones/reportes/impacto').set(auth(token));
    expect(res.status).toBe(403);
  });

  test('un administrador si puede ver el reporte', async () => {
    const tokenUser = await crearUsuarioYToken('e@example.com');
    const tokenAdmin = await crearUsuarioYToken('admin2@example.com', { admin: true });
    await crear(tokenUser, { tipo: 'insumo', cantidad: 3 });
    const res = await request(app).get('/api/donaciones/reportes/impacto').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.totalDonaciones).toBe(1);
    expect(res.body.porTipo.insumo).toBe(1);
  });
});
