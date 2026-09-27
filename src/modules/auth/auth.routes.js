const { Router } = require('express');
const { registerHandler, loginHandler } = require('./auth.controller');

const router = Router();

router.post('/registro', registerHandler);
router.post('/login', loginHandler);

module.exports = router;
