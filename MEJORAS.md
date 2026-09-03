================================================================================
                MEJORAS PROPUESTAS - SISTEMA DE EVALUACIONES ITC
================================================================================
Fecha: septiembre 2026
Proyecto: ITC Evaluaciones (repo: https://github.com/KGA07/EvaluacionITC)
Stack actual: Node.js + Express 5, JWT, bcryptjs, almacenamiento en memoria/JSON,
              frontend vanilla (HTML/CSS/JS)

Este documento reúne mejoras ordenadas por prioridad. Están pensadas para
escalar el sistema desde su versión actual (demo) hacia producción real.

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

1.1 PERSISTENCIA DE DATOS (la más importante)
    - Actual: los datos (alumnos, resultados) viven en memoria con un archivo
      db.json local. En Vercel esto es efímero: se pierde en cada cold start y
      las instancias no comparten datos.
    - Mejora: migrar a una base de datos real.
      Opciones:
        a) Vercel Postgres (Neon/Postgres) - recomendado, sin costo inicial.
        b) MongoDB Atlas.
        c) MySQL (Clever Cloud / PlanetScale).
    - Impacto: alumnos y resultados persistentes entre sesiones y usuarios.

1.2 VARIABLES DE ENTORNO / SECRETOS
    - Actual: JWT_SECRET hardcodeado en server.js.
    - Mejora: usar variables de entorno (.env o panel de Vercel) para
      JWT_SECRET, credenciales de BD, etc. Nunca commitear secretos.

================================================================================
2. FUNCIONALIDAD CORE (de alto valor)
================================================================================

2.1 CRUD DE EVALUACIONES (profesor)
    - Actual: las 6 evaluaciones y sus 60 preguntas están fijas en el código de
      seed. El profesor no puede editarlas.
    - Mejora: permitir al profesor crear/editar/eliminar evaluaciones, editar
      preguntas y opciones, marcar respuestas correctas, configurar nº de
      intentos y porcentaje de aprobación por evaluación.

2.2 ADMINISTRADOR PRINCIPAL
    - Actual: solo existe un tipo de "profesor".
    - Mejora: rol "admin" que gestione profesores, vea estadísticas globales y
      configure parámetros del sistema.

2.3 EDICIÓN DE PERFIL / RECUPERAR CONTRASEÑA
    - Mejora: que el alumno pueda cambiar su propia contraseña y recuperarla
      por email o pregunta secreta.

2.4 FEEDBACK DESPUÉS DE CADA EVALUACIÓN
    - Actual: se muestra solo nota aprobado/desaprobado.
    - Mejora: vista detallada con las respuestas correctas/incorrectas y
      explicación breve de cada pregunta (para retroalimentar al alumno).

2.5 SEGUIMIENTO A LO LARGO DEL TIEMPO
    - Mejora: historial de intentos por alumno con fechas, curva de progreso y
      reinicio controlado de intentos por parte del profesor.

2.6 EXPORTACIÓN DE DATOS
    - Mejora: exportar estadísticas y listados a CSV/Excel/PDF desde el panel
      del profesor (calificaciones, asistencia, rendimiento).

2.7 CERTIFICADOS / CONSTANCIAS
    - Mejora: generar un certificado de aprobación descargable en PDF con el
      nombre del alumno, evaluación y fecha, al aprobar cada capacitación o al
      completar todas.

================================================================================
3. SEGURIDAD
================================================================================

3.1 LÍMITE DE INTENTOS DE LOGIN (anti fuerza bruta)
    - Actual: el login se puede intentar indefinidamente.
    - Mejora: bloquear temporalmente tras N intentos fallidos + captcha si es
      necesario.

3.2 SEGURIDAD EN CABECERAS HTTP
    - Mejora: agregar helmet (CSP, X-Frame-Options, nosniff, etc.).

3.3 VALIDACIÓN DE ENTRADA (ambos lados)
    - Actual: validación básica en el server.
    - Mejora: validar y sanear todos los inputs (server y cliente), limitar
      longitud, controlar tipos. Usar una librería como Joi o express-validator.

3.4 RATE LIMITING EN API
    - Mejora: limitar peticiones por IP/usuario en rutas sensibles.

3.5 REFRESH TOKEN + ROTACIÓN DE TOKENS
    - Actual: token JWT único con expiración de 8 h.
    - Mejora: implementar access token corto + refresh token para mayor
      seguridad y mejor UX.

3.6 AUDITORÍA / LOGS DE ACTIVIDAD
    - Mejora: registrar eventos (login, creación, eliminación, envío de
      evaluación) para trazabilidad.

================================================================================
4. EXPERIENCIA DE USUARIO (UX/UI)
================================================================================

4.1 TEMPORIZADOR EN LA EVALUACIÓN
    - Mejora: límite de tiempo por evaluación con cuenta regresiva visible y
      envío automático al agotarse.

