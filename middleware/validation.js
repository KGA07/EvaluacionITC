'use strict';
const { body, param, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0].msg;
    return res.status(400).json({ error: msg });
  }
  next();
}

const validations = {
  login: [
    body('nombre').trim().notEmpty().withMessage('El usuario es obligatorio.').isLength({ max: 50 }).withMessage('Usuario demasiado largo.'),
    body('password').notEmpty().withMessage('La contrasena es obligatoria.').isLength({ max: 100 }).withMessage('Contrasena demasiado larga.'),
    body('tipo').isIn(['alumno', 'profesor']).withMessage('Tipo invalido.')
  ],
  crearAlumno: [
    body('nombre').trim().notEmpty().withMessage('El usuario es obligatorio.').isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres.'),
    body('password').notEmpty().withMessage('La contrasena es obligatoria.').isLength({ min: 4, max: 100 }).withMessage('La contrasena debe tener al menos 4 caracteres.'),
    body('nombre_completo').optional().trim().isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
  ],
  cambiarPassword: [
    body('password').notEmpty().withMessage('La contrasena es obligatoria.').isLength({ min: 4, max: 100 }).withMessage('La contrasena debe tener al menos 4 caracteres.')
  ],
  cambiarPasswordPropia: [
    body('passwordActual').notEmpty().withMessage('Ingresa tu contrasena actual.'),
    body('passwordNueva').notEmpty().withMessage('Ingresa la nueva contrasena.').isLength({ min: 4, max: 100 }).withMessage('La nueva contrasena debe tener al menos 4 caracteres.')
  ],
  resultado: [
    body('evaluacionId').isInt({ min: 1 }).withMessage('Evaluacion invalida.'),
    body('respuestas').isArray().withMessage('Respuestas invalidas.').custom((arr) => arr.length > 0).withMessage('Respuestas vacias.')
  ]
};

module.exports = { validations, handleValidation, param, body, validationResult };
