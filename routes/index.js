'use strict';
const express = require('express');
const { Router } = express;
const appCtrl = require('../controllers/appController');
const profCtrl = require('../controllers/profesorController');
const { auth, profAuth, alumnoAuth } = require('../middleware/auth');
const { validations, handleValidation } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimit');
const { loginRateLimiter } = require('../middleware/security');

const router = Router();

// ── Autenticacion ──────────────────────────────────────────────────────────
router.post('/login', authLimiter, validations.login, handleValidation, loginRateLimiter, appCtrl.login);
router.post('/refresh', authLimiter, appCtrl.refresh);
router.post('/logout', appCtrl.logout);

// ── Alumno ─────────────────────────────────────────────────────────────────
router.get('/estado', auth, alumnoAuth, appCtrl.estado);
router.get('/evaluacion/:id', auth, alumnoAuth, appCtrl.tomarEvaluacion);
router.post('/resultado', auth, alumnoAuth, validations.resultado, handleValidation, appCtrl.resultado);
router.put('/mis-datos/password', auth, alumnoAuth, validations.cambiarPasswordPropia, handleValidation, appCtrl.cambiarPasswordPropia);
router.get('/mis-intentos', auth, alumnoAuth, appCtrl.miHistorial);

// ── Profesor ───────────────────────────────────────────────────────────────
router.get('/profesor/alumnos', auth, profAuth, profCtrl.listarAlumnos);
router.post('/profesor/alumnos', auth, profAuth, validations.crearAlumno, handleValidation, profCtrl.crearAlumno);
router.delete('/profesor/alumnos/:id', auth, profAuth, profCtrl.eliminarAlumno);
router.put('/profesor/alumnos/:id/password', auth, profAuth, validations.cambiarPassword, handleValidation, profCtrl.cambiarPassword);
router.post('/profesor/alumnos/:alumnoId/evaluaciones/:evaluacionId/reset', auth, profAuth, profCtrl.resetearIntentos);
router.get('/profesor/estadisticas', auth, profAuth, profCtrl.estadisticas);
router.get('/profesor/exportar/:id', auth, profAuth, profCtrl.exportarCSV);

module.exports = router;
