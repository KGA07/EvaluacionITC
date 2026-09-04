'use strict';
const { body, param, query, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array()[0].msg;
    return res.status(400).json({ error: msg });
  }
  next();
}

// Valida una pregunta enviada por el profesor en el CRUD de evaluaciones
const preguntaSchema = [
  body('pregunta')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('La pregunta es obligatoria.')
    .isLength({ max: 500 })
    .withMessage('La pregunta es demasiado larga.'),
  body('opciones').isArray({ min: 2, max: 6 }).withMessage('Cada pregunta debe tener entre 2 y 6 opciones.'),
  body('opciones.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Las opciones no pueden estar vacias.')
    .isLength({ max: 200 })
    .withMessage('Una opcion es demasiado larga.'),
  body('correcta')
    .isInt({ min: 0 })
    .custom((v, { req }) => {
      const opciones = req.body && req.body.opciones;
      if (opciones && v >= opciones.length)
        throw new Error('El indice de la respuesta correcta no coincide con las opciones.');
      return true;
    })
    .withMessage('Indice de respuesta correcta invalido.'),
  body('explicacion')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La explicacion es demasiado larga.')
];

const evaluacionSchema = [
  body('capacitacion')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('La capacitacion es obligatoria.')
    .isLength({ max: 120 })
    .withMessage('Nombre de capacitacion demasiado largo.'),
  body('titulo').optional().isString().trim().isLength({ max: 120 }).withMessage('Titulo demasiado largo.'),
  body('intentosMax').optional().isInt({ min: 1, max: 10 }).withMessage('Los intentos maximos deben ser entre 1 y 10.'),
  body('porcentaje')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El porcentaje de aprobacion debe ser entre 1 y 100.'),
  body('duracionMinutos')
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage('La duracion debe estar entre 1 y 180 minutos.'),
  body('activa').optional().isBoolean().withMessage('El campo activa debe ser booleano.'),
  body('preguntas').isArray({ min: 1 }).withMessage('Debe haber al menos una pregunta.')
];

const validations = {
  login: [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El usuario es obligatorio.')
      .isLength({ max: 50 })
      .withMessage('Usuario demasiado largo.'),
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .isLength({ max: 100 })
      .withMessage('Contrasena demasiado larga.'),
    body('tipo').isIn(['alumno', 'profesor', 'admin']).withMessage('Tipo invalido.')
  ],
  crearAlumno: [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El usuario es obligatorio.')
      .isLength({ min: 3, max: 50 })
      .withMessage('El usuario debe tener entre 3 y 50 caracteres.'),
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .isLength({ min: 4, max: 100 })
      .withMessage('La contrasena debe tener al menos 4 caracteres.'),
    body('nombre_completo').optional().trim().isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
  ],
  crearProfesor: [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El usuario es obligatorio.')
      .isLength({ min: 3, max: 50 })
      .withMessage('El usuario debe tener entre 3 y 50 caracteres.'),
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .isLength({ min: 4, max: 100 })
      .withMessage('La contrasena debe tener al menos 4 caracteres.'),
    body('nombre_completo').optional().trim().isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
  ],
  cambiarPassword: [
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .isLength({ min: 4, max: 100 })
      .withMessage('La contrasena debe tener al menos 4 caracteres.')
  ],
  cambiarPasswordPropia: [
    body('passwordActual').notEmpty().withMessage('Ingresa tu contrasena actual.'),
    body('passwordNueva')
      .notEmpty()
      .withMessage('Ingresa la nueva contrasena.')
      .isLength({ min: 4, max: 100 })
      .withMessage('La nueva contrasena debe tener al menos 4 caracteres.')
  ],
  resultado: [
    body('evaluacionId').isInt({ min: 1 }).withMessage('Evaluacion invalida.'),
    body('respuestas')
      .isArray()
      .withMessage('Respuestas invalidas.')
      .custom((arr) => arr.length > 0)
      .withMessage('Respuestas vacias.'),
    body('orden').optional().isArray().withMessage('Orden de opciones invalido.')
  ],
  evaluacion: evaluacionSchema,
  editarEvaluacion: [
    body('capacitacion')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 120 })
      .withMessage('Nombre de capacitacion demasiado largo.'),
    body('titulo').optional().isString().trim().isLength({ max: 120 }).withMessage('Titulo demasiado largo.'),
    body('intentosMax')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Los intentos maximos deben ser entre 1 y 10.'),
    body('porcentaje')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El porcentaje de aprobacion debe ser entre 1 y 100.'),
    body('duracionMinutos')
      .optional()
      .isInt({ min: 1, max: 180 })
      .withMessage('La duracion debe estar entre 1 y 180 minutos.'),
    body('activa').optional().isBoolean().withMessage('El campo activa debe ser booleano.'),
    body('preguntas').optional().isArray({ min: 1 }).withMessage('Debe haber al menos una pregunta.')
  ],
  pregunta: preguntaSchema,
  recuperarPaso1: [
    body('nombre').trim().notEmpty().withMessage('Ingresa tu usuario.'),
    body('tipo').isIn(['alumno', 'profesor']).withMessage('Tipo invalido.')
  ],
  recuperarPaso2: [
    body('nombre').trim().notEmpty().withMessage('Ingresa tu usuario.'),
    body('tipo').isIn(['alumno', 'profesor']).withMessage('Tipo invalido.'),
    body('respuesta').trim().notEmpty().withMessage('Ingresa la respuesta a tu pregunta secreta.')
  ],
  recuperarPaso3: [
    body('resetToken').notEmpty().withMessage('Token de recuperacion requerido.'),
    body('passwordNueva')
      .notEmpty()
      .withMessage('Ingresa la nueva contrasena.')
      .isLength({ min: 4, max: 100 })
      .withMessage('La nueva contrasena debe tener al menos 4 caracteres.')
  ],
  configurarPreguntaSecreta: [
    body('pregunta')
      .trim()
      .notEmpty()
      .withMessage('Ingresa tu pregunta secreta.')
      .isLength({ max: 200 })
      .withMessage('La pregunta es demasiado larga.'),
    body('respuesta')
      .trim()
      .notEmpty()
      .withMessage('Ingresa la respuesta.')
      .isLength({ max: 200 })
      .withMessage('La respuesta es demasiado larga.'),
    body('passwordActual').notEmpty().withMessage('Confirma con tu contrasena actual.')
  ]
};

module.exports = {
  validations,
  handleValidation,
  param,
  body,
  query,
  validationResult,
  evaluacionSchema,
  preguntaSchema
};
