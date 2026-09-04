const token = Session.getToken();
const tipo = Session.getTipo();

if (!token || (tipo !== 'profesor' && tipo !== 'admin')) window.location.replace('/');
const isAdmin = tipo === 'admin';

const nombre = sessionStorage.getItem('nombre') || 'Profesor';
document.getElementById('userName').textContent = nombre;
document.getElementById('userInitial').textContent =
  (sessionStorage.getItem('nombre_completo') || nombre)[0]?.toUpperCase() || 'P';
document.getElementById('userRole').textContent = isAdmin ? 'Administrador' : 'Instructor';
document.getElementById('welcomeTitle').textContent = isAdmin ? 'Panel de Administracion' : 'Panel de Instructor';
document.getElementById('statsBar').style.display = isAdmin ? 'none' : '';

document.querySelectorAll('.admin-only').forEach((el) => {
  if (isAdmin) el.classList.remove('hidden');
});

document.getElementById('btnLogout')?.addEventListener('click', logout);

// ── Tema ─────────────────────────────────────────────────────────────────────
document.getElementById('themeToggle').textContent = Theme.get() === 'dark' ? 'Claro' : 'Oscuro';
document.getElementById('themeToggle').addEventListener('click', () => {
  Theme.toggle();
  document.getElementById('themeToggle').textContent = Theme.get() === 'dark' ? 'Claro' : 'Oscuro';
});

// ── Vista listener ───────────────────────────────────────────────────────────
document.getElementById('userMenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('accountDropdown').classList.toggle('open');
});
document.addEventListener('click', () => document.getElementById('accountDropdown').classList.remove('open'));

let allData = null;
let searchTerm = '';
let alumnosPage = 1;
const PAGE_SIZE = 10;

// ── View switching ─────────────────────────────────────────────────────────
function showView(name) {
  document.getElementById('viewAlumnos').classList.toggle('hidden', name !== 'alumnos');
  document.getElementById('viewEvaluaciones').classList.toggle('hidden', name !== 'evaluaciones');
  document.getElementById('viewEstadisticas').classList.toggle('hidden', name !== 'estadisticas');
  document.getElementById('viewDetalle').classList.toggle('hidden', name !== 'detalle');
  document.getElementById('viewAdmin').classList.toggle('hidden', name !== 'admin');
  if (name !== 'detalle')
    document.querySelectorAll('.cap-item').forEach((i) => i.classList.toggle('active', i.dataset.view === name));
}

document.querySelectorAll('.cap-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.cap-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
    showView(item.dataset.view);
    if (item.dataset.view === 'estadisticas') renderEstadisticas(allData.stats);
    if (item.dataset.view === 'alumnos') {
      searchTerm = '';
      document.getElementById('searchAlumno').value = '';
      alumnosPage = 1;
      renderAlumnosTable(allData.alumnosDetalle);
    }
    if (item.dataset.view === 'evaluaciones') loadEvaluaciones();
    if (item.dataset.view === 'admin') loadAdmin();
  });
});

// Búsqueda en vivo
document.getElementById('searchAlumno').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  alumnosPage = 1;
  renderAlumnosTable(allData.alumnosDetalle);
});

// ── Load data ──────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await apiFetch('/profesor/estadisticas');
    if (res.status === 401 || res.status === 403) {
      Session.clear();
      window.location.replace('/');
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));

    allData = data;
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('profContent').classList.remove('hidden');
    renderStatsBar(data);
    renderAlumnosTable(data.alumnosDetalle);
    renderEstadisticas(data.stats);
    loadEvaluaciones();
    if (isAdmin) loadAdmin();
  } catch (err) {
    document.getElementById('loadingState').innerHTML =
      `<div class="loading-container"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

function renderStatsBar(data) {
  const aprobados = data.alumnosDetalle.reduce((sum, a) => sum + a.evaluaciones.filter((e) => e.aprobado).length, 0);
  const pendientes = data.alumnosDetalle.reduce(
    (sum, a) => sum + a.evaluaciones.filter((e) => e.estado === 'Pendiente').length,
    0
  );
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card"><div class="stat-icon indigo">&#128101;</div><div><div class="stat-number">${data.totalAlumnos}</div><div class="stat-label">Alumnos</div></div></div>
    <div class="stat-card"><div class="stat-icon green">&#10003;</div><div><div class="stat-number">${aprobados}</div><div class="stat-label">Aprobaciones</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">&#9203;</div><div><div class="stat-number">${pendientes}</div><div class="stat-label">Pendientes</div></div></div>
  `;
}

