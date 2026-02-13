function notFound(_req, res) {
  return res.status(404).json({ error: 'Endpoint não encontrado.' });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.response?.status || 500;
  const message = error.response?.data || error.message || 'Erro interno do servidor.';

  return res.status(statusCode).json({
    error: 'InternalError',
    message
  });
}

module.exports = { notFound, errorHandler };
