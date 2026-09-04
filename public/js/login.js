const loginForm = document.getElementById('loginForm');
const nombreInput = document.getElementById('nombre');
const passwordInput = document.getElementById('password');
const labelNombre = document.getElementById('labelNombre');
const cardTitle = document.getElementById('cardTitle');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const loginBtn = document.getElementById('loginBtn');
const btnText = loginBtn.querySelector('.btn-text');
const btnLoader = loginBtn.querySelector('.btn-loader');

let selectedType = 'alumno';

if (Session.getToken()) {
  window.location.replace(
    Session.getTipo() === 'profesor' || Session.getTipo() === 'admin' ? '/profesor' : '/dashboard'
  );
}

const toggleButtons = document.querySelectorAll('.type-toggle .toggle-btn');
toggleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    selectedType = btn.dataset.type;
    const labels = {
      alumno: { l: 'Nombre de Alumno', p: 'Ingresa tu usuario' },
      profesor: { l: 'Nombre de Instructor', p: 'Ingresa tu usuario de instructor' },
      admin: { l: 'Usuario Administrador', p: 'Usuario de administracion' }
    };
    const cfg = labels[selectedType] || labels.alumno;
    labelNombre.textContent = cfg.l;
    nombreInput.placeholder = cfg.p;
    cardTitle.textContent = selectedType === 'admin' ? 'Acceso de Administrador' : 'Iniciar Sesion';
    hideError();
    nombreInput.focus();
  });
});

[nombreInput, passwordInput].forEach((el) => el.addEventListener('input', hideError));

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.classList.add('visible');
}
function hideError() {
  errorMessage.classList.remove('visible');
}

function setLoading(on) {
  loginBtn.disabled = on;
  btnText.classList.toggle('hidden', on);
  btnLoader.classList.toggle('hidden', !on);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const nombre = nombreInput.value.trim();
  const password = passwordInput.value.trim();
  if (!nombre || !password) {
    showError('Por favor completa todos los campos.');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, password, tipo: selectedType })
    });
    const data = await res.json();

    if (res.status === 429) {
      showError(data.error || 'Demasiados intentos. Intenta mas tarde.');
      return;
    }
    if (!res.ok) {
      showError(data.error || 'Error al iniciar sesion.');
      return;
    }

    Session.set(data.token, data.refreshToken, data.tipo, data.nombre, data.nombre_completo);

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

// ── Recuperar contrasena (2.3) ──────────────────────────────────────────────
const recoverModal = document.getElementById('recoverModal');
const recoverForm = document.getElementById('recoverForm');
const recoverNombre = document.getElementById('recoverNombre');
const recoverRespuesta = document.getElementById('recoverRespuesta');
const recoverNueva = document.getElementById('recoverNueva');
const recoverQuestionWrap = document.getElementById('recoverQuestionWrap');
const recoverQuestionLabel = document.getElementById('recoverQuestionLabel');
const recoverError = document.getElementById('recoverError');
const recoverErrorText = document.getElementById('recoverErrorText');
const btnRecoverNext = document.getElementById('btnRecoverNext');
let recoverType = 'alumno';
let recoverStep = 1;
let resetToken = null;

document.getElementById('btnRecover').addEventListener('click', () => {
  recoverForm.reset();
  recoverQuestionWrap.classList.add('hidden');
  recoverError.classList.remove('visible');
  recoverStep = 1;
  resetToken = null;
  btnRecoverNext.textContent = 'Continuar';
  recoverModal.classList.add('visible');
  setTimeout(() => recoverNombre.focus(), 50);
});

document.getElementById('btnRecoverCancel').addEventListener('click', () => {
  recoverModal.classList.remove('visible');
});

recoverForm.querySelectorAll('.type-toggle .toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    recoverForm.querySelectorAll('.type-toggle .toggle-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    recoverType = btn.dataset.type;
  });
});

async function preguntaRecuperacion() {
  const nombre = recoverNombre.value.trim();
  if (!nombre) {
    recoverErrorText.textContent = 'Ingresa tu usuario.';
    recoverError.classList.add('visible');
    return;
  }
  recoverError.classList.remove('visible');
  btnRecoverNext.disabled = true;
  btnRecoverNext.textContent = 'Buscando...';
  try {
    const res = await fetch(`${API_BASE}/recuperar/pregunta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tipo: recoverType })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo recuperar.');
    recoverQuestionLabel.textContent = `Pregunta secreta: ${data.pregunta}`;
    recoverQuestionWrap.classList.remove('hidden');
    recoverStep = 2;
    btnRecoverNext.textContent = 'Verificar y cambiar';
    setTimeout(() => recoverRespuesta.focus(), 50);
  } catch (err) {
    recoverErrorText.textContent = err.message;
    recoverError.classList.add('visible');
  } finally {
    btnRecoverNext.disabled = false;
  }
}

async function verificarRecuperacion() {
  const nombre = recoverNombre.value.trim();
  const respuesta = recoverRespuesta.value.trim();
  if (!respuesta) {
    recoverErrorText.textContent = 'Ingresa tu respuesta.';
    recoverError.classList.add('visible');
    return;
  }
  recoverError.classList.remove('visible');
  btnRecoverNext.disabled = true;
  btnRecoverNext.textContent = 'Verificando...';
  try {
    const res = await fetch(`${API_BASE}/recuperar/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, tipo: recoverType, respuesta })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verificacion fallida.');
    resetToken = data.resetToken;
    recoverStep = 3;
    btnRecoverNext.textContent = 'Guardar nueva contrasena';
    setTimeout(() => recoverNueva.focus(), 50);
  } catch (err) {
    recoverErrorText.textContent = err.message;
    recoverError.classList.add('visible');
  } finally {
    btnRecoverNext.disabled = false;
  }
}

async function cambiarContrasenaRecuperada() {
  const passwordNueva = recoverNueva.value.trim();
  if (!passwordNueva || passwordNueva.length < 4) {
    recoverErrorText.textContent = 'La nueva contrasena debe tener al menos 4 caracteres.';
    recoverError.classList.add('visible');
    return;
  }
  recoverError.classList.remove('visible');
  btnRecoverNext.disabled = true;
  btnRecoverNext.textContent = 'Guardando...';
  try {
    const res = await fetch(`${API_BASE}/recuperar/contrasena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, passwordNueva })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar la contrasena.');
    recoverModal.classList.remove('visible');
    toast('Contrasena actualizada. Ingresa con tu nueva contrasena.', 'success');
    nombreInput.value = recoverNombre.value.trim();
    passwordInput.value = '';
    hideError();
  } catch (err) {
    recoverErrorText.textContent = err.message;
    recoverError.classList.add('visible');
  } finally {
    btnRecoverNext.disabled = false;
    btnRecoverNext.textContent = 'Continuar';
  }
}

recoverForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (recoverStep === 1) preguntaRecuperacion();
  else if (recoverStep === 2) verificarRecuperacion();
  else cambiarContrasenaRecuperada();
});
