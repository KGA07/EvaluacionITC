'use strict';
const request = require('supertest');
const app = require('../app');
const db = require('../data/db');
const { clearLoginAttempts } = require('../middleware/security');

// Helper: login de profesor con credenciales por defecto del seed
async function loginProfesor() {
  const res = await request(app).post('/api/login').send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' });
  return res.body.token;
}

async function loginAdmin() {
  const res = await request(app).post('/api/login').send({ nombre: 'admin', password: 'admin123', tipo: 'admin' });
  return res.body.token;
}

describe('ITC Evaluaciones API', () => {
  beforeEach(async () => {
    await db.resetDB();
    clearLoginAttempts();
  });

  describe('Login', () => {
    it('inicia sesion profesor correctamente', async () => {
      const res = await request(app).post('/api/login').send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.tipo).toBe('profesor');
    });

    it('inicia sesion administrador', async () => {
      const res = await request(app).post('/api/login').send({ nombre: 'admin', password: 'admin123', tipo: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.tipo).toBe('admin');
    });

    it('rechaza credenciales incorrectas', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: 'incorrecta', tipo: 'profesor' });
      expect(res.status).toBe(401);
    });

    it('rechaza body invalido', async () => {
      const res = await request(app).post('/api/login').send({ nombre: '', password: '', tipo: 'profesor' });
      expect(res.status).toBe(400);
    });

    it('bloquea tras multiples intentos fallidos (anti fuerza bruta)', async () => {
      let status = 0;
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/login')
          .send({ nombre: 'GKempe', password: 'mala', tipo: 'profesor' });
        status = res.status;
      }
      expect(status).toBe(429);
    });
  });

  describe('Refresh token', () => {
    it('rotacion de refresh token', async () => {
      const login = await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' });
      const firstRefresh = login.body.refreshToken;

      const res = await request(app).post('/api/refresh').send({ refreshToken: firstRefresh });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).not.toBe(firstRefresh);

      // El refresh viejo debe quedar invalido tras la rotacion
      const res2 = await request(app).post('/api/refresh').send({ refreshToken: firstRefresh });
      expect(res2.status).toBe(401);
    });
  });

  describe('Profesor: gestion de alumnos', () => {
    let token;
    beforeEach(async () => {
      token = await loginProfesor();
    });

    it('crea y lista alumnos', async () => {
      await request(app)
        .post('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'juan', password: 'pass123', nombre_completo: 'Juan Perez' })
        .expect(200);

      const res = await request(app).get('/api/profesor/alumnos').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.alumnos.some((a) => a.nombre === 'juan')).toBe(true);
    });

    it('rechaza duplicados', async () => {
      await request(app)
        .post('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'juan', password: 'pass123' });
      const res = await request(app)
        .post('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'juan', password: 'pass123' });
      expect(res.status).toBe(400);
    });

    it('bloquea acceso de no-profesor', async () => {
      const res = await request(app).get('/api/profesor/alumnos').set('Authorization', 'Bearer token-invalido');
      expect(res.status).toBe(401);
    });
  });

  describe('Profesor: CRUD de evaluaciones', () => {
    let token;
    beforeEach(async () => {
      token = await loginProfesor();
    });

    it('lista las 6 evaluaciones con config', async () => {
      const res = await request(app).get('/api/profesor/evaluaciones').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.evaluaciones.length).toBe(6);
      expect(res.body.evaluaciones[0].intentosMax).toBe(3);
      expect(res.body.evaluaciones[0].porcentaje).toBe(60);
    });

    it('crea, edita y elimina una evaluacion', async () => {
      const nueva = await request(app)
        .post('/api/profesor/evaluaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({
          capacitacion: 'Ciberseguridad Basica',
          intentosMax: 2,
          porcentaje: 70,
          duracionMinutos: 10,
          preguntas: [
            {
              pregunta: 'Que es un firewall?',
              opciones: ['Un videojuego', 'Filtro de trafico de red', 'Un antivirus', 'Una red social'],
              correcta: 1,
              explicacion: 'El firewall filtra el trafico entrante y saliente.'
            }
          ]
        });
      expect(nueva.status).toBe(200);
      expect(nueva.body.id).toBe(7);

      const lista = await request(app).get('/api/profesor/evaluaciones').set('Authorization', `Bearer ${token}`);
      expect(lista.body.evaluaciones.length).toBe(7);

      const editar = await request(app)
        .put(`/api/profesor/evaluaciones/${nueva.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ intentosMax: 4 });
      expect(editar.status).toBe(200);

      const borrar = await request(app)
        .delete(`/api/profesor/evaluaciones/${nueva.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(borrar.status).toBe(200);
    });

    it('rechaza evaluacion sin preguntas', async () => {
      const res = await request(app)
        .post('/api/profesor/evaluaciones')
        .set('Authorization', `Bearer ${token}`)
        .send({ capacitacion: 'Sin preguntas', preguntas: [] });
      expect(res.status).toBe(400);
    });
  });

  describe('Admin', () => {
    it('gestiona profesores y lee logs', async () => {
      const adminToken = await loginAdmin();
      const profToken = await loginProfesor();

      // El profesor no puede usar rutas de admin
      const denied = await request(app).get('/api/admin/profesores').set('Authorization', `Bearer ${profToken}`);
      expect(denied.status).toBe(403);

      // Crear un profesor desde admin
      const creado = await request(app)
        .post('/api/admin/profesores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'nuevoprof', password: 'pass123', nombre_completo: 'Nuevo Profesor' });
      expect(creado.status).toBe(200);

      const lista = await request(app).get('/api/admin/profesores').set('Authorization', `Bearer ${adminToken}`);
      expect(lista.body.profesores.some((p) => p.nombre === 'nuevoprof')).toBe(true);

      // Deben existir logs de auditoria
      const logs = await request(app).get('/api/admin/logs').set('Authorization', `Bearer ${adminToken}`);
      expect(logs.status).toBe(200);
      expect(logs.body.logs.length).toBeGreaterThan(0);
      expect(logs.body.logs.some((l) => l.accion === 'crear_profesor')).toBe(true);
    });
  });

  describe('Alumno: flujo de evaluacion', () => {
    let token;
    beforeEach(async () => {
      await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' })
        .then(async (login) => {
          await request(app)
            .post('/api/profesor/alumnos')
            .set('Authorization', `Bearer ${login.body.token}`)
            .send({ nombre: 'alumno1', password: 'pass123', nombre_completo: 'Alumno Uno' });
        });
      const login = await request(app)
        .post('/api/login')
        .send({ nombre: 'alumno1', password: 'pass123', tipo: 'alumno' });
      token = login.body.token;
    });

    it('listar estado con 6 evaluaciones y config', async () => {
      const res = await request(app).get('/api/estado').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.evaluaciones.length).toBe(6);
      expect(res.body.evaluaciones[0].intentosMax).toBe(3);
      expect(res.body.evaluaciones[0].duracionMinutos).toBe(15);
    });

    it('tomar evaluacion (opciones mezcladas) y aprobar enviando orden', async () => {
      const ev = await request(app).get('/api/evaluacion/1').set('Authorization', `Bearer ${token}`);
      expect(ev.status).toBe(200);
      expect(ev.body.totalPreguntas).toBe(10);
      // Las preguntas no deben filtrar la respuesta correcta
      expect(ev.body.preguntas[0].correcta).toBeUndefined();
      // Debe incluir el orden de mezcla por intento (mejora 8.7)
      expect(ev.body.orden.length).toBe(10);
      ev.body.orden.forEach((o) => {
        expect(Array.isArray(o)).toBe(true);
        expect([...new Set(o)].length).toBe(4);
        expect(Math.max(...o)).toBe(3);
      });

      // En el seed, en la evaluación 1 la respuesta correcta siempre es la 1 (original).
      const respuestas = ev.body.orden.map((o) => o.indexOf(1));
      const res = await request(app)
        .post('/api/resultado')
        .set('Authorization', `Bearer ${token}`)
        .send({ evaluacionId: 1, respuestas, orden: ev.body.orden });
      expect(res.status).toBe(200);
      expect(res.body.totalPreguntas).toBe(10);
      expect(res.body.aprobado).toBe(true);
      expect(res.body.detalle[0].explicacion).toBeDefined();
    });

    it('obtener certificado al aprobar', async () => {
      const ev = await request(app).get('/api/evaluacion/1').set('Authorization', `Bearer ${token}`);
      const respuestas = ev.body.orden.map((o) => o.indexOf(1));
      await request(app)
        .post('/api/resultado')
        .set('Authorization', `Bearer ${token}`)
        .send({ evaluacionId: 1, respuestas, orden: ev.body.orden })
        .expect(200);

      const cert = await request(app).get('/api/certificado/1').set('Authorization', `Bearer ${token}`);
      expect(cert.status).toBe(200);
      expect(cert.body.certificado.codigo).toMatch(/^ITC-/);
      expect(cert.body.certificado.alumno).toBe('Alumno Uno');
    });

    it('agotar intentos bloquea nuevas evaluaciones', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/resultado')
          .set('Authorization', `Bearer ${token}`)
          .send({ evaluacionId: 2, respuestas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
          .expect(200);
      }
      const res = await request(app).get('/api/evaluacion/2').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('cambio de contrasena propio', async () => {
      const res = await request(app)
        .put('/api/mis-datos/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ passwordActual: 'pass123', passwordNueva: 'nueva456' });
      expect(res.status).toBe(200);
    });
  });

  describe('Recuperar contrasena con pregunta secreta', () => {
    it('flujo completo: configurar, preguntar, verificar y cambiar', async () => {
      // Crear alumno
      const profToken = await loginProfesor();
      await request(app)
        .post('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${profToken}`)
        .send({ nombre: 'maria', password: 'pass123', nombre_completo: 'Maria Lopez' });
      const login = await request(app)
        .post('/api/login')
        .send({ nombre: 'maria', password: 'pass123', tipo: 'alumno' });
      const token = login.body.token;

      // Configurar pregunta secreta
      const config = await request(app)
        .put('/api/mis-datos/pregunta-secreta')
        .set('Authorization', `Bearer ${token}`)
        .send({ pregunta: 'Nombre de tu mascota?', respuesta: 'Rex', passwordActual: 'pass123' });
      expect(config.status).toBe(200);

      // Pedir la pregunta (sin sesión)
      const pregunta = await request(app).post('/api/recuperar/pregunta').send({ nombre: 'maria', tipo: 'alumno' });
      expect(pregunta.status).toBe(200);
      expect(pregunta.body.pregunta).toBe('Nombre de tu mascota?');

      // Verificar respuesta -> resetToken
      const verificar = await request(app)
        .post('/api/recuperar/verificar')
        .send({ nombre: 'maria', tipo: 'alumno', respuesta: 'Rex' });
      expect(verificar.status).toBe(200);
      const resetToken = verificar.body.resetToken;

      // Respuesta incorrecta debe fallar
      const mal = await request(app)
        .post('/api/recuperar/verificar')
        .send({ nombre: 'maria', tipo: 'alumno', respuesta: 'Michi' });
      expect(mal.status).toBe(401);

      // Establecer nueva contrasena
      const cambio = await request(app)
        .post('/api/recuperar/contrasena')
        .send({ resetToken, passwordNueva: 'nueva789' });
      expect(cambio.status).toBe(200);

      // Login con la nueva contrasena
      const relogin = await request(app)
        .post('/api/login')
        .send({ nombre: 'maria', password: 'nueva789', tipo: 'alumno' });
      expect(relogin.status).toBe(200);
    });
  });
});
