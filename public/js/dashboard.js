const token = Session.getToken();
const tipo = Session.getTipo();

if (!token) window.location.replace('/');
if (tipo === 'profesor' || tipo === 'admin') window.location.replace('/profesor');

const nombre = sessionStorage.getItem('nombre') || '';
const nombreCompleto = sessionStorage.getItem('nombre_completo') || nombre;

document.getElementById('userName').textContent = nombre;
document.getElementById('userInitial').textContent = nombreCompleto[0]?.toUpperCase() || 'A';
document.getElementById('welcomeName').textContent = nombreCompleto;

// ── Tema y tamaño de letra ───────────────────────────────────────────────────
document.getElementById('themeToggle').textContent = Theme.get() === 'dark' ? 'Claro' : 'Oscuro';
document.getElementById('themeToggle').addEventListener('click', () => {
  Theme.toggle();
  document.getElementById('themeToggle').textContent = Theme.get() === 'dark' ? 'Claro' : 'Oscuro';
});

const FONT_SIZES = ['100', '110', '125'];
const FONT_LABELS = ['100%', '110%', '125%'];
let fontSizeIdx = FONT_SIZES.indexOf(FontSize.get());
if (fontSizeIdx === -1) fontSizeIdx = 0;
const btnFontSize = document.getElementById('btnFontSize');
function updateFontLabel() {
  btnFontSize.textContent = `Tamanio de letra: ${FONT_LABELS[fontSizeIdx]}`;
}
updateFontLabel();
btnFontSize.addEventListener('click', () => {
  fontSizeIdx = (fontSizeIdx + 1) % FONT_SIZES.length;
  FontSize.apply(FONT_SIZES[fontSizeIdx]);
  updateFontLabel();
  toast(`Tamanio de letra: ${FONT_LABELS[fontSizeIdx]}`, 'info');
});

// ── Account menu ────────────────────────────────────────────────────────────
const dropdown = document.getElementById('accountDropdown');
document.getElementById('userMenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  dropdown.classList.toggle('open');
});
document.getElementById('userMenuBtn').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    dropdown.classList.toggle('open');
  }
});
document.addEventListener('click', () => dropdown.classList.remove('open'));

document.getElementById('btnLogout').addEventListener('click', logout);

// ── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.view-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const view = btn.dataset.view;
    document.getElementById('evalContainer').classList.toggle('hidden', view !== 'evaluaciones');
    document.getElementById('historialContainer').classList.toggle('hidden', view !== 'historial');
    if (view === 'historial') loadHistorial();
  });
});

// ── Filtro por estado (4.6) ────────────────────────────────────────────────
let filterEstado = 'todas';
function renderFilterChips() {
  const total = evaluaciones.length;
  const aprobadas = evaluaciones.filter((e) => e.aprobado).length;
  const desaprobadas = evaluaciones.filter((e) => !e.aprobado && e.intentosUsados >= e.intentosMax).length;
  const pendientes = total - aprobadas - desaprobadas;
  const chips = [
    { key: 'todas', label: `Todas (${total})` },
    { key: 'aprobadas', label: `Aprobadas (${aprobadas})` },
    { key: 'pendientes', label: `Pendientes (${pendientes})` },
    { key: 'desaprobadas', label: `Desaprobadas (${desaprobadas})` }
  ];
  evalContainer.innerHTML = `
    <div class="filter-row" role="group" aria-label="Filtrar por estado">
      ${chips.map((c) => `<button type="button" class="filter-chip ${filterEstado === c.key ? 'active' : ''}" data-filter="${c.key}">${c.label}</button>`).join('')}
    </div>
    <div class="eval-cards-list" id="evalCardsList"></div>`;
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      filterEstado = chip.dataset.filter;
      renderFilterChips();
    });
  });
  renderFilteredCards();
  updateWelcomeSubtotal();
}

function renderFilteredCards() {
  const list = document.getElementById('evalCardsList');
  let filtered = evaluaciones;
  if (filterEstado === 'aprobadas') filtered = evaluaciones.filter((e) => e.aprobado);
  else if (filterEstado === 'pendientes')
    filtered = evaluaciones.filter((e) => !e.aprobado && e.intentosUsados < e.intentosMax);
  else if (filterEstado === 'desaprobadas')
    filtered = evaluaciones.filter((e) => !e.aprobado && e.intentosUsados >= e.intentosMax);
  list.innerHTML =
    filtered.map((a) => buildEvalCard(a)).join('') ||
    '<p style="color:var(--text-muted);text-align:center;padding:26px 0;">No hay evaluaciones en esta categoria.</p>';
}

