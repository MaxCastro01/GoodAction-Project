const { data, save } = require('../../db');
const { generarFolio } = require('../comprobantes/comprobantes.service');
const { notificar } = require('../notificaciones/notificaciones.service');

function crearDonacion({ usuarioId, tipo, cantidad, valorEstimado, descripcion }) {
  if (!tipo || !cantidad) {
    throw new Error('Tipo y cantidad son obligatorios');
  }
  const donacion = {
    id: data.donaciones.length + 1,
    usuarioId,
    tipo,
    cantidad,
    valorEstimado: valorEstimado || null,
    descripcion: descripcion || '',
    folio: generarFolio(),
    estado: 'registrado',
    fecha: new Date().toISOString(),
  };
  data.donaciones.push(donacion);
  save();
  notificar(usuarioId, `Tu donativo fue registrado con folio ${donacion.folio}`);
  return donacion;
}

function listarDonaciones({ usuarioId, rol }) {
  if (rol === 'administrador') return data.donaciones;
  return data.donaciones.filter((d) => d.usuarioId === usuarioId);
}

function resumenImpacto() {
  const totalDonaciones = data.donaciones.length;
  const porTipo = data.donaciones.reduce((acc, d) => {
    acc[d.tipo] = (acc[d.tipo] || 0) + 1;
    return acc;
  }, {});
  return { totalDonaciones, porTipo };
}

module.exports = { crearDonacion, listarDonaciones, resumenImpacto };
