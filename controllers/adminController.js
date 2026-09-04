'use strict';
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const { esAprobado } = require('../utils/helpers');
const { registrarLog } = require('../utils/audit');

const REFRESH_TOKEN_KEY = 'refreshTokens';

// ── Profesores ─────────────────────────────────────────────────────────────
async function listarProfesores(req, res) {
  const data = await db.loadData();
  const profesores = data.users
    .filter((u) => u.tipo === 'profesor')
    .map((u) => ({ id: u.id, nombre: u.nombre, nombre_completo: u.nombre_completo }))
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
  res.json({ profesores });
}

async function crearProfesor(req, res) {
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
    tipo: 'profesor',
    nombre_completo: nombre_completo || nombre
  });
  data.nextUserId = newId + 1;
  registrarLog(data, 'crear_profesor', { profesorId: newId, nombre }, req.user);
  await db.saveData();
  res.json({ id: newId, nombre, nombre_completo: nombre_completo || nombre });
}

async function eliminarProfesor(req, res) {
  const data = await db.loadData();
  const userId = parseInt(req.params.id, 10);
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'No podes eliminar tu propio usuario.' });
  }
  const idx = data.users.findIndex((u) => u.id === userId && u.tipo === 'profesor');
  if (idx === -1) return res.status(404).json({ error: 'Profesor no encontrado.' });

  const prof = data.users[idx];
  data.users.splice(idx, 1);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== userId);
  registrarLog(data, 'eliminar_profesor', { profesorId: userId, nombre: prof.nombre }, req.user);
  await db.saveData();
  res.json({ ok: true });
}

async function cambiarPasswordProfesor(req, res) {
  const { password } = req.body;
  const data = await db.loadData();
  const user = data.users.find((u) => u.id === parseInt(req.params.id, 10) && u.tipo === 'profesor');
  if (!user) return res.status(404).json({ error: 'Profesor no encontrado.' });

  user.password = bcrypt.hashSync(password, 10);
  data[REFRESH_TOKEN_KEY] = (data[REFRESH_TOKEN_KEY] || []).filter((t) => t.userId !== user.id);
  registrarLog(data, 'cambio_password_profesor', { profesorId: user.id }, req.user);
  await db.saveData();
  res.json({ ok: true });
}

// ── Logs de auditoria ───────────────────────────────────────────────────────
async function verLogs(req, res) {
  const data = await db.loadData();
  const { accion, limite = 100 } = req.query;
  let logs = data.logs || [];
  if (accion) logs = logs.filter((l) => l.accion === accion);
  logs = logs.slice(-Math.min(parseInt(limite, 10) || 100, 500)).reverse();
  res.json({ logs });
}

// ── Estadisticas globales ───────────────────────────────────────────────────
async function estadisticasGlobales(req, res) {
  const data = await db.loadData();
  const alumnos = data.users.filter((u) => u.tipo === 'alumno');
  const profesores = data.users.filter((u) => u.tipo === 'profesor');

  const aprobaciones = data.evaluaciones
    .filter((ev) => ev.activa !== false)
    .reduce((sum, ev) => {
      const aprobadosEv = alumnos.filter((a) =>
        data.intentos
          .filter((i) => i.userId === a.id && i.evaluacionId === ev.id)
          .some((i) => esAprobado(i.puntaje, ev.preguntas.length, ev.porcentaje))
      ).length;
      return sum + aprobadosEv;
    }, 0);

  res.json({
    alumnos: alumnos.length,
    profesores: profesores.length,
    evaluaciones: data.evaluaciones.length,
    intentosTotales: data.intentos.length,
    aprobaciones,
    registrosAuditoria: (data.logs || []).length
  });
}

module.exports = {
  listarProfesores,
  crearProfesor,
  eliminarProfesor,
  cambiarPasswordProfesor,
  verLogs,
  estadisticasGlobales
};
