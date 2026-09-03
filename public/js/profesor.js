const API_BASE = '/api';
const token = sessionStorage.getItem('token');
const tipo  = sessionStorage.getItem('tipo');

if (!token || tipo !== 'profesor') window.location.replace('/');

const nombre = sessionStorage.getItem('nombre') || 'Profesor';
document.getElementById('userName').textContent = nombre;
document.getElementById('userInitial').textContent = nombre[0]?.toUpperCase() || 'P';

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.replace('/');
});

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── View switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.cap-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.cap-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    document.getElementById('viewAlumnos').classList.toggle('hidden', view !== 'alumnos');
    document.getElementById('viewEstadisticas').classList.toggle('hidden', view !== 'estadisticas');
  });
});

// ── Load data ──────────────────────────────────────────────────────────────
let allData = null;

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/profesor/estadisticas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) { sessionStorage.clear(); window.location.replace('/'); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

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
  const bar = document.getElementById('statsBar');
  const aprobados = data.alumnosDetalle.reduce((sum, a) =>
    sum + a.evaluaciones.filter(e => e.aprobado).length, 0);
  const pendientes = data.alumnosDetalle.reduce((sum, a) =>
    sum + a.evaluaciones.filter(e => e.estado === 'Pendiente').length, 0);

  bar.innerHTML = `
    <div class="stat-card"><div class="stat-icon indigo">&#128101;</div><div><div class="stat-number">${data.totalAlumnos}</div><div class="stat-label">Alumnos</div></div></div>
    <div class="stat-card"><div class="stat-icon green">&#10003;</div><div><div class="stat-number">${aprobados}</div><div class="stat-label">Aprobaciones</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">&#9203;</div><div><div class="stat-number">${pendientes}</div><div class="stat-label">Pendientes</div></div></div>
  `;
}

function renderAlumnosTable(alumnos) {
  const tbody = document.getElementById('alumnosBody');
  if (alumnos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:30px;">No hay alumnos registrados. Crea uno con el boton de arriba.</td></tr>';
    return;
  }

  tbody.innerHTML = alumnos.map(a => `
    <tr>
      <td class="td-nombre">${escapeHtml(a.nombre_completo)}</td>
      <td class="td-usuario">${escapeHtml(a.nombre)}</td>
      <td>
        <button class="btn-sm" onclick="changePassword(${a.id})">Contrasena</button>
        <button class="btn-sm danger" onclick="deleteStudent(${a.id}, '${escapeHtml(a.nombre)}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function renderEstadisticas(stats) {
  const container = document.getElementById('viewEstadisticas');
  container.innerHTML = `
    <div class="section-header"><h2 class="section-title">Estadisticas por Evaluacion</h2></div>
    <div class="eval-stats-grid">
      ${stats.map(s => `
        <div class="eval-stat-card">
          <h3>${escapeHtml(s.capacitacion)}</h3>
          <div class="eval-stat-row"><span class="label">Total alumnos</span><span class="value">${s.totalAlumnos}</span></div>
          <div class="eval-stat-row"><span class="label">Rindieron</span><span class="value">${s.alumnosRindieron}</span></div>
          <div class="eval-stat-row"><span class="label">Aprobados</span><span class="value" style="color:var(--success)">${s.aprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Desaprobados</span><span class="value" style="color:var(--error)">${s.desaprobados}</span></div>
          <div class="eval-stat-row"><span class="label">Pendientes</span><span class="value" style="color:var(--warning)">${s.pendientes}</span></div>
          <div class="eval-stat-row"><span class="label">Promedio</span><span class="value">${s.promedio > 0 ? s.promedio + '/10' : '-'}</span></div>
        </div>
      `).join('')}
    </div>`;
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
    const res = await fetch(`${API_BASE}/profesor/alumnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre, password, nombre_completo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    modalOverlay.classList.remove('visible');
    loadData();
  } catch (err) {
    modalErrorText.textContent = err.message;
    modalError.classList.add('visible');
  }
});

// ── Delete student ─────────────────────────────────────────────────────────
async function deleteStudent(id, nombre) {
  if (!confirm(`Eliminar al alumno "${nombre}"? Esta accion no se puede deshacer.`)) return;

  try {
    const res = await fetch(`${API_BASE}/profesor/alumnos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    loadData();
  } catch (err) {
    alert(`Error: ${err.message}`);
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

document.getElementById('btnPwCancel').addEventListener('click', () => {
  pwModal.classList.remove('visible');
});

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
    const res = await fetch(`${API_BASE}/profesor/alumnos/${id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    pwModal.classList.remove('visible');
    alert('Contrasena actualizada correctamente.');
  } catch (err) {
    pwErrorText.textContent = err.message;
    pwError.classList.add('visible');
  }
});

loadData();
