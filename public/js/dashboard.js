const API_BASE = '/api';

const token = sessionStorage.getItem('token');
const tipo  = sessionStorage.getItem('tipo');

if (!token)              window.location.replace('/');
if (tipo === 'profesor') window.location.replace('/profesor');

const nombre         = sessionStorage.getItem('nombre') || '';
const nombreCompleto = sessionStorage.getItem('nombre_completo') || nombre;

document.getElementById('userName').textContent    = nombre;
document.getElementById('userInitial').textContent = nombreCompleto[0]?.toUpperCase() || 'A';
document.getElementById('welcomeName').textContent = nombreCompleto;

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.replace('/');
});

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

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
    message = `Felicitaciones! Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. Si queres, podes intentar mejorar tu nota: te quedan <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong>. Tu mejor puntaje siempre queda guardado.`;
  } else if (aprobado) {
    message = `Felicitaciones! Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. No necesitas hacer nada mas.`;
  } else if (bloqueado) {
    message = `Agotaste los 3 intentos. Tu mejor puntaje fue <strong>${puntaje}/${data.totalPreguntas}</strong>. Consulta con tu instructor.`;
  } else if (intentos > 0) {
    message = `Tenes <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong> restante${restantes !== 1 ? 's' : ''}. Podes volver a rendir cuando estes listo/a.`;
  } else {
    message = 'Cuando estes listo/a, hace clic en <strong>Iniciar Evaluacion</strong> para comenzar. Tenes 3 intentos disponibles.';
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
    const res  = await fetch(`${API_BASE}/estado`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { sessionStorage.clear(); window.location.replace('/'); return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const sub = document.getElementById('welcomeSub');
    sub.textContent = data.evaluaciones.length > 0
      ? `Tenes ${data.evaluaciones.length} evaluacion${data.evaluaciones.length !== 1 ? 'es' : ''} disponible${data.evaluaciones.length !== 1 ? 's' : ''}.`
      : 'No tenes evaluaciones disponibles.';

    loading.classList.add('hidden');
    container.innerHTML = `<div class="eval-cards-list">${
      data.evaluaciones.map(a => buildEvalCard(a)).join('')
    }</div>`;
    container.classList.remove('hidden');

  } catch (err) {
    loading.innerHTML = `<div class="loading-container"><h3>Error al cargar</h3><p>${err.message}</p></div>`;
  }
}

loadEstado();
