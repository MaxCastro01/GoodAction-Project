const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Good Action API escuchando en el puerto ${PORT}`);
});
