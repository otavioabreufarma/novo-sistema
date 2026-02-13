const { app } = require('./app');
const { env } = require('./config/env');

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Rust VIP backend rodando na porta ${env.port}`);
});
