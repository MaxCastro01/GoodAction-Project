let token = null;
let usuarioActual = null;

const sesionInfo = document.getElementById('sesion-info');
const seccionDonacion = document.getElementById('seccion-donacion');
const panelAdmin = document.getElementById('panel-admin');
const authMensaje = document.getElementById('auth-mensaje');
const donMensaje = document.getElementById('don-mensaje');
const listaDonaciones = document.getElementById('lista-donaciones');

document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    nombre: document.getElementById('reg-nombre').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value,
    rol: document.getElementById('reg-rol').value,
  };
  const res = await fetch('/api/auth/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
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
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    authMensaje.textContent = `Error: ${data.error}`;
    return;
  }
  token = data.token;
  usuarioActual = data.user;
  sesionInfo.textContent = `Sesion: ${usuarioActual.email} (${usuarioActual.rol})`;
  authMensaje.textContent = '';
  seccionDonacion.hidden = false;
  panelAdmin.hidden = usuarioActual.rol !== 'administrador';
  cargarDonaciones();
});

document.getElementById('form-donacion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    tipo: document.getElementById('don-tipo').value,
    cantidad: Number(document.getElementById('don-cantidad').value),
    descripcion: document.getElementById('don-descripcion').value,
  };
  const res = await fetch('/api/donaciones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  donMensaje.textContent = res.ok
    ? `Donativo registrado. Folio: ${data.donacion.folio}`
    : `Error: ${data.error}`;
  if (res.ok) cargarDonaciones();
});

async function cargarDonaciones() {
  const res = await fetch('/api/donaciones', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  listaDonaciones.innerHTML = '';
  (data.donaciones || []).forEach((d) => {
    const li = document.createElement('li');
    li.textContent = `#${d.folio} — ${d.tipo} x${d.cantidad} (${d.estado})`;
    listaDonaciones.appendChild(li);
  });
}

document.getElementById('btn-impacto').addEventListener('click', async () => {
  const res = await fetch('/api/donaciones/reportes/impacto', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  document.getElementById('reporte-impacto').textContent = res.ok
    ? JSON.stringify(data, null, 2)
    : `Error: ${data.error}`;
});
