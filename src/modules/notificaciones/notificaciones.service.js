// Modulo de notificaciones simplificado.
// En una fase posterior esto se conectaria a un servicio real de correo/SMS.
function notificar(usuarioId, mensaje) {
  console.log(`[Notificacion] usuario ${usuarioId}: ${mensaje}`);
}

module.exports = { notificar };
