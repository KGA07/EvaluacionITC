'use strict';
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const config = require('../config');
const { esAprobado, aprobacionMinima, toCSV } = require('../utils/helpers');
const { registrarLog } = require('../utils/audit');

const REFRESH_TOKEN_KEY = 'refreshTokens';

// ── Lista de alumnos ───────────────────────────────────────────────────────
async function listarAlumnos(req, res) {
  const data = await db.loadData();
  const alumnos = data.users
    .filter((u) => u.tipo === 'alumno')
    .map((u) => ({
      id: u.id,
      nombre: u.nombre,
      nombre_completo: u.nombre_completo,
      tienePreguntaSecreta: !!u.preguntaSecreta
    }))
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
  res.json({ alumnos });
}

// ── Crear alumno ───────────────────────────────────────────────────────────
async function crearAlumno(req, res) {
  const { nombre, password, nombre_completo } = req.body;
  const data = await db.loadData();
  if (data.users.find((u) => u.nombre === nombre)) {
    return res.status(400).json({ error: 'Ya existe un usuario con ese nombre.' });
  }

  const newId = data.nextUserId || db.getNextId(data.users);
  data.users.push({
    id: newId,
    nombre,
    password: bcrypt.hashSync(password, 10),
    tipo: 'alumno',
    nombre_completo: nombre_completo || nombre
  });
  data.nextUserId = newId + 1;
  registrarLog(data, 'crear_alumno', { alumnoId: newId, nombre }, req.user);
  await db.saveData();
  res.json({ id: newId, nombre, nombre_completo: nombre_completo || nombre });
}

// ── Eliminar alumno ────────────────────────────────────────────────────────
async function eliminarAlumno(req, res) {
  const data = await db.loadData();
  const userId = parseInt(req.params.id, 10);
  const idx = data.users.findIndex((u) => u.id === userId && u.tipo === 'alumno');
  if (idx === -1) return res.status(404).json({ error: 'Alumno no encontrado.' });

  const alumno = data.users[idx];
  data.users.splice(idx, 1);
  data.intentos = data.intentos.filter((i) => i.userId !== userId);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== userId);
  registrarLog(data, 'eliminar_alumno', { alumnoId: userId, nombre: alumno.nombre }, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Cambiar contrasena de alumno ───────────────────────────────────────────
async function cambiarPassword(req, res) {
  const { password } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.id === parseInt(req.params.id, 10) && u.tipo === 'alumno');
  if (!user) return res.status(404).json({ error: 'Alumno no encontrado.' });

  user.password = bcrypt.hashSync(password, 10);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  registrarLog(data, 'cambio_password_alumno', { alumnoId: user.id }, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Resetear intentos de un alumno en una evaluacion ───────────────────────
async function resetearIntentos(req, res) {
  const data = await db.loadData();
  const userId = parseInt(req.params.alumnoId, 10);
  const evalId = parseInt(req.params.evaluacionId, 10);

  const alumno = data.users.find((u) => u.id === userId && u.tipo === 'alumno');
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });
  const ev = data.evaluaciones.find((e) => e.id === evalId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  data.intentos = data.intentos.filter((i) => !(i.userId === userId && i.evaluacionId === evalId));
  registrarLog(data, 'reset_intentos', { alumnoId: userId, evaluacionId: evalId }, req.user);
  await db.saveData();
  res.json({ ok: true, mensaje: `Intentos reiniciados para ${alumno.nombre_completo} en ${ev.capacitacion}.` });
}

// ── CRUD de evaluaciones ────────────────────────────────────────────────────
async function listarEvaluaciones(req, res) {
  const data = await db.loadData();
  const evaluaciones = data.evaluaciones.map((ev) => ({
    id: ev.id,
    capacitacion: ev.capacitacion,
    titulo: ev.titulo,
    totalPreguntas: ev.preguntas.length,
    intentosMax: ev.intentosMax || config.defaultIntentosMax,
    porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
    duracionMinutos: ev.duracionMinutos || config.defaultDuracionMinutos,
    activa: ev.activa !== false,
    totalIntentos: data.intentos.filter((i) => i.evaluacionId === ev.id).length,
    aprobados: data.users
      .filter((u) => u.tipo === 'alumno')
      .filter((a) =>
        data.intentos
          .filter((i) => i.userId === a.id && i.evaluacionId === ev.id)
          .some((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje))
      ).length
  }));
  res.json({ evaluaciones });
}

async function obtenerEvaluacion(req, res) {
  const data = await db.loadData();
  const ev = data.evaluaciones.find((e) => e.id === parseInt(req.params.id, 10));
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });
  res.json({
    id: ev.id,
    capacitacion: ev.capacitacion,
    titulo: ev.titulo,
    intentosMax: ev.intentosMax || config.defaultIntentosMax,
    porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
    duracionMinutos: ev.duracionMinutos || config.defaultDuracionMinutos,
    activa: ev.activa !== false,
    preguntas: ev.preguntas
  });
}

