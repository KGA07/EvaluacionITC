const API_BASE = '/api';

// ── Tema claro/oscuro (4.4) y tamaño de letra (5.2) ─────────────────────────
const Theme = {
  get() {
    return localStorage.getItem('theme') || 'light';
  },
  apply(t) {
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
    localStorage.setItem('theme', t);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = t === 'dark' ? 'Claro' : 'Oscuro';
  },
  toggle() {
    this.apply(this.get() === 'dark' ? 'light' : 'dark');
  },
  init() {
    this.apply(this.get());
  }
};

const FontSize = {
  get() {
    return localStorage.getItem('fontSize') || '100';
  },
  apply(v) {
    document.documentElement.dataset.fontSize = v;
    localStorage.setItem('fontSize', v);
  }
};

// ── Session helpers ─────────────────────────────────────────────────────────
const Session = {
  set(access, refresh, tipo, nombre, nombreCompleto) {
    sessionStorage.setItem('token', access);
    sessionStorage.setItem('refreshToken', refresh || '');
    sessionStorage.setItem('tipo', tipo);
    sessionStorage.setItem('nombre', nombre);
    sessionStorage.setItem('nombre_completo', nombreCompleto || nombre);
  },
  getToken() {
    return sessionStorage.getItem('token');
  },
  getRefresh() {
    return sessionStorage.getItem('refreshToken');
  },
  getTipo() {
    return sessionStorage.getItem('tipo');
  },
  clear() {
    sessionStorage.clear();
  }
};

// ── Toast notifications ─────────────────────────────────────────────────────
function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── API fetch with automatic refresh-token rotation ─────────────────────────
let refreshing = null;

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = Session.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(API_BASE + path, { ...options, headers });

  // Si el access token expiró, intentamos renovar una sola vez
  if (res.status === 401 && Session.getRefresh() && !options._retry) {
    await refreshAccess();
    const newToken = Session.getToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(API_BASE + path, { ...options, headers, _retry: true });
    }
  }
  return res;
}

async function refreshAccess() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = Session.getRefresh();
    if (!refreshToken) return;
    try {
      const res = await fetch(API_BASE + '/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        Session.set(
          data.token,
          data.refreshToken,
          Session.getTipo(),
          sessionStorage.getItem('nombre'),
          sessionStorage.getItem('nombre_completo')
        );
      } else {
        Session.clear();
        window.location.replace('/');
      }
    } catch {
      Session.clear();
      window.location.replace('/');
    }
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────
async function logout() {
  const refreshToken = Session.getRefresh();
  if (refreshToken) {
    try {
      await fetch(API_BASE + '/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      /* el logout falla silenciosamente */
    }
  }
  Session.clear();
  window.location.replace('/');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

// Extrae el mensaje de error de una respuesta JSON { error: '...' }
function parseError(data) {
  if (data && typeof data.error === 'string') return data.error;
  return 'Error inesperado.';
}

// ── Tema visual por capacitación ────────────────────────────────────────────
const TEMA_CAPACITACION = {
  robotica: { etiqueta: 'Robotica' },
  programacion: { etiqueta: 'Programacion' },
  marketing: { etiqueta: 'Marketing' },
  diseno: { etiqueta: 'Diseno' },
  pc: { etiqueta: 'PC y hardware' },
  ia: { etiqueta: 'Inteligencia Artificial' },
  administracion: { etiqueta: 'Administracion' },
  tecnico: { etiqueta: 'Tecnico' },
  salud: { etiqueta: 'Salud' },
  ingles: { etiqueta: 'Ingles' },
  general: { etiqueta: 'General' }
};

const REGLAS_TEMA = [
  ['robotica', /robot|mecatron|wokwi|arduino|automatismo/],
  ['programacion', /programac|codigo|software|algoritmo|script|web\b|python|java|javascript|ruby|pascal|c\+\+/],
  ['marketing', /marketing|publicidad|comercial|ventas|redes sociales|instagram|tiktok/],
  ['diseno', /diseno|grafico|render|animacion|ilustracion|3d|blender|photoshop/],
  ['pc', /\bpc\b|computador|computacion|soporte tecnico|hardware|armado/],
  ['ia', /\bia\b|asistente|inteligencia|automat|prompt|chatgpt|gpt/],
  ['administracion', /admin|pyme|contab|negoci|empresa|gestion/],
  ['tecnico', /tecnico|electric|electroni|redes|soldadura|industrial|mantenimiento|maquina|civil|obra/],
  ['salud', /salud|enfermeri|medic|cuidado/],
  ['ingles', /ingles|idioma/]
];

function temaCapacitacion(nombre) {
  const s = String(nombre || '').toLowerCase();
  for (const [slug, re] of REGLAS_TEMA) {
    if (re.test(s)) return slug;
  }
  return 'general';
}

window.toast = toast;
window.apiFetch = apiFetch;
window.parseError = parseError;
window.logout = logout;
window.escapeHtml = escapeHtml;
window.temaCapacitacion = temaCapacitacion;
window.TEMA_CAPACITACION = TEMA_CAPACITACION;

// ── PWA (8.4) ───────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

// Aplicar tema temprano (evita parpadeo)
Theme.init();
FontSize.apply(FontSize.get());
