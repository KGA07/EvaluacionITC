# ITC Evaluaciones

Sistema de evaluaciones online para ITC: los alumnos rinden evaluaciones por capacitación, con límite de intentos, tiempo y porcentaje de aprobación configurable, orden de preguntas y opciones mezclado por intento, explicaciones post-examen y certificado de aprobación imprimible.

## Cómo usar

1. **Iniciar sesión** como Alumno, Profesor (o administrador activado en el toggle de la pantalla de login).
2. **Alumno**: rinde las evaluaciones, revisa las respuestas y sus explicaciones, descarga su certificado al aprobar.
3. **Profesor**: crea/edita alumnos, crea y gestiona evaluaciones, resetea intentos, exporta resultados a CSV y revisa el detalle de cualquier intento.
4. **Admin** (`admin` / `admin123` por defecto): gestiona profesores y consulta el registro de auditoría y estadísticas globales.

### Credenciales por defecto

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Profesor | `GKempe` | `1234` |
| Admin | `admin` | `admin123` |

> Cambia ambas desde las variables de entorno (`PROFESOR_USER/PASSWORD`, `ADMIN_USER/PASSWORD`).

## Capacitaciones de ejemplo

Marketing Digital, Diseño Técnico Industrial, Diseño Gráfico Publicitario, Diagnóstico y Mantenimiento de PC, Asistente Administrativo con IA y Administración de PyMEs (6 evaluaciones de 10 preguntas).

## Características

- Auth JWT con refresh tokens y **rotación**; rate limit anti fuerza bruta en login.
- **Recuperación de contraseña** por pregunta secreta (alumno y profesor).
- Configuración **por evaluación**: intentos máximos, % de aprobación y duración en minutos.
- **Orden aleatorio** de preguntas y opciones por intento (determinístico por intento).
- Autoguardado del examen (borrador) y botón "ir a la primera sin responder".
- **Explicaciones** por pregunta visibles en el resultado y para el profesor.
- **Certificado/constancia** imprimible con código único (PWA instalable).
- **Panel admin**: profesores, logs de auditoría y estadísticas globales.
- Tema claro/oscuro y tamaño de letra ajustable; dark mode y contraste accesibles.
- Dashboard con filtros por estado y curva de progreso (historial).

## Stack

- Node.js + Express 5, JWT, bcryptjs, `pg`
- Frontend vanilla (HTML/CSS/JS), PWA (manifest + service worker)
- ESLint + Prettier, Jest + Supertest, esbuild (minificación)
- Persistencia: **JSON (`db.json`) local** o **Postgres** vía `DATABASE_URL`

## Correr local

```bash
npm install
npm start        # http://localhost:3000
```

Opcional:
```bash
npm test         # suite de tests (19)
npm run lint     # ESLint
npm run build    # genera public-dist/ con JS y CSS minificados
```

## Migración a Postgres (recomendado para Vercel)

La app usa `db.json` si no hay `DATABASE_URL`. Para usar una base de datos:

1. En el panel de Vercel abre tu proyecto → **Storage** → **Create Database** → elige **Neon/Postgres** (plan gratuito).
2. Vercel integra la conexión automáticamente (variables `POSTGRES_URL`, `POSTGRES_USER`, etc.); la app las detecta. Si tu proveedor no las entrega, crea una **Environment Variable** `DATABASE_URL` o `POSTGRES_URL` con la cadena de conexión.
3. Agrega también `JWT_SECRET`, `REFRESH_SECRET`, `ADMIN_PASSWORD` (y opcionalmente `SERVE_BUILT=1`) en **Project → Settings → Environment Variables**.
4. Vuelve a desplegar (o haz un push a `main`). En el **primer arranque** se crea automáticamente la tabla `kv` y se carga el seed (evaluaciones, profesor y admin).
5. Verifica en **Logs** que no haya errores de conexión. ¡Listo! Los datos persisten en Postgres.

> La conexión usa SSL automáticamente en producción (`rejectUnauthorized: false`, compatible con Neon/Vercel).

## Desplegar en Vercel

El repo incluye `vercel.json` (serverless) y el CI de GitHub Actions (`npm test`, `lint` y `build` en cada push). Importa el repo en Vercel; cada push a `main` se despliega automáticamente.

## Variable de entorno (`SERVE_BUILT`)

- `SERVE_BUILT=0` (default): se sirve `public/` (código fuente).
- `SERVE_BUILT=1`: se sirve `public-dist/` (minificado por `npm run build`). La usamos en Vercel para páginas más livianas.

## API

Documentación completa en `/api/docs` (OpenAPI JSON). Endpoints principales:

- Auth: `POST /api/login`, `/api/refresh`, `/api/logout`, `/api/recuperar/*`
- Alumno: `GET /api/estado`, `/api/evaluacion/:id`, `POST /api/resultado`, `/api/mis-intentos`, `GET /api/certificado/:id`
- Profesor: CRUD `/api/profesor/evaluaciones`, `/api/profesor/alumnos`, `/api/profesor/estadisticas`, `/api/profesor/intentos/:id`, `/api/profesor/exportar/:id`
- Admin: `/api/admin/profesores`, `/api/admin/logs`, `/api/admin/estadisticas`

## Estructura

```
public/           frontend (HTML, CSS, JS, PWA)
controllers/      lógica de negocio por rol (app, profesor, admin)
middleware/       auth, validación, rate limit, errores
routes/           endpoints de la API
data/             capa de persistencia (db.json / Postgres) + seed
utils/            helpers (shuffle, CSV, porcentajes) y auditoría
docs/             OpenAPI
scripts/          build (minificación)
tests/            suite de integración
```