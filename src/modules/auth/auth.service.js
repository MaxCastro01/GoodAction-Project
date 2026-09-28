const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { data, save } = require('../../db');

const JWT_EXPIRES_IN = '2h';
const ROLE_USER = 'usuario';
const ROLE_ADMIN = 'administrador';
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // limite practico de bcrypt
const MAX_NAME_LENGTH = 100;

// La clave de firma es obligatoria: no existe un valor por defecto.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta definida');
  }
  return secret;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  if (!email || email.length > 254 || /\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  return data.users.find((u) => u.email === normalized);
}

function sanitize(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function validateNewUser({ nombre, email, password }) {
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > MAX_NAME_LENGTH) {
    throw new Error('El nombre es obligatorio (maximo 100 caracteres)');
  }
  if (!isValidEmail(normalizeEmail(email))) {
    throw new Error('El correo no es valido');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`La contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`);
  }
}

// Uso interno: el rol nunca proviene de una peticion HTTP.
async function createUser({ nombre, email, password }, rol) {
  validateNewUser({ nombre, email, password });
  const normalized = normalizeEmail(email);
  if (findUserByEmail(normalized)) {
    throw new Error('El correo ya esta registrado');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: data.users.length + 1,
    nombre: nombre.trim(),
    email: normalized,
    passwordHash,
    rol,
  };
  data.users.push(user);
  save();
  return sanitize(user);
}

// Registro publico: siempre crea cuentas con rol "usuario", ignora cualquier campo "rol".
function register({ nombre, email, password } = {}) {
  return createUser({ nombre, email, password }, ROLE_USER);
}

// Crea (una sola vez) el administrador inicial a partir de variables de entorno.
async function seedAdmin({ nombre, email, password }) {
  const existing = findUserByEmail(email);
  if (existing) return sanitize(existing);
  return createUser({ nombre, email, password }, ROLE_ADMIN);
}

async function login({ email, password } = {}) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Credenciales invalidas');
  }
  const user = findUserByEmail(email);
  if (!user) throw new Error('Credenciales invalidas');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Credenciales invalidas');
  const token = jwt.sign(
    { sub: user.id, rol: user.rol, email: user.email },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { token, user: sanitize(user) };
}

module.exports = { register, login, seedAdmin, findUserByEmail, getJwtSecret, ROLE_USER, ROLE_ADMIN };
