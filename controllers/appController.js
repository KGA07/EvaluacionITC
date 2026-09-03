'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const config = require('../config');
const jwt = require('jsonwebtoken');
const { auth: authMw, signAccess, signRefresh, verifyRefresh } = require('../middleware/auth');
const { aprobacionMinima, esAprobado } = require('../utils/helpers');

const REFRESH_TOKEN_KEY = 'refreshTokens';
const uuidv4 = crypto.randomUUID;

// ── Login ──────────────────────────────────────────────────────────────────
function login(req, res) {
  const { nombre, password, tipo } = req.body;
  const data = db.readDB();
  const user = data.users.find((u) => u.nombre === nombre && u.tipo === tipo);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const accessToken = signAccess(user);
  const tokenId = uuidv4();
  const refreshToken = signRefresh(user, tokenId);

  data[REFRESH_TOKEN_KEY] = data[REFRESH_TOKEN_KEY] || [];
  // Limitar cantidad de refresh activos por usuario (rotación básica)
  data[REFRESH_TOKEN_KEY] = data[REFRESH_TOKEN_KEY].filter((t) => t.userId !== user.id).slice(-4);
  data[REFRESH_TOKEN_KEY].push({ userId: user.id, tokenId });

  db.writeDB();

  res.json({
    token: accessToken,
    refreshToken,
    tipo: user.tipo,
    nombre: user.nombre,
    nombre_completo: user.nombre_completo
  });
}

// ── Refresh token ──────────────────────────────────────────────────────────
function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido.' });

  const payload = verifyRefresh(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Refresh token invalido.' });

  const data = db.readDB();
  const rts = data[REFRESH_TOKEN_KEY] || [];
  const stored = rts.find((t) => t.tokenId === payload.tokenId);
  if (!stored || stored.userId !== payload.id) {
    return res.status(401).json({ error: 'Refresh token invalido.' });
  }

  const user = data.users.find((u) => u.id === payload.id);
  if (!user) return res.status(401).json({ error: 'Usuario inexistente.' });

  // Rotación: invalidar el refresh usado y emitir uno nuevo
  data[REFRESH_TOKEN_KEY] = rts.filter((t) => t.tokenId !== payload.tokenId);
  const newTokenId = uuidv4();
  data[REFRESH_TOKEN_KEY].push({ userId: user.id, tokenId: newTokenId });
  db.writeDB();

  res.json({
    token: signAccess(user),
    refreshToken: signRefresh(user, newTokenId)
  });
}

// ── Logout ─────────────────────────────────────────────────────────────────
function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const payload = verifyRefresh(refreshToken);
    if (payload) {
      const data = db.readDB();
      data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.tokenId !== payload.tokenId);
      db.writeDB();
    }
  }
  res.json({ ok: true });
}

// ── Alumno: estado ─────────────────────────────────────────────────────────
function estado(req, res) {
  const data = db.readDB();
  const intentos = data.intentos.filter((i) => i.userId === req.user.id);

  const evaluaciones = data.evaluaciones.map((ev) => {
    const intentosEv = intentos.filter((i) => i.evaluacionId === ev.id);
    const mejorPuntaje = intentosEv.length > 0 ? Math.max(...intentosEv.map((i) => i.puntaje)) : null;
    const aprobado = esAprobado(mejorPuntaje, ev.preguntas.length);
    return {
      evaluacionId: ev.id,
      capacitacion: ev.capacitacion,
      titulo: ev.titulo,
      totalPreguntas: ev.preguntas.length,
      intentosUsados: intentosEv.length,
      mejorPuntaje,
      aprobado
    };
  });

  res.json({ evaluaciones });
}

