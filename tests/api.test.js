'use strict';
const request = require('supertest');
const app = require('../app');
const db = require('../data/db');
const { clearLoginAttempts } = require('../middleware/security');

describe('ITC Evaluaciones API', () => {
  beforeEach(() => {
    db.resetDB();
    clearLoginAttempts();
  });

  describe('Login', () => {
    it('inicia sesion profesor correctamente', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.tipo).toBe('profesor');
    });

    it('rechaza credenciales incorrectas', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: 'incorrecta', tipo: 'profesor' });
      expect(res.status).toBe(401);
    });

    it('rechaza body invalido', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ nombre: '', password: '', tipo: 'profesor' });
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

      const res = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: firstRefresh });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).not.toBe(firstRefresh);

      // El refresh viejo debe quedar invalido tras la rotacion
      const res2 = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: firstRefresh });
      expect(res2.status).toBe(401);
    });
  });

  describe('Profesor: gestion de alumnos', () => {
    let token;
    beforeEach(async () => {
      const login = await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' });
      token = login.body.token;
    });

    it('crea y lista alumnos', async () => {
      await request(app)
        .post('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'juan', password: 'pass123', nombre_completo: 'Juan Perez' })
        .expect(200);

      const res = await request(app)
        .get('/api/profesor/alumnos')
        .set('Authorization', `Bearer ${token}`);
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
      const res = await request(app)
        .get('/api/profesor/alumnos')
        .set('Authorization', 'Bearer token-invalido');
      expect(res.status).toBe(401);
    });
  });

  describe('Alumno: flujo de evaluacion', () => {
    let token;
    beforeEach(async () => {
      await request(app)
        .post('/api/login')
        .send({ nombre: 'GKempe', password: '1234', tipo: 'profesor' })
        .then(async (login) => {
          const profToken = login.body.token;
          await request(app)
            .post('/api/profesor/alumnos')
            .set('Authorization', `Bearer ${profToken}`)
            .send({ nombre: 'alumno1', password: 'pass123', nombre_completo: 'Alumno Uno' });
        });
      const login = await request(app)
        .post('/api/login')
        .send({ nombre: 'alumno1', password: 'pass123', tipo: 'alumno' });
      token = login.body.token;
    });

    it('listar estado con 6 evaluaciones', async () => {
      const res = await request(app)
        .get('/api/estado')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.evaluaciones.length).toBe(6);
    });

    it('tomar evaluacion y enviar resultado', async () => {
      const ev = await request(app)
        .get('/api/evaluacion/1')
        .set('Authorization', `Bearer ${token}`);
      expect(ev.status).toBe(200);
      expect(ev.body.totalPreguntas).toBe(10);
      expect(ev.body.preguntas.length).toBe(10);
      // Las preguntas no deben incluir la respuesta correcta
      expect(ev.body.preguntas[0].correcta).toBeUndefined();

      const notas = ev.body.preguntas.map(() => 1);
      const res = await request(app)
        .post('/api/resultado')
        .set('Authorization', `Bearer ${token}`)
        .send({ evaluacionId: 1, respuestas: notas });
      expect(res.status).toBe(200);
      expect(res.body.totalPreguntas).toBe(10);
      expect(res.body.aprobado).toBe(true);
    });

    it('agotar intentos bloquea nuevas evaluaciones', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/resultado')
          .set('Authorization', `Bearer ${token}`)
          .send({ evaluacionId: 2, respuestas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
          .expect(200);
      }
      const res = await request(app)
        .get('/api/evaluacion/2')
        .set('Authorization', `Bearer ${token}`);
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
});
