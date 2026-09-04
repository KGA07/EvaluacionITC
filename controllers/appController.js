'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const config = require('../config');
const jwt = require('jsonwebtoken');
const { signAccess, signRefresh, verifyRefresh } = require('../middleware/auth');
const { esAprobado, shuffle, esPermutacionValida } = require('../utils/helpers');
const { registrarLog } = require('../utils/audit');

const REFRESH_TOKEN_KEY = 'refreshTokens';
const uuidv4 = crypto.randomUUID;

// Un alumno solo puede rendir las evaluaciones que su profesor le asigno.
// Si no tiene lista asignada (null), puede rendir todas.
function estaPermitida(alumno, evaluacionId) {
  return !Array.isArray(alumno.evaluacionesPermitidas) || alumno.evaluacionesPermitidas.includes(evaluacionId);
}

// ── Login ──────────────────────────────────────────────────────────────────
async function login(req, res) {
  const { nombre, password, tipo } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.nombre === nombre && u.tipo === tipo);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const accessToken = signAccess(user);
  const tokenId = uuidv4();
  const refreshToken = signRefresh(user, tokenId);

  data[REFRESH_TOKEN_KEY] = data[REFRESH_TOKEN_KEY] || [];
  data[REFRESH_TOKEN_KEY] = data[REFRESH_TOKEN_KEY].filter((t) => t.userId !== user.id).slice(-4);
  data[REFRESH_TOKEN_KEY].push({ userId: user.id, tokenId });

  registrarLog(data, 'login', {}, user);
  await db.saveData();

  res.json({
    token: accessToken,
    refreshToken,
    tipo: user.tipo,
    nombre: user.nombre,
    nombre_completo: user.nombre_completo
  });
}

// ── Refresh token ──────────────────────────────────────────────────────────
async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido.' });

  const payload = verifyRefresh(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Refresh token invalido.' });

  const data = await db.loadData();
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
  await db.saveData();

  res.json({
    token: signAccess(user),
    refreshToken: signRefresh(user, newTokenId)
  });
}

// ── Logout ─────────────────────────────────────────────────────────────────
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const payload = verifyRefresh(refreshToken);
    if (payload) {
      const data = await db.loadData();
      data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.tokenId !== payload.tokenId);
      await db.saveData();
    }
  }
  res.json({ ok: true });
}

// ── Alumno: estado ─────────────────────────────────────────────────────────
async function estado(req, res) {
  const data = await db.loadData();
  const alumno = data.users.find((u) => u.id === req.user.id) || req.user;
  const intentos = data.intentos.filter((i) => i.userId === req.user.id);

  const evaluaciones = data.evaluaciones
    .filter((ev) => ev.activa !== false && estaPermitida(alumno, ev.id))
    .map((ev) => {
      const intentosEv = intentos.filter((i) => i.evaluacionId === ev.id);
      const mejorPuntaje = intentosEv.length > 0 ? Math.max(...intentosEv.map((i) => i.puntaje)) : null;
      const aprobado = esAprobado(mejorPuntaje, ev.preguntas.length, ev.porcentaje);
      const intentosMax = ev.intentosMax || config.defaultIntentosMax;
      return {
        evaluacionId: ev.id,
        capacitacion: ev.capacitacion,
        titulo: ev.titulo,
        totalPreguntas: ev.preguntas.length,
        intentosUsados: intentosEv.length,
        intentosMax,
        mejorPuntaje,
        aprobado,
        porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
        duracionMinutos: ev.duracionMinutos || config.defaultDuracionMinutos,
        certificadoDisponible: aprobado
      };
    });

  res.json({ evaluaciones });
}