function renderAlumnosTable(alumnos) {
  const filtrados = searchTerm
    ? alumnos.filter(
        (a) =>
          (a.nombre_completo || '').toLowerCase().includes(searchTerm) ||
          (a.nombre || '').toLowerCase().includes(searchTerm)
      )
    : alumnos;

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  if (alumnosPage > totalPages) alumnosPage = totalPages;
  const slice = filtrados.slice((alumnosPage - 1) * PAGE_SIZE, alumnosPage * PAGE_SIZE);

  const tbody = document.getElementById('alumnosBody');
  if (slice.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:30px;">No se encontraron alumnos.</td></tr>';
    document.getElementById('alumnosPagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = slice
    .map(
      (a) => `
    <tr>
      <td class="td-nombre">${escapeHtml(a.nombre_completo)}</td>
      <td class="td-usuario">${escapeHtml(a.nombre)}</td>
      <td>
        <div class="inline-actions">
          <button class="btn-sm" onclick="verDetalle(${a.id})">Detalle / Reset</button>
          <button class="btn-sm" onclick="changePassword(${a.id})">Contrasena</button>
          <button class="btn-sm danger" onclick="deleteStudent(${a.id}, '${escapeHtml(a.nombre)}')">Eliminar</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');

  document.getElementById('alumnosPagination').innerHTML =
    totalPages > 1
      ? Array.from(
          { length: totalPages },
          (_, i) =>
            `<button type="button" class="page-btn ${i + 1 === alumnosPage ? 'active' : ''}" onclick="goPage(${i + 1})">${i + 1}</button>`
        ).join('')
      : '';
}

function goPage(n) {
  alumnosPage = n;
  renderAlumnosTable(allData.alumnosDetalle);
}

function renderEstadisticas(stats) {
  const container = document.getElementById('viewEstadisticas');
  container.innerHTML = `
    <div class="section-header"><h2 class="section-title">Estadisticas por Evaluacion</h2></div>
    <div class="eval-stats-grid">
      ${stats
        .map(
          (s) => `
        <div class="eval-stat-card">
          <h3>${escapeHtml(s.capacitacion)}</h3>
          <div class="eval-stat-row"><span class="label">Total alumnos</span><span class="value">${s.totalAlumnos}</span></div>
          <div class="eval-stat-row"><span class="label">Rindieron</span><span class="value">${s.alumnosRindieron}</span></div>
          <div class="eval-stat-row"><span class="label">Aprobados</span><span class="value" style="color:var(--success)">${s.aprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Desaprobados</span><span class="value" style="color:var(--error)">${s.desaprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Pendientes</span><span class="value" style="color:var(--warning)">${s.pendientes}</span></div>
          <div class="eval-stat-row"><span class="label">Minimo aprobar</span><span class="value">${s.minAprobar}/${s.totalPreguntas} (${s.porcentaje}%)</span></div>
          <div class="eval-stat-row"><span class="label">Promedio</span><span class="value">${s.promedio > 0 ? s.promedio : '-'}</span></div>
          <button class="btn-sm" style="margin-top:12px;width:100%;justify-content:center;" onclick="exportarCSV(${s.evaluacionId}, '${escapeHtml(s.capacitacion)}')">Exportar CSV</button>
        </div>
      `
        )
        .join('')}
    </div>`;
}

// ── Detalle alumno / reset intentos / ver intento ─────────────────────────────
function verDetalle(alumnoId) {
  const a = allData.alumnosDetalle.find((x) => x.id === alumnoId);
  if (!a) return;
  document.getElementById('detalleTitle').textContent = `Detalle: ${a.nombre_completo}`;
  document.getElementById('detalleContainer').innerHTML = `
    <table>
      <thead><tr><th>Evaluacion</th><th>Intentos</th><th>Mejor</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        ${a.evaluaciones
          .map(
            (ev) => `
          <tr>
            <td>${escapeHtml(ev.capacitacion)}</td>
            <td>${ev.intentos}/${ev.intentosMax}</td>
            <td>${ev.mejorPuntaje !== null ? ev.mejorPuntaje : '-'}</td>
            <td><span class="badge-table ${ev.aprobado ? 'aprobado' : ev.estado === 'Desaprobado' ? 'desaprobado' : 'pendiente'}">${ev.estado}</span></td>
            <td>
              <div class="inline-actions">
                <button class="btn-sm" onclick="resetIntentos(${a.id}, ${ev.evaluacionId}, '${escapeHtml(ev.capacitacion)}')">Reset</button>
                ${ev.historia.length > 0 ? `<button class="btn-sm" onclick="verHistoria(${a.id}, ${ev.evaluacionId})">Historia (${ev.historia.length})</button>` : ''}
              </div>
            </td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
  showView('detalle');
}

function verHistoria(alumnoId, evaluacionId) {
  const a = allData.alumnosDetalle.find((x) => x.id === alumnoId);
  const ev = a.evaluaciones.find((e) => e.evaluacionId === evaluacionId);
  const ordenados = ev.historia.slice().sort((x, y) => new Date(x.fecha) - new Date(y.fecha));
  document.getElementById('detalleContainer').insertAdjacentHTML(
    'beforeend',
    `
    <div id="historiaBlock" class="table-card" style="margin-top:14px;">
      <h3 style="font-size:.95rem;font-weight:700;margin-bottom:10px;">Historia de intentos - ${escapeHtml(ev.capacitacion)}</h3>
      ${ordenados
        .map(
          (h, idx) => `
        <div class="log-entry" style="cursor:pointer;" onclick="verIntento(${h.id})" title="Ver detalle del intento">
          <span class="log-accion">Intento ${idx + 1}</span>
          <span class="log-user">${h.puntaje}/${h.total} ${h.aprobado ? '(Aprobado)' : '(Desaprobado)'}</span>
          <span class="log-date">${formatFecha(h.fecha)}</span>
        </div>`
        )
        .join('')}
    </div>`
  );
  document.getElementById('historiaBlock').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function verIntento(intentoId) {
  try {
    const res = await apiFetch(`/profesor/intentos/${intentoId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));

    const i = data.intento;
    document.getElementById('intentoTitle').textContent = `Intento de ${i.alumno}`;
    document.getElementById('intentoMeta').textContent =
      `${i.capacitacion} - Puntaje ${i.puntaje}/${i.totalPreguntas} (${i.aprobado ? 'Aprobado' : 'Desaprobado'}) - ${formatFecha(i.fecha)}`;
    document.getElementById('intentoDetalle').innerHTML = i.detalle
      .map((d, qi) => {
        const letras = ['A', 'B', 'C', 'D'];
        return `
        <div class="detalle-item">
          <div class="detalle-q">
            <span class="detalle-num">${qi + 1}.</span>
            <span class="detalle-state ${d.esCorrecta ? 'ok' : 'bad'}">${d.esCorrecta ? '&#10003; Correcta' : '&#10007; Incorrecta'}</span>
          </div>
          <div class="detalle-pregunta">${escapeHtml(d.pregunta)}</div>
          <div class="detalle-respuestas">
            ${d.opciones
              .map((op, oi) => {
                const isCorrect = oi === d.correcta;
                const isUser = oi === d.respondida;
                let cls = 'detalle-opt';
                if (isCorrect) cls += ' correct';
                if (isUser && !isCorrect) cls += ' wrong';
                return `<div class="${cls}">${letras[oi]}. ${escapeHtml(op)} ${isCorrect ? '(correcta)' : ''} ${isUser && isCorrect ? '(tu respuesta)' : ''}</div>`;
              })
              .join('')}
          </div>
          ${d.explicacion ? `<div class="detalle-explicacion"><strong>Explicacion:</strong> ${escapeHtml(d.explicacion)}</div>` : ''}
        </div>`;
      })
      .join('');
    document.getElementById('intentoModal').classList.add('visible');
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

document.getElementById('btnIntentoClose').addEventListener('click', () => {
  document.getElementById('intentoModal').classList.remove('visible');
});

async function resetIntentos(alumnoId, evaluacionId, capacitacion) {
  const confirmar = await showConfirm({
    title: 'Resetear intentos?',
    message: `Se eliminaran todos los intentos del alumno en "${capacitacion}". Esta accion no se puede deshacer.`,
    confirmText: 'Resetear',
    danger: true
  });
  if (!confirmar) return;
  try {
    const res = await apiFetch(`/profesor/alumnos/${alumnoId}/evaluaciones/${evaluacionId}/reset`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    toast(data.mensaje || 'Intentos reiniciados.', 'success');
    loadData();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Exportar CSV ───────────────────────────────────────────────────────────
async function exportarCSV(evalId, capacitacion) {
  try {
    const res = await apiFetch(`/profesor/exportar/${evalId}`);
    if (!res.ok) throw new Error('Error al exportar');
    const nombreArchivo = `resultados_${(capacitacion || evalId).replace(/[^a-z0-9]+/gi, '_')}.csv`;
    await downloadFromResponse(res, nombreArchivo);
    toast('Archivo descargado.', 'success');
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Modal: Crear alumno ────────────────────────────────────────────────────
const modalOverlay = document.getElementById('modalOverlay');
const studentForm = document.getElementById('studentForm');
const modalError = document.getElementById('modalError');
const modalErrorText = document.getElementById('modalErrorText');

document.getElementById('btnNewStudent').addEventListener('click', () => {
  studentForm.reset();
  modalError.classList.remove('visible');
  document.getElementById('modalTitle').textContent = 'Nuevo Alumno';
  document.getElementById('btnModalSave').textContent = 'Crear Alumno';
  modalOverlay.classList.add('visible');
});

document.getElementById('btnModalCancel').addEventListener('click', () => {
  modalOverlay.classList.remove('visible');
});

studentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  modalError.classList.remove('visible');

  const nombre_completo = document.getElementById('studentNombre').value.trim();
  const nombre = document.getElementById('studentUsuario').value.trim();
  const password = document.getElementById('studentPassword').value.trim();

  if (!nombre_completo || !nombre || !password) {
    modalErrorText.textContent = 'Completa todos los campos.';
    modalError.classList.add('visible');
    return;
  }

  try {
    const res = await apiFetch('/profesor/alumnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, password, nombre_completo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    modalOverlay.classList.remove('visible');
    toast('Alumno creado correctamente.', 'success');
    loadData();
  } catch (err) {
    modalErrorText.textContent = err.message;
    modalError.classList.add('visible');
  }
});

// ── Delete student ─────────────────────────────────────────────────────────
async function deleteStudent(id, nombre) {
  const confirmar = await showConfirm({
    title: `Eliminar a "${nombre}"?`,
    message: 'Esta accion no se puede deshacer. Se eliminaran sus evaluaciones y resultados.',
    confirmText: 'Eliminar',
    danger: true
  });
  if (!confirmar) return;
  try {
    const res = await apiFetch(`/profesor/alumnos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    toast('Alumno eliminado.', 'success');
    loadData();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Change password alumno ──────────────────────────────────────────────────
const pwModal = document.getElementById('passwordModal');
const pwForm = document.getElementById('passwordForm');
const pwError = document.getElementById('pwModalError');
const pwErrorText = document.getElementById('pwModalErrorText');

function changePassword(id) {
  document.getElementById('passwordUserId').value = id;
  document.getElementById('newPassword').value = '';
  pwError.classList.remove('visible');
  pwModal.classList.add('visible');
}

document.getElementById('btnPwCancel').addEventListener('click', () => pwModal.classList.remove('visible'));

pwForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  pwError.classList.remove('visible');
  const id = parseInt(document.getElementById('passwordUserId').value);
  const password = document.getElementById('newPassword').value.trim();
  if (!password) {
    pwErrorText.textContent = 'Ingresa la nueva contrasena.';
    pwError.classList.add('visible');
    return;
  }
  try {
    const res = await apiFetch(`/profesor/alumnos/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    pwModal.classList.remove('visible');
    toast('Contrasena actualizada.', 'success');
  } catch (err) {
    pwErrorText.textContent = err.message;
    pwError.classList.add('visible');
  }
});

// ── Botón volver a lista desde detalle ───────────────────────────────────────
document.getElementById('btnVolverLista').addEventListener('click', () => {
  document.getElementById('historiaBlock')?.remove();
  showView('alumnos');
});

// ── Gestionar Evaluaciones ───────────────────────────────────────────────────
let evalsList = [];

async function loadEvaluaciones() {
  const container = document.getElementById('evalList');
  container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div></div>';
  try {
    const res = await apiFetch('/profesor/evaluaciones');
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    evalsList = data.evaluaciones;
    container.innerHTML =
      evalsList
        .map(
          (ev) => `
      <div class="eval-stat-card">
        <h3>${escapeHtml(ev.capacitacion)}</h3>
        ${ev.titulo && ev.titulo !== `Evaluacion ${ev.capacitacion}` ? `<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px;">${escapeHtml(ev.titulo)}</div>` : ''}
        <div class="eval-stat-row"><span class="label">Preguntas</span><span class="value">${ev.totalPreguntas}</span></div>
        <div class="eval-stat-row"><span class="label">Intentos</span><span class="value">${ev.intentosMax}</span></div>
        <div class="eval-stat-row"><span class="label">Aprobar con</span><span class="value">${ev.porcentaje}%</span></div>
        <div class="eval-stat-row"><span class="label">Duracion</span><span class="value">${ev.duracionMinutos} min</span></div>
        <div class="eval-stat-row"><span class="label">Intentos realizados</span><span class="value">${ev.totalIntentos}</span></div>
        <div class="eval-stat-row"><span class="label">Alumnos aprobados</span><span class="value" style="color:var(--success)">${ev.aprobados}</span></div>
        <div class="eval-stat-row"><span class="label">Estado</span>
          <span class="eval-status-badge ${ev.activa ? 'status-disponible' : 'status-cerrada'}">${ev.activa ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div class="inline-actions" style="margin-top:12px;justify-content:center;">
          <button class="btn-sm" onclick="editarEvaluacion(${ev.id})">Editar</button>
          <button class="btn-sm" onclick="toggleEvaluacion(${ev.id})">${ev.activa ? 'Desactivar' : 'Activar'}</button>
          <button class="btn-sm" onclick="exportarCSV(${ev.id}, '${escapeHtml(ev.capacitacion)}')">CSV</button>
          <button class="btn-sm danger" onclick="eliminarEvaluacion(${ev.id}, '${escapeHtml(ev.capacitacion)}')">Eliminar</button>
        </div>
      </div>`
        )
        .join('') || '<p style="color:var(--text-muted);text-align:center;">No hay evaluaciones creadas.</p>';
  } catch (err) {
    container.innerHTML = `<p style="color:var(--error);text-align:center;padding:20px;">${err.message}</p>`;
  }
}

const evalModal = document.getElementById('evalModal');
const evalForm = document.getElementById('evalForm');
const evalError = document.getElementById('evalError');

document.getElementById('btnNewEval').addEventListener('click', () => {
  evalForm.reset();
  document.getElementById('evalActiva').checked = true;
  document.getElementById('evalIntentos').value = 3;
  document.getElementById('evalPorcentaje').value = 60;
  document.getElementById('evalDuracion').value = 15;
  document.getElementById('evalPreguntas').value = '';
  document.getElementById('evalIdHidden').value = '';
  document.getElementById('evalModalTitle').textContent = 'Nueva Evaluacion';
  document.getElementById('btnEvalSave').textContent = 'Crear Evaluacion';
  evalError.classList.remove('visible');
  evalModal.classList.add('visible');
});

document.getElementById('btnEvalCancel').addEventListener('click', () => evalModal.classList.remove('visible'));

function editarEvaluacion(id) {
  const ev = evalsList.find((x) => x.id === id);
  if (!ev) return;
  document.getElementById('evalCapacitacion').value = ev.capacitacion;
  document.getElementById('evalTitulo').value =
    ev.titulo && ev.titulo !== `Evaluacion ${ev.capacitacion}` ? ev.titulo : '';
  document.getElementById('evalIntentos').value = ev.intentosMax;
  document.getElementById('evalPorcentaje').value = ev.porcentaje;
  document.getElementById('evalDuracion').value = ev.duracionMinutos;
  document.getElementById('evalActiva').checked = ev.activa !== false;
  document.getElementById('evalIdHidden').value = id;
  document.getElementById('evalModalTitle').textContent = 'Editar Evaluacion';
  document.getElementById('btnEvalSave').textContent = 'Guardar cambios';
  evalError.classList.remove('visible');
  fetchEvaluacionParaEditar(id);
}

async function fetchEvaluacionParaEditar(id) {
  document.getElementById('evalPreguntas').value = 'Cargando preguntas...';
  try {
    const res = await apiFetch(`/profesor/evaluaciones/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    document.getElementById('evalPreguntas').value = JSON.stringify(data.preguntas, null, 2);
    evalModal.classList.add('visible');
  } catch (err) {
    evalErrorText.textContent = err.message;
    evalError.classList.add('visible');
  }
}

evalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  evalError.classList.remove('visible');
  const id = document.getElementById('evalIdHidden').value;

  let preguntas;
  try {
    preguntas = JSON.parse(document.getElementById('evalPreguntas').value);
  } catch {
    evalErrorText.textContent = 'El JSON de preguntas no es valido. Verifica las comillas y comas.';
    evalError.classList.add('visible');
    return;
  }
  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    evalErrorText.textContent = 'Agrega al menos una pregunta.';
    evalError.classList.add('visible');
    return;
  }
  for (const p of preguntas) {
    if (!p.pregunta || !Array.isArray(p.opciones) || p.opciones.length < 2 || typeof p.correcta !== 'number') {
      evalErrorText.textContent =
        'Cada pregunta necesita: pregunta (texto), opciones (array >= 2) y correcta (indice numerico).';
      evalError.classList.add('visible');
      return;
    }
  }

  const payload = {
    capacitacion: document.getElementById('evalCapacitacion').value.trim(),
    titulo: document.getElementById('evalTitulo').value.trim(),
    intentosMax: parseInt(document.getElementById('evalIntentos').value, 10),
    porcentaje: parseInt(document.getElementById('evalPorcentaje').value, 10),
    duracionMinutos: parseInt(document.getElementById('evalDuracion').value, 10),
    activa: document.getElementById('evalActiva').checked,
    preguntas
  };

  try {
    const res = await apiFetch(id ? `/profesor/evaluaciones/${id}` : '/profesor/evaluaciones', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    evalModal.classList.remove('visible');
    toast(id ? 'Evaluacion actualizada.' : 'Evaluacion creada.', 'success');
    loadEvaluaciones();
  } catch (err) {
    evalErrorText.textContent = err.message;
    evalError.classList.add('visible');
  }
});

async function toggleEvaluacion(id) {
  const ev = evalsList.find((x) => x.id === id);
  try {
    const res = await apiFetch(`/profesor/evaluaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa: !(ev && ev.activa !== false) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    toast('Estado actualizado.', 'success');
    loadEvaluaciones();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

async function eliminarEvaluacion(id, capacitacion) {
  const confirmar = await showConfirm({
    title: `Eliminar "${capacitacion}"?`,
    message: 'Se eliminaran la evaluacion y todos los intentos asociados. Esta accion no se puede deshacer.',
    confirmText: 'Eliminar',
    danger: true
  });
  if (!confirmar) return;
  try {
    const res = await apiFetch(`/profesor/evaluaciones/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    toast('Evaluacion eliminada.', 'success');
    loadEvaluaciones();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Panel Admin ──────────────────────────────────────────────────────────────
async function loadAdmin() {
  try {
    const [statsRes, profsRes, logsRes] = await Promise.all([
      apiFetch('/admin/estadisticas'),
      apiFetch('/admin/profesores'),
      apiFetch('/admin/logs')
    ]);
    if (!statsRes.ok || !profsRes.ok || !logsRes.ok) throw new Error('Error al cargar datos de administracion');

    const stats = await statsRes.json();
    renderAdminStats(stats);
    renderProfesores((await profsRes.json()).profesores);
    renderLogs((await logsRes.json()).logs);
  } catch (err) {
    document.getElementById('adminStats').innerHTML =
      `<p style="color:var(--error);text-align:center;padding:20px;">${err.message}</p>`;
  }
}

function renderAdminStats(s) {
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card admin-stat"><div class="stat-icon indigo">&#128101;</div><div><div class="stat-number">${s.alumnos}</div><div class="stat-label">Alumnos</div></div></div>
    <div class="stat-card admin-stat"><div class="stat-icon blue">&#128188;</div><div><div class="stat-number">${s.profesores}</div><div class="stat-label">Profesores</div></div></div>
    <div class="stat-card admin-stat"><div class="stat-icon green">&#128218;</div><div><div class="stat-number">${s.evaluaciones}</div><div class="stat-label">Evaluaciones</div></div></div>
    <div class="stat-card admin-stat"><div class="stat-icon orange">&#128221;</div><div><div class="stat-number">${s.intentosTotales}</div><div class="stat-label">Intentos</div></div></div>
    <div class="stat-card admin-stat"><div class="stat-icon green">&#10003;</div><div><div class="stat-number">${s.aprobaciones}</div><div class="stat-label">Aprobaciones</div></div></div>
    <div class="stat-card admin-stat"><div class="stat-icon gray">&#128203;</div><div><div class="stat-number">${s.registrosAuditoria}</div><div class="stat-label">Registros</div></div></div>
  `;
}

function renderProfesores(profesores) {
  document.getElementById('profesoresBody').innerHTML =
    profesores
      .map(
        (p) => `
    <tr>
      <td class="td-nombre">${escapeHtml(p.nombre_completo)}</td>
      <td class="td-usuario">${escapeHtml(p.nombre)}</td>
      <td>
        <div class="inline-actions">
          <button class="btn-sm" onclick="changeProfPassword(${p.id})">Contrasena</button>
          <button class="btn-sm danger" onclick="deleteProfesor(${p.id}, '${escapeHtml(p.nombre)}')">Eliminar</button>
        </div>
      </td>
    </tr>`
      )
      .join('') ||
    '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">No hay profesores.</td></tr>';
}

function renderLogs(logs) {
  const acciones = {
    login: 'Login',
    envio_evaluacion: 'Envio evaluacion',
    crear_alumno: 'Crear alumno',
    eliminar_alumno: 'Eliminar alumno',
    cambio_password: 'Cambio password',
    cambio_password_alumno: 'Password alumno',
    reset_intentos: 'Reset intentos',
    crear_evaluacion: 'Crear evaluacion',
    editar_evaluacion: 'Editar evaluacion',
    eliminar_evaluacion: 'Eliminar evaluacion',
    crear_profesor: 'Crear profesor',
    eliminar_profesor: 'Eliminar profesor',
    recuperar_contrasena: 'Recupero contrasena',
    recuperar_contrasena_ok: 'Recupero OK',
    configurar_pregunta_secreta: 'Pregunta secreta',
    logout: 'Logout',
    cambio_password_profesor: 'Password profesor'
  };
  document.getElementById('logsContainer').innerHTML =
    logs.length === 0
      ? '<p style="color:var(--text-muted);text-align:center;padding:20px;">Sin actividad registrada aun.</p>'
      : `<div>${logs
          .map(
            (l) => `
        <div class="log-entry">
          <span class="log-accion">${acciones[l.accion] || l.accion}</span>
          <span class="log-user">${escapeHtml(l.actor?.nombre_completo || l.actor?.nombre || 'sistema')}</span>
          <span class="log-date">${formatFecha(l.fecha)}</span>
        </div>`
          )
          .join('')}</div>`;
}

// ── Admin: crear profesor ────────────────────────────────────────────────────
const profModal = document.getElementById('profesorModal');
document.getElementById('btnNewProfesor').addEventListener('click', () => {
  document.getElementById('profesorForm').reset();
  document.getElementById('profError').classList.remove('visible');
  profModal.classList.add('visible');
});
document.getElementById('btnProfCancel').addEventListener('click', () => profModal.classList.remove('visible'));

document.getElementById('profesorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('profError');
  const errText = document.getElementById('profErrorText');
  err.classList.remove('visible');
  const nombre_completo = document.getElementById('profNombre').value.trim();
  const nombre = document.getElementById('profUsuario').value.trim();
  const password = document.getElementById('profPassword').value.trim();
  if (!nombre_completo || !nombre || !password) {
    errText.textContent = 'Completa todos los campos.';
    err.classList.add('visible');
    return;
  }
  try {
    const res = await apiFetch('/admin/profesores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, password, nombre_completo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    profModal.classList.remove('visible');
    toast('Profesor creado.', 'success');
    loadAdmin();
  } catch (err2) {
    errText.textContent = err2.message;
    err.classList.add('visible');
  }
});

// ── Admin: password / eliminar profesor ──────────────────────────────────────
const profPwModal = document.getElementById('profPasswordModal');
function changeProfPassword(id) {
  document.getElementById('profPasswordId').value = id;
  document.getElementById('profNewPassword').value = '';
  document.getElementById('profPwError').classList.remove('visible');
  profPwModal.classList.add('visible');
}
document.getElementById('btnProfPwCancel').addEventListener('click', () => profPwModal.classList.remove('visible'));

document.getElementById('profPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('profPwError');
  const errText = document.getElementById('profPwErrorText');
  err.classList.remove('visible');
  const id = parseInt(document.getElementById('profPasswordId').value);
  const password = document.getElementById('profNewPassword').value.trim();
  if (!password) {
    errText.textContent = 'Ingresa la nueva contrasena.';
    err.classList.add('visible');
    return;
  }
  try {
    const res = await apiFetch(`/admin/profesores/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    profPwModal.classList.remove('visible');
    toast('Contrasena actualizada.', 'success');
  } catch (err2) {
    errText.textContent = err2.message;
    err.classList.add('visible');
  }
});

async function deleteProfesor(id, nombre) {
  const confirmar = await showConfirm({
    title: `Eliminar al profesor "${nombre}"?`,
    message: 'Esta accion no se puede deshacer.',
    confirmText: 'Eliminar',
    danger: true
  });
  if (!confirmar) return;
  try {
    const res = await apiFetch(`/admin/profesores/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    toast('Profesor eliminado.', 'success');
    loadAdmin();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Helpers compartidos ──────────────────────────────────────────────────────
window.goPage = goPage;
window.verDetalle = verDetalle;
window.verHistoria = verHistoria;
window.verIntento = verIntento;
window.resetIntentos = resetIntentos;
window.exportarCSV = exportarCSV;
window.changePassword = changePassword;
window.deleteStudent = deleteStudent;
window.editarEvaluacion = editarEvaluacion;
window.toggleEvaluacion = toggleEvaluacion;
window.eliminarEvaluacion = eliminarEvaluacion;
window.changeProfPassword = changeProfPassword;
window.deleteProfesor = deleteProfesor;

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

loadData();
