const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { data, save } = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '2h';
const ROLES = ['administrador', 'usuario'];

function findUserByEmail(email) {
  return data.users.find((u) => u.email === email);
}

function sanitize(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function register({ nombre, email, password, rol }) {
  if (!nombre || !email || !password) {
    throw new Error('Nombre, correo y contrasena son obligatorios');
  }
  if (findUserByEmail(email)) {
    throw new Error('El correo ya esta registrado');
  }
  const finalRole = ROLES.includes(rol) ? rol : 'usuario';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: data.users.length + 1,
    nombre,
    email,
    passwordHash,
    rol: finalRole,
  };
  data.users.push(user);
  save();
  return sanitize(user);
}

async function login({ email, password }) {
  const user = findUserByEmail(email);
  if (!user) throw new Error('Credenciales invalidas');
  const valid = await bcrypt.compare(password || '', user.passwordHash);
  if (!valid) throw new Error('Credenciales invalidas');
  const token = jwt.sign(
    { sub: user.id, rol: user.rol, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, user: sanitize(user) };
}

module.exports = { register, login, findUserByEmail, JWT_SECRET, ROLES };
