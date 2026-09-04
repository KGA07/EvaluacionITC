'use strict';
const express = require('express');
const { Router } = express;
const appCtrl = require('../controllers/appController');
const profCtrl = require('../controllers/profesorController');
const adminCtrl = require('../controllers/adminController');
const { auth, profAuth, alumnoAuth, adminAuth } = require('../middleware/auth');
const { validations, handleValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');
const { loginRateLimiter } = require('../middleware/security');

const router = Router();

// ── Autenticacion ──────────────────────────────────────────────────────────
router.post('/login', authLimiter, validations.login, handleValidation, loginRateLimiter, appCtrl.login);
router.post('/refresh', authLimiter, appCtrl.refresh);
router.post('/logout', appCtrl.logout);

// ── Recuperar contrasena (pregunta secreta) ─────────────────────────────────
router.post(
  '/recuperar/pregunta',
  authLimiter,
  validations.recuperarPaso1,
  handleValidation,
  appCtrl.recuperarPregunta
);
router.post(
  '/recuperar/verificar',
  authLimiter,
  validations.recuperarPaso2,
  handleValidation,
  appCtrl.recuperarVerificar
);
router.post(
  '/recuperar/contrasena',
  authLimiter,
  validations.recuperarPaso3,
  handleValidation,
  appCtrl.recuperarContrasena
);

// ── Alumno ─────────────────────────────────────────────────────────────────
router.get('/estado', auth, alumnoAuth, appCtrl.estado);
router.get('/evaluacion/:id', auth, alumnoAuth, appCtrl.tomarEvaluacion);
router.post('/resultado', auth, alumnoAuth, validations.resultado, handleValidation, appCtrl.resultado);
router.put(
  '/mis-datos/password',
  auth,
  alumnoAuth,
  validations.cambiarPasswordPropia,
  handleValidation,
  appCtrl.cambiarPasswordPropia
);
router.put(
  '/mis-datos/pregunta-secreta',
  auth,
  alumnoAuth,
  validations.configurarPreguntaSecreta,
  handleValidation,
  appCtrl.configurarPreguntaSecreta
);
router.get('/mis-intentos', auth, alumnoAuth, appCtrl.miHistorial);
router.get('/certificado/:id', auth, alumnoAuth, appCtrl.certificado);

// ── Profesor (incluye admin) ───────────────────────────────────────────────
router.get('/profesor/alumnos', auth, profAuth, profCtrl.listarAlumnos);
router.post('/profesor/alumnos', auth, profAuth, validations.crearAlumno, handleValidation, profCtrl.crearAlumno);
router.delete('/profesor/alumnos/:id', auth, profAuth, profCtrl.eliminarAlumno);
router.put(
  '/profesor/alumnos/:id/password',
  auth,
  profAuth,
  validations.cambiarPassword,
  handleValidation,
  profCtrl.cambiarPassword
);
router.post('/profesor/alumnos/:alumnoId/evaluaciones/:evaluacionId/reset', auth, profAuth, profCtrl.resetearIntentos);
router.put(
  '/profesor/alumnos/:id/evaluaciones',
  auth,
  profAuth,
  validations.asignarEvaluaciones,
  handleValidation,
  profCtrl.asignarEvaluaciones
);

// CRUD de evaluaciones
router.get('/profesor/evaluaciones', auth, profAuth, profCtrl.listarEvaluaciones);
router.get('/profesor/evaluaciones/:id', auth, profAuth, profCtrl.obtenerEvaluacion);
router.post(
  '/profesor/evaluaciones',
  auth,
  profAuth,
  validations.evaluacion,
  handleValidation,
  profCtrl.crearEvaluacion
);
router.put(
  '/profesor/evaluaciones/:id',
  auth,
  profAuth,
  validations.editarEvaluacion,
  handleValidation,
  profCtrl.editarEvaluacion
);
router.delete('/profesor/evaluaciones/:id', auth, profAuth, profCtrl.eliminarEvaluacion);

router.get('/profesor/estadisticas', auth, profAuth, profCtrl.estadisticas);
router.get('/profesor/intentos/:id', auth, profAuth, profCtrl.detalleIntento);
router.get('/profesor/exportar/:id', auth, profAuth, profCtrl.exportarCSV);

// ── Admin ──────────────────────────────────────────────────────────────────
router.get('/admin/profesores', auth, adminAuth, adminCtrl.listarProfesores);
router.post('/admin/profesores', auth, adminAuth, validations.crearProfesor, handleValidation, adminCtrl.crearProfesor);
router.delete('/admin/profesores/:id', auth, adminAuth, adminCtrl.eliminarProfesor);
router.put(
  '/admin/profesores/:id/password',
  auth,
  adminAuth,
  validations.cambiarPassword,
  handleValidation,
  adminCtrl.cambiarPasswordProfesor
);
router.get('/admin/logs', auth, adminAuth, adminCtrl.verLogs);
router.get('/admin/estadisticas', auth, adminAuth, adminCtrl.estadisticasGlobales);

module.exports = router;
