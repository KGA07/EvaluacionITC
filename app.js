'use strict';
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const config = require('./config');

const app = express();

// Seguridad: cabeceras HTTP
app.use(helmet({ contentSecurityPolicy: false }));

// Limitar tamaño del body (evita payloads gigantes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limit global a la API
app.use('/api', apiLimiter);

// Archivos estáticos con caché
const publicDir = path.join(__dirname, 'public');
app.use(
  express.static(publicDir, {
    maxAge: config.nodeEnv === 'production' ? '1d' : 0,
    etag: true
  })
);

// Rutas de la API
app.use('/api', apiRoutes);

// Páginas SPA
const pages = {
  '/': 'index.html',
  '/dashboard': 'dashboard.html',
  '/evaluacion': 'evaluacion.html',
  '/resultado': 'resultado.html',
  '/profesor': 'profesor.html'
};
Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(publicDir, file)));
});

// 404 y manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
