const token = Session.getToken();
const tipo  = Session.getTipo();

if (!token || tipo !== 'profesor') window.location.replace('/');

const nombre = sessionStorage.getItem('nombre') || 'Profesor';
document.getElementById('userName').textContent = nombre;
document.getElementById('userInitial').textContent = nombre[0]?.toUpperCase() || 'P';

document.getElementById('logoutBtn')?.addEventListener('click', logout);

let allData = null;
let searchTerm = '';

// ── View switching ─────────────────────────────────────────────────────────
function showView(name) {
  document.getElementById('viewAlumnos').classList.toggle('hidden', name !== 'alumnos');
  document.getElementById('viewEstadisticas').classList.toggle('hidden', name !== 'estadisticas');
  document.getElementById('viewDetalle').classList.toggle('hidden', name !== 'detalle');
}

document.querySelectorAll('.cap-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.cap-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
    showView(item.dataset.view);
    if (item.dataset.view === 'estadisticas') renderEstadisticas(allData.stats);
    if (item.dataset.view === 'alumnos') renderAlumnosTable(allData.alumnosDetalle);
    document.getElementById('searchAlumno').value = '';
    searchTerm = '';
  });
});

// Búsqueda en vivo
document.getElementById('searchAlumno').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderAlumnosTable(allData.alumnosDetalle);
});

// ── Load data ──────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await apiFetch('/profesor/estadisticas');
    if (res.status === 401 || res.status === 403) { Session.clear(); window.location.replace('/'); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));

    allData = data;
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('profContent').classList.remove('hidden');
    renderStatsBar(data);
    renderAlumnosTable(data.alumnosDetalle);
    renderEstadisticas(data.stats);
  } catch (err) {
    document.getElementById('loadingState').innerHTML =
      `<div class="loading-container"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

function renderStatsBar(data) {
  const aprobados = data.alumnosDetalle.reduce((sum, a) =>
    sum + a.evaluaciones.filter((e) => e.aprobado).length, 0);
  const pendientes = data.alumnosDetalle.reduce((sum, a) =>
    sum + a.evaluaciones.filter((e) => e.estado === 'Pendiente').length, 0);
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card"><div class="stat-icon indigo">&#128101;</div><div><div class="stat-number">${data.totalAlumnos}</div><div class="stat-label">Alumnos</div></div></div>
    <div class="stat-card"><div class="stat-icon green">&#10003;</div><div><div class="stat-number">${aprobados}</div><div class="stat-label">Aprobaciones</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">&#9203;</div><div><div class="stat-number">${pendientes}</div><div class="stat-label">Pendientes</div></div></div>
  `;
}

function renderAlumnosTable(alumnos) {
  const tbody = document.getElementById('alumnosBody');
  const filtrados = searchTerm
    ? alumnos.filter((a) =>
        (a.nombre_completo || '').toLowerCase().includes(searchTerm) ||
        (a.nombre || '').toLowerCase().includes(searchTerm))
    : alumnos;

  if (filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:30px;">No se encontraron alumnos.</td></tr>';
    return;
  }

  tbody.innerHTML = filtrados.map((a) => `
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
  `).join('');
}

function renderEstadisticas(stats) {
  const container = document.getElementById('viewEstadisticas');
  container.innerHTML = `
    <div class="section-header"><h2 class="section-title">Estadisticas por Evaluacion</h2></div>
    <div class="eval-stats-grid">
      ${stats.map((s, i) => `
        <div class="eval-stat-card">
          <h3>${escapeHtml(s.capacitacion)}</h3>
          <div class="eval-stat-row"><span class="label">Total alumnos</span><span class="value">${s.totalAlumnos}</span></div>
          <div class="eval-stat-row"><span class="label">Rindieron</span><span class="value">${s.alumnosRindieron}</span></div>
          <div class="eval-stat-row"><span class="label">Aprobados</span><span class="value" style="color:var(--success)">${s.aprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Desaprobados</span><span class="value" style="color:var(--error)">${s.desaprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Pendientes</span><span class="value" style="color:var(--warning)">${s.pendientes}</span></div>
          <div class="eval-stat-row"><span class="label">Promedio</span><span class="value">${s.promedio > 0 ? s.promedio + '/10' : '-'}</span></div>
          <button class="btn-sm" style="margin-top:12px;width:100%;justify-content:center;" onclick="exportarCSV(${i + 1})">Exportar CSV</button>
        </div>
      `).join('')}
    </div>`;
}

// ── Detalle alumno / reset intentos ────────────────────────────────────────
function verDetalle(alumnoId) {
  const a = allData.alumnosDetalle.find((x) => x.id === alumnoId);
  if (!a) return;
  document.getElementById('detalleTitle').textContent = `Detalle: ${a.nombre_completo}`;
  document.getElementById('detalleContainer').innerHTML = `
    <table>
      <thead><tr><th>Evaluacion</th><th>Intentos</th><th>Mejor</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        ${a.evaluaciones.map((ev) => `
          <tr>
            <td>${escapeHtml(ev.capacitacion)}</td>
            <td>${ev.intentos}/3</td>
            <td>${ev.mejorPuntaje !== null ? ev.mejorPuntaje : '-'}</td>
            <td><span class="badge-table ${ev.aprobado ? 'aprobado' : ev.estado === 'Desaprobado' ? 'desaprobado' : 'pendiente'}">${ev.estado}</span></td>
            <td><button class="btn-sm" onclick="resetIntentos(${a.id}, ${ev.evaluacionId}, '${escapeHtml(ev.capacitacion)}')">Reset</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  document.querySelectorAll('.cap-item').forEach((i) => i.classList.remove('active'));
  showView('detalle');
}

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
    verDetalle(alumnoId);
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Exportar CSV ───────────────────────────────────────────────────────────
async function exportarCSV(evalId) {
  try {
    const res = await apiFetch(`/profesor/exportar/${evalId}`);
    if (!res.ok) throw new Error('Error al exportar');
    await downloadFromResponse(res, `resultados_${evalId}.csv`);
    toast('Archivo descargado.', 'success');
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

// ── Modal: Crear alumno ────────────────────────────────────────────────────
const modalOverlay  = document.getElementById('modalOverlay');
const studentForm   = document.getElementById('studentForm');
const modalError    = document.getElementById('modalError');
const modalErrorText= document.getElementById('modalErrorText');

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
  const nombre          = document.getElementById('studentUsuario').value.trim();
  const password        = document.getElementById('studentPassword').value.trim();

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

// ── Change password ────────────────────────────────────────────────────────
const pwModal     = document.getElementById('passwordModal');
const pwForm      = document.getElementById('passwordForm');
const pwError     = document.getElementById('pwModalError');
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
  const id       = parseInt(document.getElementById('passwordUserId').value);
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

// Botón volver a lista desde detalle
document.getElementById('btnVolverLista').addEventListener('click', () => {
  document.querySelectorAll('.cap-item').forEach((i) => i.classList.toggle('active', i.dataset.view === 'alumnos'));
  showView('alumnos');
});

loadData();
