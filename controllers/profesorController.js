'use strict';
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const { esAprobado, aprobacionMinima, toCSV } = require('../utils/helpers');

// ── Lista de alumnos ───────────────────────────────────────────────────────
function listarAlumnos(req, res) {
  const data = db.readDB();
  const alumnos = data.users
    .filter((u) => u.tipo === 'alumno')
    .map((u) => ({ id: u.id, nombre: u.nombre, nombre_completo: u.nombre_completo }))
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
  res.json({ alumnos });
}

// ── Crear alumno ───────────────────────────────────────────────────────────
function crearAlumno(req, res) {
  const { nombre, password, nombre_completo } = req.body;
  const data = db.readDB();
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
  db.writeDB();
  res.json({ id: newId, nombre, nombre_completo: nombre_completo || nombre });
}

// ── Eliminar alumno ────────────────────────────────────────────────────────
function eliminarAlumno(req, res) {
  const data = db.readDB();
  const userId = parseInt(req.params.id, 10);
  const idx = data.users.findIndex((u) => u.id === userId && u.tipo === 'alumno');
  if (idx === -1) return res.status(404).json({ error: 'Alumno no encontrado.' });

  data.users.splice(idx, 1);
  data.intentos = data.intentos.filter((i) => i.userId !== userId);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== userId);
  db.writeDB();
  res.json({ ok: true });
}

// ── Cambiar contrasena de alumno ───────────────────────────────────────────
function cambiarPassword(req, res) {
  const { password } = req.body;
  const data = db.readDB();
  const user = data.users.find((u) => u.id === parseInt(req.params.id, 10) && u.tipo === 'alumno');
  if (!user) return res.status(404).json({ error: 'Alumno no encontrado.' });

  user.password = bcrypt.hashSync(password, 10);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  db.writeDB();
  res.json({ ok: true });
}

// ── Resetear intentos de un alumno en una evaluacion ───────────────────────
function resetearIntentos(req, res) {
  const data = db.readDB();
  const userId = parseInt(req.params.alumnoId, 10);
  const evalId = parseInt(req.params.evaluacionId, 10);

  const alumno = data.users.find((u) => u.id === userId && u.tipo === 'alumno');
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado.' });
  const ev = data.evaluaciones.find((e) => e.id === evalId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  data.intentos = data.intentos.filter((i) => !(i.userId === userId && i.evaluacionId === evalId));
  db.writeDB();
  res.json({ ok: true, mensaje: `Intentos reiniciados para ${alumno.nombre_completo} en ${ev.capacitacion}.` });
}

// ── Estadisticas ───────────────────────────────────────────────────────────
function estadisticas(req, res) {
  const data = db.readDB();
  const alumnos = data.users.filter((u) => u.tipo === 'alumno');

  const stats = data.evaluaciones.map((ev) => {
    const intentosEv = data.intentos.filter((i) => i.evaluacionId === ev.id);
    const alumnosConIntento = [...new Set(intentosEv.map((i) => i.userId))];
    const aprobados = alumnos.filter((a) =>
      intentosEv.filter((i) => i.userId === a.id).some((i) => esAprobado(i.puntaje, ev.preguntas.length))
    ).length;

    return {
      capacitacion: ev.capacitacion,
      totalAlumnos: alumnos.length,
      alumnosRindieron: alumnosConIntento.length,
      aprobados,
      desaprobados: alumnosConIntento.length - aprobados,
      pendientes: alumnos.length - alumnosConIntento.length,
      promedio: intentosEv.length > 0 ? Math.round((intentosEv.reduce((s, i) => s + i.puntaje, 0) / intentosEv.length) * 10) / 10 : 0
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
        const aprobado = esAprobado(mejor, ev.preguntas.length);
        return {
          evaluacionId: ev.id,
          capacitacion: ev.capacitacion,
          intentos: intentos.length,
          mejorPuntaje: mejor,
          aprobado,
          estado: aprobado ? 'Aprobado' : intentos.length >= 3 ? 'Desaprobado' : intentos.length > 0 ? 'En curso' : 'Pendiente'
        };
      })
    };
  });

  res.json({ stats, alumnosDetalle, totalAlumnos: alumnos.length });
}

// ── Exportar CSV de resultados por evaluacion ──────────────────────────────
function exportarCSV(req, res) {
  const data = db.readDB();
  const evalId = parseInt(req.params.id, 10);
  const ev = data.evaluaciones.find((e) => e.id === evalId);
  if (!ev) return res.status(404).json({ error: 'Evaluacion no encontrada.' });

  const alumnos = data.users.filter((u) => u.tipo === 'alumno');
  const minAprobar = aprobacionMinima(ev.preguntas.length);

  const headers = ['Alumno', 'Usuario', 'Intentos', 'Mejor Puntaje', 'Total Preguntas', 'Estado'];
  const rows = alumnos.map((a) => {
    const intentos = data.intentos.filter((i) => i.userId === a.id && i.evaluacionId === ev.id);
    const mejor = intentos.length > 0 ? Math.max(...intentos.map((i) => i.puntaje)) : 0;
    const aprobado = esAprobado(mejor, ev.preguntas.length);
    return [
      a.nombre_completo,
      a.nombre,
      intentos.length,
      intentos.length > 0 ? mejor : '-',
      ev.preguntas.length,
      aprobado ? 'Aprobado' : intentos.length >= 3 ? 'Desaprobado' : 'Pendiente'
    ];
  });

  const csv = toCSV(headers, rows);
  const fileName = `resultados_${ev.capacitacion.replace(/[^a-z0-9]+/gi, '_')}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(`\uFEFF${csv}`);
}

module.exports = { listarAlumnos, crearAlumno, eliminarAlumno, cambiarPassword, resetearIntentos, estadisticas, exportarCSV };
