require('dotenv').config();

const app = require('./app');
const { seedAdmin } = require('./modules/auth/auth.service');

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET. Copia .env.example a .env y define un valor seguro.');
  process.exit(1);
}

async function start() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    try {
      await seedAdmin({ nombre: ADMIN_NAME || 'Administrador', email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      console.log('Administrador inicial listo');
    } catch (err) {
      console.error('No se pudo crear el administrador inicial:', err.message);
    }
  }
  app.listen(PORT, () => {
    console.log(`Good Action API escuchando en el puerto ${PORT}`);
  });
}

start();
