const API_BASE = '/api';

const loginForm     = document.getElementById('loginForm');
const nombreInput   = document.getElementById('nombre');
const passwordInput = document.getElementById('password');
const labelNombre   = document.getElementById('labelNombre');
const errorMessage  = document.getElementById('errorMessage');
const errorText     = document.getElementById('errorText');
const loginBtn      = document.getElementById('loginBtn');
const btnText       = loginBtn.querySelector('.btn-text');
const btnLoader     = loginBtn.querySelector('.btn-loader');

let selectedType = 'alumno';

if (sessionStorage.getItem('token')) {
  const tipo = sessionStorage.getItem('tipo');
  window.location.replace(tipo === 'profesor' ? '/profesor' : '/dashboard');
}

document.querySelectorAll('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedType = btn.dataset.type;
    labelNombre.textContent  = selectedType === 'profesor' ? 'Nombre de Instructor' : 'Nombre de Alumno';
    nombreInput.placeholder  = selectedType === 'profesor' ? 'Ingresa tu usuario de instructor' : 'Ingresa tu usuario';
    hideError();
    nombreInput.focus();
  });
});

[nombreInput, passwordInput].forEach((el) => el.addEventListener('input', hideError));

function showError(msg) { errorText.textContent = msg; errorMessage.classList.add('visible'); }
function hideError()    { errorMessage.classList.remove('visible'); }

function setLoading(on) {
  loginBtn.disabled = on;
  btnText.classList.toggle('hidden', on);
  btnLoader.classList.toggle('hidden', !on);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const nombre   = nombreInput.value.trim();
  const password = passwordInput.value.trim();
  if (!nombre || !password) { showError('Por favor completa todos los campos.'); return; }

  setLoading(true);
  try {
    const res  = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, password, tipo: selectedType }),
    });
    const data = await res.json();

    if (!res.ok) { showError(data.error || 'Error al iniciar sesion.'); return; }

    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('tipo',  data.tipo);
    sessionStorage.setItem('nombre', data.nombre);
    sessionStorage.setItem('nombre_completo', data.nombre_completo);

    if (data.tipo === 'alumno') {
      window.location.replace('/dashboard');
    } else {
      window.location.replace('/profesor');
    }
  } catch {
    showError('No se pudo conectar con el servidor.');
  } finally {
    setLoading(false);
  }
});
