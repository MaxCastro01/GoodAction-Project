const express = require('express');
const helmet = require('helmet');
const path = require('path');

const { createLimiter } = require('./middleware/rateLimit');
const authRoutes = require('./modules/auth/auth.routes');
const donacionesRoutes = require('./modules/donaciones/donaciones.routes');
const institucionesRoutes = require('./modules/instituciones/instituciones.routes');

const app = express();

// Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options, X-Frame-Options...) y sin X-Powered-By.
// La CSP no permite estilos ni scripts en linea; "upgrade-insecure-requests" solo se activa en produccion
// para no romper la ejecucion local por HTTP.
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'style-src': ["'self'"],
      'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Limite de intentos contra fuerza bruta
const loginLimit = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
const registroLimit = Number(process.env.REGISTER_RATE_LIMIT_MAX) || 20;
app.use('/api/auth/login', createLimiter({ limit: loginLimit }));
app.use('/api/auth/registro', createLimiter({ limit: registroLimit, message: 'Demasiados registros desde esta direccion. Intenta mas tarde.' }));

app.use('/api/auth', authRoutes);
app.use('/api/donaciones', donacionesRoutes);
app.use('/api/instituciones', institucionesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo de errores generico: no se filtran detalles internos ni trazas
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es un JSON valido' });
  }
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'Solicitud invalida' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
