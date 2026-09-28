const request = require('supertest');
const app = require('../src/app');
const { seedAdmin } = require('../src/modules/auth/auth.service');
const { data } = require('../src/db');

const PASSWORD = 'Abcd1234';

function resetData() {
  data.users.length = 0;
  data.donaciones.length = 0;
  data.instituciones.length = 0;
}

// Crea un usuario (o el administrador inicial, sin pasar por el registro publico) y devuelve su token.
async function crearUsuarioYToken(email, { admin = false } = {}) {
  if (admin) {
    await seedAdmin({ nombre: 'Admin Prueba', email, password: PASSWORD });
  } else {
    await request(app).post('/api/auth/registro').send({ nombre: 'Usuario Prueba', email, password: PASSWORD });
  }
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return login.body.token;
}

module.exports = { app, resetData, crearUsuarioYToken, PASSWORD };
