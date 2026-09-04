'use strict';
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const config = require('./config');

const app = express();

// Cabeceras de seguridad (mejora 3.2).
// CSP desactivado por compatibilidad con el código inline del frontend vanilla.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 60 * 60 * 24 * 365 } : false
  })
);

// Limitar tamaño del body (evita payloads gigantes).
// '12mb' permite evaluaciones con imagenes embebidas en base64.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Oculta el header X-Powered-By
app.disable('x-powered-by');

// Rate limit global a la API
app.use('/api', apiLimiter);

// Archivos estáticos con caché
const publicDir =
  process.env.SERVE_BUILT === '1' ? path.join(__dirname, 'public-dist') : path.join(__dirname, 'public');
app.use(
  express.static(publicDir, {
    maxAge: config.nodeEnv === 'production' ? '1d' : 0,
    etag: true
  })
);

// Rutas de la API
app.use('/api', apiRoutes);

// Documentación OpenAPI (mejora 7.5)
app.get('/api/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'openapi.json'));
});

// Páginas SPA
const pages = {
  '/': 'index.html',
  '/dashboard': 'dashboard.html',
  '/evaluacion': 'evaluacion.html',
  '/resultado': 'resultado.html',
  '/profesor': 'profesor.html',
  '/certificado': 'certificado.html'
};
Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(publicDir, file)));
});

// 404 y manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