// ── Alumno: tomar evaluacion ───────────────────────────────────────────────
async function tomarEvaluacion(req, res) {
  const data = await db.loadData();
  const alumno = data.users.find((u) => u.id === req.user.id) || req.user;
  const ev = data.evaluaciones.find((e) => e.id === parseInt(req.params.id, 10));
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada' });
  if (ev.activa === false) return res.status(400).json({ error: 'Evaluacion no disponible.' });
  if (!estaPermitida(alumno, ev.id)) {
    return res.status(403).json({ error: 'Tu instructor todavia no te asigno esta evaluacion.' });
  }

  const intentosEv = data.intentos.filter((i) => i.userId === req.user.id && i.evaluacionId === ev.id);
  const intentosMax = ev.intentosMax || config.defaultIntentosMax;
  const yaAprobada = intentosEv.some((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje));
  if (yaAprobada) return res.status(400).json({ error: 'Ya aprobaste esta evaluacion.' });
  if (intentosEv.length >= intentosMax) {
    return res.status(400).json({ error: `Agotaste los ${intentosMax} intentos disponibles.` });
  }

  // Mezcla las opciones solo en preguntas de opcion multiple; las de verdadero/falso
  // y desarrollo se muestran fijas. La respuesta libre no expone informacion extra.
  const seed = Math.floor(Math.random() * 2147483647);
  const preguntas = ev.preguntas.map((p) => {
    const tipo = p.tipo || 'opcion';
    if (tipo === 'desarrollo') {
      return { id: p.id, tipo, pregunta: p.pregunta };
    }
    if (tipo === 'vf') {
      return { id: p.id, tipo, pregunta: p.pregunta, opciones: ['Verdadero', 'Falso'] };
    }
    const indices = p.opciones.map((_, i) => i);
    const mezclado = shuffle(indices, seed + p.id);
    return {
      id: p.id,
      tipo,
      pregunta: p.pregunta,
      opciones: mezclado.map((i) => p.opciones[i])
    };
  });
  // Orden de mezcla por pregunta (identidad para vf; sin mezcla para desarrollo)
  const orden = ev.preguntas.map((p) => {
    const tipo = p.tipo || 'opcion';
    if (tipo === 'desarrollo') return [0];
    if (tipo === 'vf') return [0, 1];
    const indices = p.opciones.map((_, i) => i);
    return shuffle(indices, seed + p.id);
  });

  res.json({
    evaluacionId: ev.id,
    capacitacion: ev.capacitacion,
    titulo: ev.titulo,
    totalPreguntas: preguntas.length,
    intentoActual: intentosEv.length + 1,
    intentosMax,
    duracionMinutos: ev.duracionMinutos || config.defaultDuracionMinutos,
    porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
    preguntas,
    orden
  });
}

