const crypto = require('crypto');

function generarFolio() {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GA-${fecha}-${random}`;
}

module.exports = { generarFolio };
