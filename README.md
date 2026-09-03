# ITC Evaluaciones

Sistema de evaluaciones online para ITC.

## Acceso

- **Profesor:** `GKempe` / `1234` (crea alumnos, ve estadísticas)
- **Alumnos:** cuentas creadas por el profesor; rinden 6 evaluaciones con 3 intentos y 60% de aprobación.

## Capacitaciones

1. Marketing Digital
2. Diseño Técnico Industrial
3. Diseño Gráfico Publicitario
4. Diagnóstico y Mantenimiento de PC
5. Asistente Administrativo con IA
6. Administración de PyMEs

## Stack

- Node.js + Express 5
- JWT para autenticación
- bcryptjs para contraseñas
- Frontend vanilla (HTML/CSS/JS)
- `db.json` como almacenamiento (auto-generado en el primer arranque)

## Ejecutar local

```bash
npm install
npm start
```

Luego abrir `http://localhost:3000`.

## Desplegar en Vercel

Incluye `vercel.json` adaptado para serverless. Importar el repo en Vercel con Node.js como framework. Nota: la persistencia es en memoria/archivo local; para producción se recomienda migrar a una base de datos (p. ej. Vercel Postgres o MongoDB).
