================================================================================
                MEJORAS PROPUESTAS - SISTEMA DE EVALUACIONES ITC
================================================================================
Fecha: septiembre 2026 (actualizado tras la implementación)
Proyecto: ITC Evaluaciones (repo: https://github.com/KGA07/EvaluacionITC)
Stack actual: Node.js + Express 5, JWT, bcryptjs, persistencia JSON o Postgres,
              frontend vanilla (HTML/CSS/JS), PWA, ESLint/Prettier, Jest.

Estado de cada mejora:
  [HECHA]    Implementada y verificada.
  [EXTERNA]  Requiere servicio/herramienta externa o decisión del admin.
  [FUTURO]   Pendiente, se sugiere para una próxima iteración.

--------------------------------------------------------------------------------
ÍNDICE
--------------------------------------------------------------------------------
1. CRÍTICAS (bloquean el uso en producción)
2. FUNCIONALIDAD CORE (de alto valor)
3. SEGURIDAD
4. EXPERIENCIA DE USUARIO (UX/UI)
5. ACCESIBILIDAD
6. RENDIMIENTO
7. MANTENIMIENTO / CALIDAD DE CÓDIGO
8. EXTRAS / A FUTURO

================================================================================
1. CRÍTICAS (bloquean el uso en producción)
================================================================================

1.1 PERSISTENCIA DE DATOS (la más importante)                 [HECHA]
    - Implementado un adaptador de almacenamiento en data/:
      - Sin DATABASE_URL -> archivo local db.json (modo demo/desarrollo).
      - Con DATABASE_URL (Vercel/Neon Postgres) -> tabla kv (clave/valor)
        usando pg. SSL automático en producción. La tabla y el seed se crean
        en el primer arranque.
    - Guía paso a paso en README.md ("Migración a Postgres").
    - Pendiente en el deploy real: que el administrador configure la BD en
      Vercel (Storage -> Neon/Postgres) y las variables de entorno.

1.2 VARIABLES DE ENTORNO / SECRETOS                            [HECHA]
    - JWT_SECRET, REFRESH_SECRET, credenciales admin/profesor y parámetros de
      evaluaciones se leen de variables de entorno (.env / panel de Vercel).
    - .env.example documentado; nunca se commitean secretos (db.json y .env
      están en .gitignore). Warning en producción si JWT_SECRET usa el default.

================================================================================
2. FUNCIONALIDAD CORE (de alto valor)
================================================================================

2.1 CRUD DE EVALUACIONES (profesor)                            [HECHA]
    - Panel "Gestionar Evaluaciones": crear, editar, eliminar, activar/
      desactivar y exportar CSV. Permite configurar por evaluación: intentos
      máximos, % de aprobación y duración en minutos. Las preguntas se editan
      en JSON con explicación opcional.

2.2 ADMINISTRADOR PRINCIPAL                                    [HECHA]
    - Rol "admin" en el login (tercer toggle). Gestiona profesores (crear,
      cambiar contraseña, eliminar), ve estadísticas globales y el registro
      de auditoría. El profesor autenticado como admin también accede al
      panel completo de profesor.

2.3 EDICIÓN DE PERFIL / RECUPERAR CONTRASEÑA                   [HECHA]
    - El alumno/profesor puede cambiar su propia contraseña y configurar una
      pregunta secreta (opcional). Recuperación de contraseña en 3 pasos por
      pregunta secreta (token de un solo uso, 15 min).
    - Sistema de email NO implementado: requiere servicio externo (ver 8.2).

2.4 FEEDBACK DESPUÉS DE CADA EVALUACIÓN                        [HECHA]
    - Resultado con desglose pregunta por pregunta: respuesta del alumno,
      correcta/incorrecta y explicación breve de cada pregunta. Visible también
      para el profesor en el detalle de cada intento.

2.5 SEGUIMIENTO A LO LARGO DEL TIEMPO                          [HECHA]
    - Historial de intentos del alumno con fechas y curva de progreso (SVG)
      en el dashboard. El profesor ve la historia por alumno-evaluación y
      puede resetear los intentos de forma controlada.

2.6 EXPORTACIÓN DE DATOS                                       [HECHA]
    - Exportación de resultados por evaluación a CSV (con BOM UTF-8 para
      Excel) desde el panel del profesor y las estadísticas.
    - PDF: se cubre vía imprimir (ver 4.9 y 2.7).

2.7 CERTIFICADOS / CONSTANCIAS                                 [HECHA]
    - Certificado de aprobación imprimible/PDF (botón "Imprimir / Guardar
      PDF") con nombre, capacitación, puntaje, % mínimo y código único
      (ITC-###-####). Disponible al aprobar desde el dashboard y el resultado.

================================================================================
3. SEGURIDAD
================================================================================

3.1 LÍMITE DE INTENTOS DE LOGIN (anti fuerza bruta)            [HECHA]
    - Límite de intentos fallidos por IP/ventana (configurable por
      LOGIN_MAX_ATTEMPTS y LOGIN_WINDOW_MS) + rate limit global por IP.

3.2 SEGURIDAD EN CABECERAS HTTP                                [HECHA]
    - helmet activo (HSTS en producción, ocultado de X-Powered-By, etc.).
      CSP desactivado por compatibilidad con el código inline del frontend
      vanilla; se recomienda activarlo si se migra a bundler (6.4).

3.3 VALIDACIÓN DE ENTRADA (ambos lados)                        [HECHA]
    - express-validator en todas las rutas sensibles (login, creación de
      alumnos/profesores, CRUD de evaluaciones, resultados, recuperación de
      contraseña) con límites de longitud y control de tipos. Validación de
      cliente (required/patrones) y sanado de opciones.

3.4 RATE LIMITING EN API                                       [HECHA]
    - Limiter global en /api y limitador adicional en las rutas de login.

3.5 REFRESH TOKEN + ROTACIÓN DE TOKENS                         [HECHA]
    - Access token corto (15 min) + refresh token con rotación en cada uso
      (el refresh usado se invalida) y cierre de sesión por servidor.

3.6 AUDITORÍA / LOGS DE ACTIVIDAD                              [HECHA]
    - Registro de acciones (login, envío de evaluación, creación/eliminación
      de alumnos/profesores/evaluaciones, resets, recuperación de contraseña)
      con fecha y actor. Acotado a los últimos 500 registros. Visible en el
      panel admin.

================================================================================
4. EXPERIENCIA DE USUARIO (UX/UI)
================================================================================

4.1 TEMPORIZADOR EN LA EVALUACIÓN                              [HECHA]
    - Cuenta regresiva visible configurable por evaluación (duracionMinutos),
      aviso bajo 1 minuto y envío automático al agotarse el tiempo.

4.2 GUARDADO AUTOMÁTICO (borradores)                           [HECHA]
    - Autoguardado en sessionStorage (respuestas, orden y tiempo restante)
      cada 30 s y ante cambios; se retoma el intento al volver.

4.3 BARRA DE PROGRESO / MAPA DE PREGUNTAS                      [HECHA]
    - Barra de progreso + dots de navegación y botón "Primera sin responder".

4.4 MODO OSCURO                                                [HECHA]
    - Tema claro/oscuro persistente (localStorage) con botón en cada página.

4.5 MEJORES FEEDBACKS VISUALES (toasts)                        [HECHA]
    - Notificaciones toast en lugar de alert(); diálogos de confirmación
      reutilizables en lugar de confirm().

4.6 BÚSQUEDA Y FILTRADO                                        [HECHA]
    - Búsqueda en vivo de alumnos en el panel profesor y filtros por estado
      (todas/aprobadas/pendientes/desaprobadas) en el dashboard del alumno.

4.7 PAGINACIÓN                                                 [HECHA]
    - Paginación de la tabla de alumnos (10 por página) en el panel profesor.

4.8 MULTI-INSTITUCIÓN / MULTI-CURSO                            [FUTURO]
    - Requiere modelar cursos/comisiones y asignación por grupo. No incluido
      en esta iteración.

4.9 IMPRESIÓN/PDF DE RESULTADOS                                 [HECHA]
    - Vista imprimible del certificado y hoja de estilos de impresión para el
      resultado de la evaluación.

================================================================================
5. ACCESIBILIDAD
================================================================================

5.1 NAVEGACIÓN POR TECLADO Y ATRIBUTOS ARIA                    [HECHA]
    - Labels asociados, estados aria-pressed/aria-selected/role=tablist,
      foco visible (focus-visible), skip-link "saltar al contenido".

5.2 CONTRASTE Y TAMAÑO DE TEXTO                                [HECHA]
    - Contraste mejorado y selector de tamaño de letra (100/110/125%)
      persistente desplegable desde el dashboard.

5.3 LECTORES DE PANTALLA                                       [HECHA]
    - Alt del logo, elementos semánticos (main/nav/table/header/footer),
      títulos de tablas y descripciones.

================================================================================
6. RENDIMIENTO
================================================================================

6.1 CACHÉ DE ARCHIVOS ESTÁTICOS                                [HECHA]
    - express.static con maxAge en producción y etag.

6.2 MINIFICACIÓN DE CSS/JS                                     [HECHA]
    - npm run build genera public-dist/ con JS y CSS minificados (esbuild).
      En Vercel se sirve con SERVE_BUILT=1.

6.3 LEVANTAR MENOS DATOS EN CADA PETICIÓN                      [FUTURO]
    - Endpoints ya proyectan campos, pero con la migración a Postgres real
      conviene pasar de clave/valor a tablas relacionales y SQL específico.

6.4 CDN / FRONTEND MODERNO                                     [FUTURO]
    - Se mantiene frontend vanilla (rápido, sin framework). Migrar a React/
      Vue con Vite es viable a futuro y permitiría activar CSP completo.

================================================================================
7. MANTENIMIENTO / CALIDAD DE CÓDIGO
================================================================================

7.1 ESTRUCTURA DEL SERVIDOR                                    [HECHA]
    - Código organizado en: routes/, controllers/, middleware/, data/,
      utils/, config/ y scripts/.

7.2 VARIABLES DE ENTORNO                                       [HECHA]
    - .env.example completo con todas las variables documentadas.

7.3 TESTS AUTOMÁTICOS                                          [HECHA]
    - Jest + Supertest: 19 tests de integración (login, refresh, alumnos,
      CRUD evaluaciones, admin, flujo alumno completo con shuffle y
      certificado, agotamiento de intentos y recuperación de contraseña).

7.4 LINT / FORMAT                                              [HECHA]
    - ESLint (flat config) + Prettier con scripts npm run lint y npm run
      format.

7.5 DOCUMENTACIÓN DE LA API                                    [HECHA]
    - Spec OpenAPI en docs/openapi.json disponible en /api/docs.

7.6 PIPELINE CI/CD                                             [HECHA]
    - GitHub Actions: lint + test + build en cada push a main y PR.
    - Deploy automático de Vercel en cada push a main.

================================================================================
8. EXTRAS / A FUTURO
================================================================================

8.1 EGRESO de alumnos con ranking o insignias (gamificación).  [FUTURO]
8.2 AVISOS / CAMPAÑAS por email (recordar pendientes).          [EXTERNA]
    - Requiere proveedor de email (Resend/SendGrid) + cola de envíos.
8.3 CHAT / SOPORTE interno para dudas de alumnos.               [FUTURO]
8.4 APP móvil (PWA) para acceso desde el celular.               [HECHA]
    - manifest.json + service worker (cache offline del shell) + icono SVG;
      instalable desde Chrome/Android. iOS requiere empaquetado adicional.
8.5 MULTILENGUAJE (es/en) para expandir uso.                    [FUTURO]
8.6 PANEL DE ANÁLISIS avanzado (gráficos por evaluación).       [FUTURO]
    - Base lista: estadísticas por evaluación y exportación CSV.
8.7 RESPUESTAS DE LAS PREGUNTAS MEZCLADAS en cada intento.     [HECHA]
    - Orden de preguntas y opciones mezclado determinísticamente por intento,
      con el orden enviado al servidor para la corrección.
8.8 BANCO DE PREGUNTAS reutilizable entre evaluaciones.         [FUTURO]

================================================================================
PRÓXIMOS PASOS RECOMENDADOS (orden sugerido)
================================================================================
1. [PENDIENTE DE DEPLOY] Configurar Postgres real en Vercel (Storage) y las
   variables DATABASE_URL/JWT_SECRET/REFRESH_SECRET/ADMIN_PASSWORD/SERVE_BUILT.
2. Revisar la seguridad del login real (verificar captcha si se expone).
3. Email transaccional (8.2) para recordatorios y recuperación por correo.
4. Análisis avanzado (8.6) y banco de preguntas (8.8).
5. Si se migra el frontend a un framework (6.4), activar CSP completo.

================================================================================