async function crearEvaluacion(req, res) {
  const { capacitacion, titulo, intentosMax, porcentaje, duracionMinutos, activa, preguntas } = req.body;
  const data = await db.loadData();

  const nueva = {
    id: db.getNextId(data.evaluaciones),
    capacitacion: capacitacion.trim(),
    titulo: (titulo && titulo.trim()) || `Evaluacion ${capacitacion.trim()}`,
    intentosMax: intentosMax || config.defaultIntentosMax,
    porcentaje: porcentaje || config.defaultPorcentajeAprobacion,
    duracionMinutos: duracionMinutos || config.defaultDuracionMinutos,
    activa: activa === undefined ? true : activa,
    preguntas: preguntas.map((p, i) => ({
      id: i + 1,
      pregunta: p.pregunta.trim(),
      opciones: p.opciones.map((o) => o.trim()),
      correcta: p.correcta,
      explicacion: (p.explicacion && p.explicacion.trim()) || ''
    }))
  };

  data.evaluaciones.push(nueva);
  registrarLog(data, 'crear_evaluacion', { evaluacionId: nueva.id, capacitacion: nueva.capacitacion }, req.user);
  await db.saveData();
  res.json({ id: nueva.id, capacitacion: nueva.capacitacion });
}

async function editarEvaluacion(req, res) {
  const data = await db.loadData();
  const evId = parseInt(req.params.id, 10);
  const ev = data.evaluaciones.find((e) => e.id === evId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  const { capacitacion, titulo, intentosMax, porcentaje, duracionMinutos, activa, preguntas } = req.body;
  if (capacitacion !== undefined) ev.capacitacion = capacitacion.trim();
  if (titulo !== undefined) ev.titulo = titulo.trim() || `Evaluacion ${ev.capacitacion}`;
  if (intentosMax !== undefined) ev.intentosMax = intentosMax;
  if (porcentaje !== undefined) ev.porcentaje = porcentaje;
  if (duracionMinutos !== undefined) ev.duracionMinutos = duracionMinutos;
  if (activa !== undefined) ev.activa = activa;
  if (preguntas !== undefined) {
    ev.preguntas = preguntas.map((p, i) => ({
      id: i + 1,
      pregunta: p.pregunta.trim(),
      opciones: p.opciones.map((o) => o.trim()),
      correcta: p.correcta,
      explicacion: (p.explicacion && p.explicacion.trim()) || ''
    }));
  }
  registrarLog(data, 'editar_evaluacion', { evaluacionId: evId }, req.user);
  await db.saveData();
  res.json({ ok: true, evaluacionId: evId });
}

async function eliminarEvaluacion(req, res) {
  const data = await db.loadData();
  const evId = parseInt(req.params.id, 10);
  const idx = data.evaluaciones.findIndex((e) => e.id === evId);
  if (idx === -1) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  data.evaluaciones.splice(idx, 1);
  data.intentos = data.intentos.filter((i) => i.evaluacionId !== evId);
  registrarLog(data, 'eliminar_evaluacion', { evaluacionId: evId }, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Estadisticas ───────────────────────────────────────────────────────────
async function estadisticas(req, res) {
  const data = await db.loadData();
  const alumnos = data.users.filter((u) => u.tipo === 'alumno');

  const stats = data.evaluaciones.map((ev) => {
    const intentosEv = data.intentos.filter((i) => i.evaluacionId === ev.id);
    const alumnosConIntento = [...new Set(intentosEv.map((i) => i.userId))];
    const aprobados = alumnos.filter((a) =>
      intentosEv.filter((i) => i.userId === a.id).some((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje))
    ).length;
    const minAprobar = aprobacionMinima(ev.preguntas.length, ev.porcentaje);

    return {
      evaluacionId: ev.id,
      capacitacion: ev.capacitacion,
      titulo: ev.titulo,
      totalAlumnos: alumnos.length,
      alumnosRindieron: alumnosConIntento.length,
      aprobados,
      desaprobados: alumnosConIntento.length - aprobados,
      pendientes: alumnos.length - alumnosConIntento.length,
      intentosMax: ev.intentosMax || config.defaultIntentosMax,
      minAprobar,
      totalPreguntas: ev.preguntas.length,
      porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
      promedio:
        intentosEv.length > 0
          ? Math.round((intentosEv.reduce((s, i) => s + i.puntaje, 0) / intentosEv.length) * 10) / 10
          : 0
    };
  });

  const alumnosDetalle = alumnos.map((a) => {
    const intentosA = data.intentos.filter((i) => i.userId === a.id);
    return {
      id: a.id,
      nombre: a.nombre,
      nombre_completo: a.nombre_completo,
      evaluaciones: data.evaluaciones.map((ev) => {
        const intentos = intentosA.filter((i) => i.evaluacionId === ev.id);
        const mejor = intentos.length > 0 ? Math.max(...intentos.map((i) => i.puntaje)) : null;
        const aprobado = esAprobado(mejor, ev.preguntas.length, ev.porcentaje);
        const intentosMax = ev.intentosMax || config.defaultIntentosMax;
        return {
          evaluacionId: ev.id,
          capacitacion: ev.capacitacion,
          intentos: intentos.length,
          intentosMax,
          mejorPuntaje: mejor,
          aprobado,
          porcentaje: ev.porcentaje || config.defaultPorcentajeAprobacion,
          historia: intentos
            .sort((x, y) => new Date(x.fecha) - new Date(y.fecha))
            .map((i) => ({
              id: i.id,
              puntaje: i.puntaje,
              total: ev.preguntas.length,
              aprobado: esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje),
              fecha: i.fecha
            })),
          estado: aprobado
            ? 'Aprobado'
            : intentos.length >= intentosMax
              ? 'Desaprobado'
              : intentos.length > 0
                ? 'En curso'
                : 'Pendiente'
        };
      })
    };
  });

  res.json({ stats, alumnosDetalle, totalAlumnos: alumnos.length });
}

// ── Detalle de un intento (feedback del profesor) ──────────────────────────
async function detalleIntento(req, res) {
  const data = await db.loadData();
  const intento = data.intentos.find((i) => i.id === parseInt(req.params.id, 10));
  if (!intento) return res.status(404).json({ error: 'Intento no encontrado.' });
  const ev = data.evaluaciones.find((e) => e.id === intento.evaluacionId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });
  const alumno = data.users.find((u) => u.id === intento.userId);

  const detalle = ev.preguntas.map((p, qIdx) => {
    const userResp =
      intento.respuestas && typeof intento.respuestas[qIdx] === 'number' ? intento.respuestas[qIdx] : null;
    const esCorrecta = userResp !== null && userResp === p.correcta;
    return {
      preguntaId: p.id,
      pregunta: p.pregunta,
      opciones: p.opciones,
      respondida: userResp,
      correcta: p.correcta,
      esCorrecta,
      explicacion: p.explicacion || ''
    };
  });

  res.json({
    intento: {
      id: intento.id,
      alumno: alumno ? alumno.nombre_completo : 'Desconocido',
      capacitacion: ev.capacitacion,
      puntaje: intento.puntaje,
      totalPreguntas: ev.preguntas.length,
      aprobado: esAprobado(intento.puntaje, ev.preguntas.length, ev.porcentaje),
      fecha: intento.fecha,
      detalle
    }
  });
}

// ── Exportar CSV de resultados por evaluacion ──────────────────────────────
async function exportarCSV(req, res) {
  const data = await db.loadData();
  const evalId = parseInt(req.params.id, 10);
  const ev = data.evaluaciones.find((e) => e.id === evalId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  const alumnos = data.users.filter((u) => u.tipo === 'alumno');

  const headers = ['Alumno', 'Usuario', 'Intentos', 'Mejor Puntaje', 'Total Preguntas', 'Estado'];
  const rows = alumnos.map((a) => {
    const intentos = data.intentos.filter((i) => i.userId === a.id && i.evaluacionId === ev.id);
    const mejor = intentos.length > 0 ? Math.max(...intentos.map((i) => i.puntaje)) : 0;
    const aprobado = esAprobado(mejor, ev.preguntas.length, ev.porcentaje);
    const intentosMax = ev.intentosMax || config.defaultIntentosMax;
    return [
      a.nombre_completo,
      a.nombre,
      intentos.length,
      intentos.length > 0 ? mejor : '-',
      ev.preguntas.length,
      aprobado ? 'Aprobado' : intentos.length >= intentosMax ? 'Desaprobado' : 'Pendiente'
    ];
  });

  const csv = toCSV(headers, rows);
  const fileName = `resultados_${ev.capacitacion.replace(/[^a-z0-9]+/gi, '_')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(`\uFEFF${csv}`);
}

module.exports = {
  listarAlumnos,
  crearAlumno,
  eliminarAlumno,
  cambiarPassword,
  resetearIntentos,
  listarEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion,
  editarEvaluacion,
  eliminarEvaluacion,
  estadisticas,
  detalleIntento,
  exportarCSV
};
