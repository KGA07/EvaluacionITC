'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');

function verifyAccess(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function verifyRefresh(token) {
  try {
    return jwt.verify(token, config.refreshSecret);
  } catch {
    return null;
  }
}

function signAccess(user) {
  return jwt.sign(
    { id: user.id, nombre: user.nombre, tipo: user.tipo, nombre_completo: user.nombre_completo },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function signRefresh(user, tokenId) {
  return jwt.sign(
    { id: user.id, tokenId },
    config.refreshSecret,
    { expiresIn: config.refreshExpiresIn }
  );
}

// Middleware opcional que intenta autenticar pero no bloquea
function authOptional(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const payload = verifyAccess(token);
    if (payload) req.user = payload;
  }
  next();
}

// Middleware que exige token de acceso válido
function auth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  const payload = verifyAccess(token);
  if (!payload) return res.status(401).json({ error: 'Token invalido o expirado' });
  req.user = payload;
  next();
}

function profAuth(req, res, next) {
  if (!req.user || req.user.tipo !== 'profesor') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

function alumnoAuth(req, res, next) {
  if (!req.user || req.user.tipo !== 'alumno') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

module.exports = {
  auth,
  authOptional,
  profAuth,
  alumnoAuth,
  signAccess,
  signRefresh,
  verifyRefresh
};
