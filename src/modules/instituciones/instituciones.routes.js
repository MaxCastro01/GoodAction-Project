const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { data, save } = require('../../db');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({ instituciones: data.instituciones });
});

router.post('/', requireAuth, requireRole('administrador'), (req, res) => {
  const { nombre, necesidades } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  const institucion = {
    id: data.instituciones.length + 1,
    nombre,
    necesidades: necesidades || '',
  };
  data.instituciones.push(institucion);
  save();
  return res.status(201).json({ institucion });
});

module.exports = router;
