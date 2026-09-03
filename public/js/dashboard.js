const token = Session.getToken();
const tipo  = Session.getTipo();

if (!token)              window.location.replace('/');
if (tipo === 'profesor') window.location.replace('/profesor');

const nombre         = sessionStorage.getItem('nombre') || '';
const nombreCompleto = sessionStorage.getItem('nombre_completo') || nombre;

document.getElementById('userName').textContent    = nombre;
document.getElementById('userInitial').textContent = nombreCompleto[0]?.toUpperCase() || 'A';
document.getElementById('welcomeName').textContent = nombreCompleto;

// ── Account menu ────────────────────────────────────────────────────────────
const dropdown = document.getElementById('accountDropdown');
document.getElementById('userMenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  dropdown.classList.toggle('open');
});
document.addEventListener('click', () => dropdown.classList.remove('open'));

document.getElementById('btnLogout').addEventListener('click', logout);

// ── Tabs ────────────────────────────────────────────────────────────────────
const tabEvaluaciones = document.querySelector('.view-tab[data-view="evaluaciones"]');
const tabHistorial    = document.querySelector('.view-tab[data-view="historial"]');
document.querySelectorAll('.view-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('evalContainer').classList.toggle('hidden', view !== 'evaluaciones');
    document.getElementById('historialContainer').classList.toggle('hidden', view !== 'historial');
    if (view === 'historial') loadHistorial();
  });
});

function buildEvalCard(data) {
  const intentos    = data.intentosUsados || 0;
  const puntaje     = data.mejorPuntaje;
  const aprobado    = data.aprobado;
  const restantes   = Math.max(0, 3 - intentos);
  const bloqueado   = intentos >= 3 && !aprobado;
  const puedeRendir = !bloqueado && !aprobado;

  const statusCls   = aprobado ? 'status-disponible' : bloqueado ? 'status-cerrada' : 'status-pendiente';
  const statusLabel = aprobado ? 'Aprobado' : bloqueado ? 'Desaprobado' : 'Pendiente';

  const dots = [1,2,3].map(i =>
    `<div class="intento-dot ${i <= intentos ? 'used' : ''} ${aprobado && i === intentos ? 'approved' : ''}"></div>`
  ).join('');

  const scorePct = puntaje !== null ? Math.round((puntaje / data.totalPreguntas) * 100) : 0;
  const scoreBar = puntaje !== null ? `
    <div class="score-section">
      <div class="score-row">
        <span class="score-label">Mejor puntaje</span>
        <span class="score-value ${aprobado ? 'aprobado' : 'desaprobado'}">${puntaje}/${data.totalPreguntas}</span>
      </div>
      <div class="score-bar-bg">
        <div class="score-bar-fill ${aprobado ? 'aprobado' : 'desaprobado'}" style="width:${scorePct}%"></div>
      </div>
      <div class="score-min-label">Minimo para aprobar: ${Math.ceil(data.totalPreguntas * 0.6)}/${data.totalPreguntas} (60%)</div>
    </div>` : '';

  let message = '';
  if (aprobado && restantes > 0) {
    message = `Felicitaciones! Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. Si queres, podes intentar mejorar tu nota: te quedan <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong>.`;
  } else if (aprobado) {
    message = `Felicitaciones! Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. No necesitas hacer nada mas.`;
  } else if (bloqueado) {
    message = `Agotaste los 3 intentos. Tu mejor puntaje fue <strong>${puntaje}/${data.totalPreguntas}</strong>. Consulta con tu instructor.`;
  } else if (intentos > 0) {
    message = `Tenes <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong> restante${restantes !== 1 ? 's' : ''}.`;
  } else {
    message = 'Cuando estes listo/a, hace clic en <strong>Iniciar Evaluacion</strong>. Tenes 3 intentos disponibles.';
  }

  let actionBtn = '';
  if (puedeRendir) {
    actionBtn = `<button class="btn-accion available" onclick="iniciarEvaluacion(${data.evaluacionId})">Iniciar Evaluacion</button>`;
  } else if (aprobado) {
    actionBtn = `<div class="btn-accion approved-msg">Evaluacion aprobada!</div>`;
  } else {
    actionBtn = `<div class="btn-accion blocked-msg">Evaluacion bloqueada</div>`;
  }

  return `
    <div class="eval-card-full">
      <div class="eval-card-full-header">
        <div class="eval-header-left">
          <div class="eval-icon-lg">E</div>
          <div>
            <div class="eval-cap-label">Capacitacion</div>
            <div class="eval-cap-name">${escapeHtml(data.capacitacion)}</div>
          </div>
        </div>
        <span class="eval-status-badge ${statusCls}">${statusLabel}</span>
      </div>
      <div class="eval-card-full-body">
        <div>
          <div class="intentos-label">Intentos utilizados</div>
          <div class="intentos-row">
            <div class="intentos-dots">${dots}</div>
            <span class="intentos-text">${intentos} de 3</span>
          </div>
        </div>
        ${scoreBar}
        <div class="eval-message">${message}</div>
        ${actionBtn}
      </div>
    </div>`;
}

