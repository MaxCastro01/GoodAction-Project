const express = require('express');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const donacionesRoutes = require('./modules/donaciones/donaciones.routes');
const institucionesRoutes = require('./modules/instituciones/instituciones.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/donaciones', donacionesRoutes);
app.use('/api/instituciones', institucionesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