// ── Alumno: tomar evaluacion ───────────────────────────────────────────────
function tomarEvaluacion(req, res) {
  const data = db.readDB();
  const ev = data.evaluaciones.find((e) => e.id === parseInt(req.params.id, 10));
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada' });

  const intentosEv = data.intentos.filter((i) => i.userId === req.user.id && i.evaluacionId === ev.id);
  const yaAprobada = intentosEv.some((i) => esAprobado(i.puntaje, ev.preguntas.length));
  if (yaAprobada) return res.status(400).json({ error: 'Ya aprobaste esta evaluacion.' });
  if (intentosEv.length >= 3) return res.status(400).json({ error: 'Agotaste los 3 intentos disponibles.' });

  const preguntas = ev.preguntas.map((p) => ({ id: p.id, pregunta: p.pregunta, opciones: p.opciones }));

  res.json({
    evaluacionId: ev.id,
    capacitacion: ev.capacitacion,
    titulo: ev.titulo,
    totalPreguntas: preguntas.length,
    intentoActual: intentosEv.length + 1,
    preguntas
  });
}

// ── Alumno: enviar respuestas (resultado) ──────────────────────────────────
function resultado(req, res) {
  const { evaluacionId, respuestas } = req.body;
  const data = db.readDB();
  const ev = data.evaluaciones.find((e) => e.id === evaluacionId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada' });

  const intentosEv = data.intentos.filter((i) => i.userId === req.user.id && i.evaluacionId === evaluacionId);
  if (intentosEv.length >= 3) return res.status(400).json({ error: 'Agotaste los 3 intentos.' });
  if (intentosEv.some((i) => esAprobado(i.puntaje, ev.preguntas.length))) {
    return res.status(400).json({ error: 'Ya aprobaste esta evaluacion.' });
  }

  let correctas = 0;
  const detalle = ev.preguntas.map((p) => {
    const userResp = respuestas[p.id - 1];
    const esCorrecta = userResp === p.correcta;
    if (esCorrecta) correctas++;
    return {
      preguntaId: p.id,
      pregunta: p.pregunta,
      opciones: p.opciones,
      respondida: userResp,
      correcta: p.correcta,
      esCorrecta
    };
  });

  const puntaje = correctas;
  data.intentos.push({
    id: db.getNextId(data.intentos),
    userId: req.user.id,
    evaluacionId,
    puntaje,
    respuestas,
    fecha: new Date().toISOString()
  });
  db.writeDB();

  res.json({
    puntaje,
    totalPreguntas: ev.preguntas.length,
    aprobado: esAprobado(puntaje, ev.preguntas.length),
    intentoActual: intentosEv.length + 1,
    detalle
  });
}

// ── Alumno: cambiar propia contrasena ──────────────────────────────────────
function cambiarPasswordPropia(req, res) {
  const { passwordActual, passwordNueva } = req.body;
  const data = db.readDB();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario inexistente.' });
  if (!bcrypt.compareSync(passwordActual, user.password)) {
    return res.status(401).json({ error: 'La contrasena actual es incorrecta.' });
  }
  user.password = bcrypt.hashSync(passwordNueva, 10);
  // Invalidar refresh tokens del usuario al cambiar contrasena
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  db.writeDB();
  res.json({ ok: true });
}

// ── Alumno: historial propio ───────────────────────────────────────────────
function miHistorial(req, res) {
  const data = db.readDB();
  const intentos = data.intentos
    .filter((i) => i.userId === req.user.id)
    .map((i) => {
      const ev = data.evaluaciones.find((e) => e.id === i.evaluacionId);
      return {
        id: i.id,
        evaluacionId: i.evaluacionId,
        capacitacion: ev ? ev.capacitacion : 'Desconocida',
        puntaje: i.puntaje,
        totalPreguntas: ev ? ev.preguntas.length : 0,
        aprobado: ev ? esAprobado(i.puntaje, ev.preguntas.length) : false,
        fecha: i.fecha
      };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  res.json({ intentos });
}

module.exports = { login, refresh, logout, estado, tomarEvaluacion, resultado, cambiarPasswordPropia, miHistorial };
