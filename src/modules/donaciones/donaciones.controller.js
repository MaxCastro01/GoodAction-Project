const donacionesService = require('./donaciones.service');

function crear(req, res) {
  try {
    const donacion = donacionesService.crearDonacion({
      usuarioId: req.user.sub,
      ...req.body,
    });
    res.status(201).json({ donacion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function listar(req, res) {
  const donaciones = donacionesService.listarDonaciones({
    usuarioId: req.user.sub,
    rol: req.user.rol,
  });
  res.json({ donaciones });
}

function impacto(req, res) {
  res.json(donacionesService.resumenImpacto());
}

module.exports = { crear, listar, impacto };
