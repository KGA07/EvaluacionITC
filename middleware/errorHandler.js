'use strict';

// Manejador global de errores
function notFound(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso no encontrado.' });
  }
  res.status(404).sendFile(require('path').join(__dirname, '..', 'public', 'index.html'));
}

function errorHandler(err, req, res, next) {
  // Los errores de body-parser con JSON malformado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido en la peticion.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Peticion demasiado grande.' });
  }
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({ error: 'Peticion demasiado grande.' });
  }
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message || 'Error en la peticion.' });
  }

  // eslint-disable-next-line no-console
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { notFound, errorHandler };