// ── Alumno: enviar respuestas (resultado) ──────────────────────────────────
async function resultado(req, res) {
  const { evaluacionId, respuestas, orden } = req.body;
  const data = await db.loadData();
  const ev = data.evaluaciones.find((e) => e.id === evaluacionId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada' });

  const intentosEv = data.intentos.filter((i) => i.userId === req.user.id && i.evaluacionId === evaluacionId);
  const intentosMax = ev.intentosMax || config.defaultIntentosMax;
  if (intentosEv.length >= intentosMax) return res.status(400).json({ error: `Agotaste los ${intentosMax} intentos.` });
  if (intentosEv.some((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje))) {
    return res.status(400).json({ error: 'Ya aprobaste esta evaluacion.' });
  }
  if (!Array.isArray(respuestas) || respuestas.length !== ev.preguntas.length) {
    return res.status(400).json({ error: 'Cantidad de respuestas invalida.' });
  }

  // Gradúa por tipo:
  //  - opcion/vf: mapeando el indice mostrado al original usando `orden`
  //  - desarrollo: se toma como correcta si el alumno respondio con su texto
  let correctas = 0;
  const detalle = ev.preguntas.map((p, qIdx) => {
    const tipo = p.tipo || 'opcion';
    const userDisp = respuestas[qIdx];

    if (tipo === 'desarrollo') {
      const texto = typeof userDisp === 'string' ? userDisp.trim() : '';
      const esCorrecta = texto.length > 0;
      if (esCorrecta) correctas++;
      return {
        preguntaId: p.id,
        pregunta: p.pregunta,
        tipo,
        respuestaTexto: texto,
        esCorrecta,
        explicacion: p.explicacion || ''
      };
    }

    const ordenQ = Array.isArray(orden) && Array.isArray(orden[qIdx]) ? orden[qIdx] : p.opciones.map((_, i) => i);
    const userOrig = esPermutacionValida(ordenQ, p.opciones.length) ? ordenQ[userDisp] : userDisp;
    const esCorrecta = userOrig === p.correcta;
    if (esCorrecta && userDisp != null) correctas++;
    return {
      preguntaId: p.id,
      pregunta: p.pregunta,
      tipo,
      opciones: p.opciones,
      respondida: userOrig,
      correcta: p.correcta,
      esCorrecta,
      explicacion: p.explicacion || ''
    };
  });

  const puntaje = correctas;
  const intento = {
    id: db.getNextId(data.intentos),
    userId: req.user.id,
    evaluacionId,
    puntaje,
    respuestas: detalle.map((d) => (d.tipo === 'desarrollo' ? d.respuestaTexto : d.respondida)),
    orden,
    fecha: new Date().toISOString()
  };
  data.intentos.push(intento);

  registrarLog(
    data,
    'envio_evaluacion',
    {
      evaluacionId,
      capacitacion: ev.capacitacion,
      puntaje,
      total: ev.preguntas.length,
      aprobado: esAprobado(puntaje, ev.preguntas.length, ev.porcentaje)
    },
    req.user
  );
  await db.saveData();

  res.json({
    evaluacionId,
    intentoId: intento.id,
    puntaje,
    totalPreguntas: ev.preguntas.length,
    aprobado: esAprobado(puntaje, ev.preguntas.length, ev.porcentaje),
    porcentajeAprobacion: ev.porcentaje || config.defaultPorcentajeAprobacion,
    intentoActual: intentosEv.length + 1,
    intentosMax,
    detalle,
    certificadoDisponible: esAprobado(puntaje, ev.preguntas.length, ev.porcentaje)
  });
}

// ── Alumno: cambiar propia contrasena ──────────────────────────────────────
async function cambiarPasswordPropia(req, res) {
  const { passwordActual, passwordNueva } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario inexistente.' });
  if (!bcrypt.compareSync(passwordActual, user.password)) {
    return res.status(401).json({ error: 'La contrasena actual es incorrecta.' });
  }
  user.password = bcrypt.hashSync(passwordNueva, 10);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  registrarLog(data, 'cambio_password', {}, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Alumno: configurar pregunta secreta ────────────────────────────────────
async function configurarPreguntaSecreta(req, res) {
  const { pregunta, respuesta, passwordActual } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario inexistente.' });
  if (!bcrypt.compareSync(passwordActual, user.password)) {
    return res.status(401).json({ error: 'La contrasena actual es incorrecta.' });
  }
  user.preguntaSecreta = pregunta;
  user.respuestaSecreta = bcrypt.hashSync(respuesta, 10);
  registrarLog(data, 'configurar_pregunta_secreta', {}, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Recuperar contrasena (pregunta secreta) ────────────────────────────────
async function recuperarPregunta(req, res) {
  const { nombre, tipo } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.nombre === nombre && u.tipo === tipo);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!user.preguntaSecreta) {
    return res.status(400).json({ error: 'Este usuario no configuro una pregunta secreta. Contacta a tu instructor.' });
  }
  res.json({ pregunta: user.preguntaSecreta });
}

async function recuperarVerificar(req, res) {
  const { nombre, tipo, respuesta } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.nombre === nombre && u.tipo === tipo);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!user.respuestaSecreta || !bcrypt.compareSync(String(respuesta), user.respuestaSecreta)) {
    return res.status(401).json({ error: 'La respuesta es incorrecta.' });
  }
  const resetToken = jwt.sign({ id: user.id, tipo: user.tipo, proposito: 'reset' }, config.jwtSecret, {
    expiresIn: '15m'
  });
  registrarLog(data, 'recuperar_contrasena', { nombre: user.nombre }, user);
  await db.saveData();
  res.json({ resetToken });
}

async function recuperarContrasena(req, res) {
  const { resetToken, passwordNueva } = req.body;
  let payload;
  try {
    payload = jwt.verify(resetToken, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'El enlace de recuperacion vencio o es invalido.' });
  }
  if (payload.proposito !== 'reset') return res.status(401).json({ error: 'Token invalido.' });

  const data = await db.loadData();
  const user = data.users.find((u) => u.id === payload.id);
  if (!user) return res.status(404).json({ error: 'Usuario inexistente.' });
  user.password = bcrypt.hashSync(passwordNueva, 10);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  registrarLog(data, 'recuperar_contrasena_ok', { nombre: user.nombre }, user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Alumno: historial propio ───────────────────────────────────────────────
async function miHistorial(req, res) {
  const data = await db.loadData();
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
        aprobado: ev ? esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje) : false,
        fecha: i.fecha
      };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  res.json({ intentos });
}

// ── Certificado de aprobacion (constancia) ─────────────────────────────────
async function certificado(req, res) {
  const data = await db.loadData();
  const evId = parseInt(req.params.id, 10);
  const ev = data.evaluaciones.find((e) => e.id === evId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  const intentos = data.intentos
    .filter((i) => i.userId === req.user.id && i.evaluacionId === evId)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const aprobadoIntento = intentos.find((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje));
  if (!aprobadoIntento) {
    return res.status(400).json({ error: 'Debes aprobar la evaluacion para obtener el certificado.' });
  }

  res.json({
    certificado: {
      codigo: `ITC-${String(evId).padStart(3, '0')}-${String(aprobadoIntento.id).padStart(4, '0')}`,
      alumno: req.user.nombre_completo || req.user.nombre,
      capacitacion: ev.capacitacion,
      titulo: ev.titulo,
      puntaje: aprobadoIntento.puntaje,
      totalPreguntas: ev.preguntas.length,
      porcentajeObtenido: Math.round((aprobadoIntento.puntaje / ev.preguntas.length) * 100),
      porcentajeMinimo: ev.porcentaje || config.defaultPorcentajeAprobacion,
      fecha: aprobadoIntento.fecha
    }
  });
}

module.exports = {
  login,
  refresh,
  logout,
  estado,
  tomarEvaluacion,
  resultado,
  cambiarPasswordPropia,
  configurarPreguntaSecreta,
  recuperarPregunta,
  recuperarVerificar,
  recuperarContrasena,
  miHistorial,
  certificado
};
