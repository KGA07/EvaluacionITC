const API_BASE = '/api';
const token = sessionStorage.getItem('token');
const tipo  = sessionStorage.getItem('tipo');

if (!token || tipo !== 'alumno') window.location.replace('/');

const evalId = parseInt(sessionStorage.getItem('evalId'));
if (!evalId) window.location.replace('/dashboard');

let evaluacion   = null;
let respuestas   = [];
let currentIndex = 0;
let isAnimating  = false;

document.getElementById('btnBack').addEventListener('click', () => {
  if (confirm('Seguro que queres salir? Perderas tu progreso en este intento.')) {
    window.location.replace('/dashboard');
  }
});

async function loadEvaluacion() {
  try {
    const res = await fetch(`${API_BASE}/evaluacion/${evalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { sessionStorage.clear(); window.location.replace('/'); return; }
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('examContent').innerHTML = `
        <div class="loading-container" style="padding-top:10vh;">
          <h3>Evaluacion no disponible</h3><p>${data.error}</p>
          <a href="/dashboard" style="margin-top:16px;color:var(--primary);font-weight:600;">Volver al inicio</a>
        </div>`;
      document.getElementById('examFooter')?.remove();
      return;
    }

    evaluacion = data;
    respuestas = new Array(data.totalPreguntas).fill(null);

    document.getElementById('examTitle').textContent  = data.titulo;
    document.getElementById('totalCount').textContent = data.totalPreguntas;

    buildFooterDots(data.totalPreguntas);
    renderQuestion(0, null);
  } catch (err) {
    document.getElementById('examContent').innerHTML = `
      <div class="loading-container" style="padding-top:10vh;">
        <h3>Error al cargar</h3><p>${err.message}</p>
        <a href="/dashboard" style="margin-top:16px;color:var(--primary);font-weight:600;">Volver</a>
      </div>`;
  }
}

function buildFooterDots(total) {
  const container = document.getElementById('footerDots');
  container.innerHTML = Array.from({ length: total }, (_, i) =>
    `<div class="footer-dot" id="dot-${i}" title="Pregunta ${i + 1}" onclick="goTo(${i})"></div>`
  ).join('');
}

function renderQuestion(idx, direction) {
  currentIndex = idx;
  const p       = evaluacion.preguntas[idx];
  const content = document.getElementById('examContent');

  const opciones = p.opciones.map((texto, i) => {
    const letra = String.fromCharCode(65 + i);
    return `
      <button type="button" class="option-btn ${respuestas[idx] === i ? 'selected' : ''}"
        data-q="${idx}" data-opt="${i}"
        onclick="seleccionar(${idx}, ${i}, this)">
        <span class="option-letter">${letra}</span>
        <span class="option-text">${escapeHtml(texto)}</span>
      </button>`;
  }).join('');

  const newCard = document.createElement('div');
  newCard.className = `question-card${respuestas[idx] !== null ? ' answered' : ''}`;
  newCard.id = `qcard-${idx}`;
  newCard.innerHTML = `
    <div class="question-number">Pregunta ${p.id} <span class="question-of">de ${evaluacion.totalPreguntas}</span></div>
    <div class="question-text">${escapeHtml(p.pregunta)}</div>
    <div class="options-grid">${opciones}</div>`;

  if (direction && !isAnimating) {
    isAnimating = true;
    const oldCard = content.querySelector('.question-card');
    if (oldCard) {
      oldCard.style.opacity = '0';
      oldCard.style.transform = direction === 'next' ? 'translateX(-40px)' : 'translateX(40px)';
      oldCard.style.transition = 'all .2s ease';
      setTimeout(() => {
        content.innerHTML = '';
        newCard.style.opacity = '0';
        newCard.style.transform = direction === 'next' ? 'translateX(40px)' : 'translateX(-40px)';
        content.appendChild(newCard);
        requestAnimationFrame(() => {
          newCard.style.transition = 'all .25s ease';
          newCard.style.opacity = '1';
          newCard.style.transform = 'translateX(0)';
        });
        isAnimating = false;
      }, 200);
    } else {
      content.innerHTML = '';
      content.appendChild(newCard);
      isAnimating = false;
    }
  } else {
    content.innerHTML = '';
    content.appendChild(newCard);
  }

  updateProgress();
  updateNavButtons();
}

function seleccionar(qIdx, optIdx, clickedBtn) {
  respuestas[qIdx] = optIdx;
  document.querySelectorAll(`[data-q="${qIdx}"]`).forEach(btn =>
    btn.classList.toggle('selected', btn === clickedBtn)
  );
  document.getElementById(`qcard-${qIdx}`)?.classList.add('answered');
  updateProgress();
  updateNavButtons();
}

function goTo(idx) {
  if (isAnimating || !evaluacion) return;
  if (idx < 0 || idx >= evaluacion.preguntas.length) return;
  const direction = idx > currentIndex ? 'next' : 'prev';
  renderQuestion(idx, direction);
}

function updateProgress() {
  const answered = respuestas.filter(r => r !== null).length;
  const total    = respuestas.length;
  const pct      = total > 0 ? (answered / total) * 100 : 0;

  document.getElementById('answeredCount').textContent = answered;
  document.getElementById('progressFill').style.width  = `${pct}%`;
  document.getElementById('footerText').textContent    = `${currentIndex + 1} / ${total}`;

  respuestas.forEach((r, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    dot.classList.toggle('done', r !== null);
    dot.classList.toggle('current', i === currentIndex);
  });
}

function updateNavButtons() {
  if (!evaluacion) return;
  const total       = evaluacion.preguntas.length;
  const isLast      = currentIndex === total - 1;
  const allAnswered = respuestas.every(r => r !== null);

  const btnPrev      = document.getElementById('btnPrev');
  const btnNext      = document.getElementById('btnNext');
  const btnNextLabel = document.getElementById('btnNextLabel');

  btnPrev.disabled = currentIndex === 0;

  if (isLast) {
    btnNextLabel.textContent = 'Enviar examen';
    btnNext.disabled         = !allAnswered;
    btnNext.classList.add('btn-submit-action');
  } else {
    btnNextLabel.textContent = 'Siguiente';
    btnNext.disabled         = false;
    btnNext.classList.remove('btn-submit-action');
  }
}

document.getElementById('btnPrev').addEventListener('click', () => {
  if (currentIndex > 0) goTo(currentIndex - 1);
});

document.getElementById('btnNext').addEventListener('click', () => {
  if (!evaluacion) return;
  const isLast = currentIndex === evaluacion.preguntas.length - 1;

  if (isLast) {
    if (!respuestas.every(r => r !== null)) return;
    document.getElementById('modalText').innerHTML =
      `Estas por enviar tu examen (intento ${evaluacion.intentoActual} de 3). ` +
      `Una vez enviado no podras modificar tus respuestas.`;
    document.getElementById('modalOverlay').classList.add('visible');
  } else {
    goTo(currentIndex + 1);
  }
});

document.getElementById('btnModalCancel').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('visible');
});

document.getElementById('btnModalConfirm').addEventListener('click', async () => {
  const confirmBtn = document.getElementById('btnModalConfirm');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Enviando...';

  try {
    const res  = await fetch(`${API_BASE}/resultado`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ evaluacionId: evalId, respuestas }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar');

    sessionStorage.setItem('resultado', JSON.stringify(data));
    document.getElementById('modalOverlay').classList.remove('visible');
    window.location.replace('/resultado');
  } catch (err) {
    document.getElementById('modalOverlay').classList.remove('visible');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar envio';
    alert(`Error: ${err.message}`);
  }
});

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

loadEvaluacion();
