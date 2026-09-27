const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./donaciones.controller');

const router = Router();

router.post('/', requireAuth, controller.crear);
router.get('/', requireAuth, controller.listar);
router.get('/reportes/impacto', requireAuth, requireRole('administrador'), controller.impacto);

module.exports = router;
