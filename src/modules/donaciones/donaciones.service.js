const { data, save } = require('../../db');
const { generarFolio } = require('../comprobantes/comprobantes.service');
const { notificar } = require('../notificaciones/notificaciones.service');

const TIPOS = ['dinero', 'alimento', 'insumo'];
const MAX_DESCRIPCION = 500;

function validarDonacion({ tipo, cantidad, valorEstimado, descripcion }) {
  if (!TIPOS.includes(tipo)) {
    throw new Error('Tipo de donativo invalido (dinero, alimento o insumo)');
  }
  const cant = Number(cantidad);
  if (cantidad === undefined || cantidad === null || cantidad === '' || !Number.isFinite(cant) || cant <= 0) {
    throw new Error('La cantidad debe ser un numero mayor a 0');
  }
  let valor = null;
  if (valorEstimado !== undefined && valorEstimado !== null && valorEstimado !== '') {
    valor = Number(valorEstimado);
    if (!Number.isFinite(valor) || valor < 0) {
      throw new Error('El valor estimado debe ser un numero mayor o igual a 0');
    }
  }
  if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.length > MAX_DESCRIPCION)) {
    throw new Error('La descripcion debe ser texto de maximo 500 caracteres');
  }
  return { cant, valor };
}

function crearDonacion({ usuarioId, tipo, cantidad, valorEstimado, descripcion }) {
  const { cant, valor } = validarDonacion({ tipo, cantidad, valorEstimado, descripcion });
  const donacion = {
    id: data.donaciones.length + 1,
    usuarioId,
    tipo,
    cantidad: cant,
    valorEstimado: valor,
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

module.exports = { crearDonacion, listarDonaciones, resumenImpacto, TIPOS };