function iniciarEvaluacion(id) {
  sessionStorage.setItem('evalId', id);
  window.location.href = '/evaluacion';
}

async function loadEstado() {
  const loading   = document.getElementById('loadingState');
  const container = document.getElementById('evalContainer');

  try {
    const res = await apiFetch('/estado');
    if (res.status === 401) { Session.clear(); window.location.replace('/'); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));

    const sub = document.getElementById('welcomeSub');
    sub.textContent = data.evaluaciones.length > 0
      ? `Tenes ${data.evaluaciones.length} evaluacion${data.evaluaciones.length !== 1 ? 'es' : ''} disponible${data.evaluaciones.length !== 1 ? 's' : ''}.`
      : 'No tenes evaluaciones disponibles.';

    loading.classList.add('hidden');
    container.innerHTML = `<div class="eval-cards-list">${
      data.evaluaciones.map((a) => buildEvalCard(a)).join('')
    }</div>`;
    container.classList.remove('hidden');
  } catch (err) {
    loading.innerHTML = `<div class="loading-container"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

async function loadHistorial() {
  const container = document.getElementById('historialContainer');
  container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><span>Cargando...</span></div>';
  try {
    const res = await apiFetch('/mis-intentos');
    if (!res.ok) throw new Error('Error al cargar historial');
    const data = await res.json();
    if (data.intentos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px 0;">Aun no tenes intentos registrados.</p>';
      return;
    }
    container.innerHTML = `<div class="stats-bar history-bar" style="display:block;">
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:14px;">Historial de intentos</h2>
        ${data.intentos.map((i) => `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(i.capacitacion)}</strong>
              <div style="font-size:.78rem;color:var(--text-muted);">Intentos: ${i.puntaje}/${i.totalPreguntas}</div>
            </div>
            <div style="text-align:right;">
              <span class="eval-status-badge ${i.aprobado ? 'status-disponible' : 'status-cerrada'}">${i.aprobado ? 'Aprobado' : 'Desaprobado'}</span>
              <div class="history-date">${formatFecha(i.fecha)}</div>
            </div>
          </div>`).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--error);text-align:center;padding:20px;">${err.message}</p>`;
  }
}

// ── Cambio de contrasena ────────────────────────────────────────────────────
const pwModal = document.getElementById('passwordModal');
document.getElementById('btnChangePassword').addEventListener('click', () => {
  dropdown.classList.remove('open');
  document.getElementById('pwError').classList.remove('visible');
  document.getElementById('pwActual').value = '';
  document.getElementById('pwNueva').value = '';
  pwModal.classList.add('visible');
});
document.getElementById('btnPwCancel').addEventListener('click', () => pwModal.classList.remove('visible'));

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwError = document.getElementById('pwError');
  const pwErrorText = document.getElementById('pwErrorText');
  pwError.classList.remove('visible');

  const passwordActual = document.getElementById('pwActual').value.trim();
  const passwordNueva  = document.getElementById('pwNueva').value.trim();
  if (!passwordActual || !passwordNueva) {
    pwErrorText.textContent = 'Completa ambos campos.';
    pwError.classList.add('visible');
    return;
  }

  try {
    const res = await apiFetch('/mis-datos/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordActual, passwordNueva })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    pwModal.classList.remove('visible');
    toast('Contrasena actualizada correctamente.', 'success');
  } catch (err) {
    pwErrorText.textContent = err.message;
    pwError.classList.add('visible');
  }
});