// ── Build card ──────────────────────────────────────────────────────────────
function buildEvalCard(data) {
  const intentos = data.intentosUsados || 0;
  const intentosMax = data.intentosMax || 3;
  const puntaje = data.mejorPuntaje;
  const aprobado = data.aprobado;
  const restantes = Math.max(0, intentosMax - intentos);
  const bloqueado = intentos >= intentosMax && !aprobado;
  const puedeRendir = !bloqueado && !aprobado;

  const statusCls = aprobado ? 'status-disponible' : bloqueado ? 'status-cerrada' : 'status-pendiente';
  const statusLabel = aprobado ? 'Aprobado' : bloqueado ? 'Desaprobado' : 'Pendiente';

  const dots = Array.from(
    { length: intentosMax },
    (_, i) =>
      `<div class="intento-dot ${i < intentos ? 'used' : ''} ${aprobado && i === intentos - 1 ? 'approved' : ''}"></div>`
  ).join('');

  const scorePct = puntaje !== null ? Math.round((puntaje / data.totalPreguntas) * 100) : 0;
  const minAprobar = Math.ceil(data.totalPreguntas * (data.porcentaje / 100));
  const scoreBar =
    puntaje !== null
      ? `
    <div class="score-section">
      <div class="score-row">
        <span class="score-label">Mejor puntaje</span>
        <span class="score-value ${aprobado ? 'aprobado' : 'desaprobado'}">${puntaje}/${data.totalPreguntas}</span>
      </div>
      <div class="score-bar-bg">
        <div class="score-bar-fill ${aprobado ? 'aprobado' : 'desaprobado'}" style="width:${scorePct}%"></div>
      </div>
      <div class="score-min-label">Minimo para aprobar: ${minAprobar}/${data.totalPreguntas} (${data.porcentaje}%)</div>
    </div>`
      : '';

  let message;
  if (aprobado && restantes > 0) {
    message = `Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. Podes intentar mejorar tu nota: te quedan <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong>.`;
  } else if (aprobado) {
    message = `Aprobaste con <strong>${puntaje}/${data.totalPreguntas}</strong>. Podes descargar tu certificado.`;
  } else if (bloqueado) {
    message = `Agotaste los ${intentosMax} intentos. Tu mejor puntaje fue <strong>${puntaje}/${data.totalPreguntas}</strong>. Consulta con tu instructor.`;
  } else if (intentos > 0) {
    message = `Tenes <strong>${restantes} intento${restantes !== 1 ? 's' : ''}</strong> restante${restantes !== 1 ? 's' : ''}. La evaluacion dura <strong>${data.duracionMinutos} min</strong>.`;
  } else {
    message = `Cuando estes listo/a, hace clic en <strong>Iniciar Evaluacion</strong>. Tenes ${intentosMax} intentos y ${data.duracionMinutos} minutos.`;
  }

  let actionBtn;
  if (puedeRendir) {
    actionBtn = `<button class="btn-accion available" onclick="iniciarEvaluacion(${data.evaluacionId})">Iniciar Evaluacion</button>`;
  } else if (aprobado) {
    actionBtn = `<div class="btn-accion approved-msg">Evaluacion aprobada!</div>
      ${data.certificadoDisponible ? `<button class="btn-certificado" onclick="verCertificado(${data.evaluacionId})">Ver certificado / Constancia</button>` : ''}`;
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
            <span class="intentos-text">${intentos} de ${intentosMax}</span>
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
window.iniciarEvaluacion = iniciarEvaluacion;

function verCertificado(id) {
  window.location.href = `/certificado?evaluacionId=${id}`;
}
window.verCertificado = verCertificado;

let evaluaciones = [];

function updateWelcomeSubtotal() {
  const sub = document.getElementById('welcomeSub');
  const pendiente = evaluaciones.filter((e) => !e.aprobado && e.intentosUsados < e.intentosMax).length;
  if (evaluaciones.length === 0) {
    sub.textContent = 'No tenes evaluaciones disponibles.';
  } else if (pendiente === 0) {
    sub.textContent = evaluaciones.every((e) => e.aprobado)
      ? 'Completaste todas tus evaluaciones. Excelente!'
      : 'Todas tus evaluaciones estan finalizadas.';
  } else {
    sub.textContent = `Tenes ${pendiente} evaluacion${pendiente !== 1 ? 'es' : ''} pendiente${pendiente !== 1 ? 's' : ''}.`;
  }
}

async function loadEstado() {
  const loading = document.getElementById('loadingState');
  const container = document.getElementById('evalContainer');

  try {
    const res = await apiFetch('/estado');
    if (res.status === 401) {
      Session.clear();
      window.location.replace('/');
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));

    evaluaciones = data.evaluaciones;
    loading.classList.add('hidden');
    container.classList.remove('hidden');
    renderFilterChips();
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

// Curva de progreso simple (2.5) con SVG
function sparkline(puntos, totalMax) {
  if (!puntos || puntos.length < 2) return '';
  const W = 360,
    H = 80,
    pad = 8;
  const max = totalMax || Math.max(...puntos);
  const x = (i) => pad + (i * (W - pad * 2)) / (puntos.length - 1);
  const y = (v) => H - pad - (v * (H - pad * 2)) / (max || 1);
  const line = puntos.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(puntos.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <defs><linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0058FF" stop-opacity=".6"/><stop offset="1" stop-color="#0058FF" stop-opacity="0"/></linearGradient></defs>
    <path class="area" d="${area}"></path>
    <path class="line" d="${line}"></path>
    ${puntos.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"></circle>`).join('')}
  </svg>`;
}

async function loadHistorial() {
  const container = document.getElementById('historialContainer');
  container.innerHTML =
    '<div class="loading-container"><div class="loading-spinner"></div><span>Cargando...</span></div>';
  try {
    const res = await apiFetch('/mis-intentos');
    if (!res.ok) throw new Error('Error al cargar historial');
    const data = await res.json();
    if (data.intentos.length === 0) {
      container.innerHTML =
        '<p style="color:var(--text-muted);text-align:center;padding:30px 0;">Aun no tenes intentos registrados.</p>';
      return;
    }

    // Agrupa por evaluacion para la curva de progreso
    const porEval = {};
    data.intentos.forEach((i) => {
      (porEval[i.capacitacion] = porEval[i.capacitacion] || []).push(i);
    });
    const progreso = Object.entries(porEval)
      .map(([cap, intentos]) => {
        const ordenados = intentos.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        return `<div class="progress-card">
        <h3>${escapeHtml(cap)}</h3>
        ${
          sparkline(
            ordenados.map((i) => i.puntaje),
            ordenados[0].totalPreguntas
          ) || '<p style="font-size:.8rem;color:var(--text-muted)">Necesitas al menos 2 intentos para ver la curva.</p>'
        }
        <div style="font-size:.76rem;color:var(--text-muted);text-align:center;">Puntaje por intento</div>
      </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="stats-bar history-bar" style="display:block;">
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:14px;">Curva de progreso</h2>
        ${progreso}
        <h2 style="font-size:1.1rem;font-weight:700;margin:22px 0 14px;">Historial de intentos</h2>
        ${data.intentos
          .map(
            (i) => `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(i.capacitacion)}</strong>
              <div style="font-size:.78rem;color:var(--text-muted);">Intentos: ${i.puntaje}/${i.totalPreguntas}</div>
            </div>
            <div style="text-align:right;">
              <span class="eval-status-badge ${i.aprobado ? 'status-disponible' : 'status-cerrada'}">${i.aprobado ? 'Aprobado' : 'Desaprobado'}</span>
              <div class="history-date">${formatFecha(i.fecha)}</div>
            </div>
          </div>`
          )
          .join('')}
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
  const passwordNueva = document.getElementById('pwNueva').value.trim();
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

// ── Pregunta secreta ────────────────────────────────────────────────────────
const secModal = document.getElementById('secQuestionModal');
document.getElementById('btnSecurityQuestion').addEventListener('click', () => {
  dropdown.classList.remove('open');
  document.getElementById('secError').classList.remove('visible');
  secModal.classList.add('visible');
});
document.getElementById('btnSecCancel').addEventListener('click', () => secModal.classList.remove('visible'));

document.getElementById('secQuestionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const secError = document.getElementById('secError');
  const secErrorText = document.getElementById('secErrorText');
  secError.classList.remove('visible');

  const pregunta = document.getElementById('secPregunta').value.trim();
  const respuesta = document.getElementById('secRespuesta').value.trim();
  const passwordActual = document.getElementById('secPassword').value.trim();
  if (!pregunta || !respuesta || !passwordActual) {
    secErrorText.textContent = 'Completa todos los campos.';
    secError.classList.add('visible');
    return;
  }
  try {
    const res = await apiFetch('/mis-datos/pregunta-secreta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta, respuesta, passwordActual })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(parseError(data));
    secModal.classList.remove('visible');
    toast('Pregunta secreta configurada.', 'success');
  } catch (err) {
    secErrorText.textContent = err.message;
    secError.classList.add('visible');
  }
});

loadEstado();
