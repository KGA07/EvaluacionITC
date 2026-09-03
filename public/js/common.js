const API_BASE = '/api';

// ── Session helpers ─────────────────────────────────────────────────────────
const Session = {
  set(access, refresh, tipo, nombre, nombreCompleto) {
    sessionStorage.setItem('token', access);
    sessionStorage.setItem('refreshToken', refresh || '');
    sessionStorage.setItem('tipo', tipo);
    sessionStorage.setItem('nombre', nombre);
    sessionStorage.setItem('nombre_completo', nombreCompleto || nombre);
  },
  getToken() { return sessionStorage.getItem('token'); },
  getRefresh() { return sessionStorage.getItem('refreshToken'); },
  getTipo() { return sessionStorage.getItem('tipo'); },
  clear() { sessionStorage.clear(); }
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
        Session.set(data.token, data.refreshToken, Session.getTipo(), sessionStorage.getItem('nombre'), sessionStorage.getItem('nombre_completo'));
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

function parseError(data) {
  return (data && data.error) || 'Error en la peticion.';
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
    } catch {}
  }
  Session.clear();
  window.location.replace('/');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