4.2 GUARDADO AUTOMÁTICO (borradores)
    - Mejora: autoguardar respuestas ante pérdida de conexión o cierre
      accidental, para retomar el intento.

4.3 BARRA DE PROGRESO / MAPA DE PREGUNTAS
    - Actual: ya hay dots de navegación.
    - Mejora: mostrar mini-mapa con preguntas respondidas/pendientes y botón
      "Ir a la primera pregunta sin responder".

4.4 MODO OSCURO
    - Mejora: tema claro/oscuro persistente según preferencia del usuario.

4.5 MEJORES FEEDBACKS VISUALES (toasts)
    - Mejora: sustituir alert() y confirm() por notificaciones toast elegantes.

4.6 BÚSQUEDA Y FILTRADO
    - Mejora: buscar alumnos por nombre/usuario en el panel profesor; filtrar
      evaluaciones por estado (pendiente/aprobada/desaprobada).

4.7 PAGINACIÓN
    - Mejora: paginar tablas de alumnos y resultados cuando haya muchos
      registros.

4.8 MULTI-INSTITUCIÓN / MULTI-CURSO
    - Mejora: organizar por cursos/comisiones y asignar evaluaciones por grupo.

4.9 IMPRESIÓN/PDF DE RESULTADOS
    - Mejora: vista imprimible del resultado final.

================================================================================
5. ACCESIBILIDAD
================================================================================

5.1 NAVEGACIÓN POR TECLADO Y ATRIBUTOS ARIA
    - Mejora: roles, labels asociados, foco visible, navegación con Tab.

5.2 CONTRASTE Y TAMAÑO DE TEXTO
    - Mejora: verificar contraste AA, permitir ajuste de tamaño de letra.

5.3 LECTORES DE PANTALLA
    - Mejora: texto alternativo adecuado en imágenes (incluido el logo) y
      elementos semánticos correctos.

================================================================================
6. RENDIMIENTO
================================================================================

6.1 CACHÉ DE ARCHIVOS ESTÁTICOS
    - Mejora: cachear CSS/JS/imágenes con cabeceras de caché.

6.2 MINIFICACIÓN DE CSS/JS
    - Mejora: minificar y versionar assets.

6.3 LEVANTAR MENOS DATOS EN CADA PETICIÓN
    - Mejora: endpoints específicos y proyecciones de campos; evitar cargar
      toda la base de datos en memoria en cada request.

6.4 CDN / FRONTEND MODERNO
    - Mejora: opcionalmente migrar el frontend a un framework (React/Vue) o
      mantener vanilla pero con bundler (Vite) y código modular.

================================================================================
7. MANTENIMIENTO / CALIDAD DE CÓDIGO
================================================================================

7.1 ESTRUCTURA DEL SERVIDOR
    - Mejora: separar en carpetas: routes/, controllers/, models/, services/,
      middleware/ en lugar de todo en server.js.

7.2 VARIABLES DE ENTORNO
    - Mejora: crear .env.example con las variables documentadas.

7.3 TESTS AUTOMÁTICOS
    - Mejora: tests unitarios (rutas API) y de integración (flujo completo
      alumno). Ej: Jest + Supertest.

7.4 LINT / FORMAT
    - Mejora: agregar ESLint + Prettier y scripts en package.json.

7.5 DOCUMENTACIÓN DE LA API
    - Mejora: documentar endpoints (Swagger/OpenAPI) para facilitar desarrollo.

7.6 PIPELINE CI/CD
    - Mejora: GitHub Actions para correr tests y lints antes de desplegar;
      previews de Vercel para cada PR.

================================================================================
8. EXTRAS / A FUTURO
================================================================================

8.1 EGRESO de alumnos con ranking o insignias (gamificación).
8.2 AVISOS / CAMPAÑAS por email (recordar evaluaciones pendientes).
8.3 CHAT / SOPORTE interno para dudas de alumnos.
8.4 APP móvil (PWA) para acceso desde el celular con instalación.
8.5 MULTILENGUAJE (es/en) para expandir uso.
8.6 PANEL DE ANÁLISIS avanzado (gráficos por evaluación, tendencias).
8.7 RESPUESTAS DE LAS PREGUNTAS MEZCLADAS aleatoriamente en cada intento.
8.8 BANCO DE PREGUNTAS reutilizable entre evaluaciones.

================================================================================
PRÓXIMOS PASOS RECOMENDADOS (orden sugerido)
================================================================================
1. Migrar a base de datos persistente (1.1) -> base para todo lo demás.
2. Mover secretos a variables de entorno (1.2).
3. CRUD de evaluaciones (2.1) y feedback detallado (2.4).
4. Seguridad: helmet + rate limiting + validación (3.x).
5. Temporizador y autoguardado (4.x).
6. Tests y estructura de código (7.x).

================================================================================
