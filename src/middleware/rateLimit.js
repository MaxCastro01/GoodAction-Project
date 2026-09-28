const rateLimit = require('express-rate-limit');

// Limita el numero de peticiones por IP en una ventana de tiempo (defensa contra fuerza bruta).
function createLimiter({ windowMs = 15 * 60 * 1000, limit = 10, message } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message || 'Demasiados intentos. Intenta de nuevo mas tarde.' },
  });
}

module.exports = { createLimiter };
