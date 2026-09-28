'use strict';

let token = null;
let usuarioActual = null;

const sesionInfo = document.getElementById('sesion-info');
const seccionAuth = document.getElementById('seccion-auth');
const seccionDonacion = document.getElementById('seccion-donacion');
const panelAdmin = document.getElementById('panel-admin');
const authMensaje = document.getElementById('auth-mensaje');
const donMensaje = document.getElementById('don-mensaje');
const listaDonaciones = document.getElementById('lista-donaciones');
const reporteImpacto = document.getElementById('reporte-impacto');

function jsonRequest(path, method, body, useToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (useToken && token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

async function readJson(res) {
  try {
    return await res.json();
  } catch (err) {
    return {};
  }
}

function cerrarSesion() {
  token = null;
  usuarioActual = null;
  sesionInfo.textContent = 'No has iniciado sesion';
  seccionAuth.hidden = false;
  seccionDonacion.hidden = true;
  panelAdmin.hidden = true;
  listaDonaciones.replaceChildren();
  reporteImpacto.textContent = '';
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    nombre: document.getElementById('reg-nombre').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
  };
  const res = await jsonRequest('/api/auth/registro', 'POST', body, false);
  const data = await readJson(res);
  authMensaje.textContent = res.ok
    ? `Cuenta creada para ${data.user.email}. Ahora inicia sesion.`
    : `Error: ${data.error}`;
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value,
  };
  const res = await jsonRequest('/api/auth/login', 'POST', body, false);
  const data = await readJson(res);
  if (!res.ok) {
    authMensaje.textContent = `Error: ${data.error}`;
    return;
  }
  token = data.token;
  usuarioActual = data.user;
  sesionInfo.textContent = `Sesion: ${usuarioActual.email} (${usuarioActual.rol})`;
  authMensaje.textContent = '';
  seccionAuth.hidden = true;
  seccionDonacion.hidden = false;
  panelAdmin.hidden = usuarioActual.rol !== 'administrador';
  cargarDonaciones();
});

document.getElementById('form-donacion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const valor = document.getElementById('don-valor').value;
  const body = {
    tipo: document.getElementById('don-tipo').value,
    cantidad: Number(document.getElementById('don-cantidad').value),
    descripcion: document.getElementById('don-descripcion').value,
  };
  if (valor !== '') body.valorEstimado = Number(valor);
  const res = await jsonRequest('/api/donaciones', 'POST', body, true);
  const data = await readJson(res);
  if (res.status === 401) {
    cerrarSesion();
    authMensaje.textContent = 'Tu sesion expiro. Inicia sesion de nuevo.';
    return;
  }
  donMensaje.textContent = res.ok
    ? `Donativo registrado. Folio: ${data.donacion.folio}`
    : `Error: ${data.error}`;
  if (res.ok) cargarDonaciones();
});

async function cargarDonaciones() {
  const res = await jsonRequest('/api/donaciones', 'GET', null, true);
  const data = await readJson(res);
  listaDonaciones.replaceChildren();
  (data.donaciones || []).forEach((d) => {
    const li = document.createElement('li');
    li.textContent = `${d.folio} — ${d.tipo} x${d.cantidad} (${d.estado})`;
    listaDonaciones.appendChild(li);
  });
}

document.getElementById('btn-impacto').addEventListener('click', async () => {
  const res = await jsonRequest('/api/donaciones/reportes/impacto', 'GET', null, true);
  const data = await readJson(res);
  reporteImpacto.textContent = res.ok ? JSON.stringify(data, null, 2) : `Error: ${data.error}`;
});

document.getElementById('btn-salir').addEventListener('click', cerrarSesion);
