const token = Session.getToken();
const tipo = Session.getTipo();

if (!token) window.location.replace('/');
if (tipo === 'profesor' || tipo === 'admin') window.location.replace('/profesor');

const evId = new URLSearchParams(window.location.search).get('evaluacionId');
const main = document.getElementById('certificate');

async function cargarCertificado() {
  if (!evId) {
    main.innerHTML = `<div class="loading-container"><h3>Falta el identificador de la evaluacion</h3><a href="/dashboard" class="btn-volver">Volver</a></div>`;
    return;
  }
  try {
    const res = await apiFetch(`/certificado/${encodeURIComponent(evId)}`);
    if (res.status === 401) {
      Session.clear();
      window.location.replace('/');
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      main.innerHTML = `<div class="loading-container"><h3>No hay certificado disponible</h3><p>${parseError(data)}</p><a href="/dashboard" class="btn-volver" style="margin-top:16px;">Volver</a></div>`;
      return;
    }

    const c = data.certificado;
    main.innerHTML = `
      <div class="certificado-sheet" role="document" aria-label="Certificado de aprobacion">
        <div class="cert-top">
          <img src="/img/logo-itc.svg" alt="Instituto Tecnico de Capacitacion" class="cert-logo">
          <div class="cert-codigo">${escapeHtml(c.codigo)}</div>
        </div>
        <div class="cert-title">Certificado de Aprobacion</div>
        <div class="cert-subtitle">Instituto Tecnico de Capacitacion</div>
        <div class="cert-ornament"></div>
        <p class="cert-text">Se otorga el presente certificado a</p>
        <div class="cert-alumno">${escapeHtml(c.alumno)}</div>
        <p class="cert-text">por haber aprobado la capacitacion</p>
        <div class="cert-capacitacion">${escapeHtml(c.capacitacion)}</div>
        <div class="cert-titulo">${escapeHtml(c.titulo)}</div>
        <div class="cert-meta">
          <span class="cert-meta-item"><strong>Puntaje:</strong> ${c.puntaje}/${c.totalPreguntas}</span>
          <span class="cert-meta-item"><strong>Porcentaje obtenido:</strong> ${c.porcentajeObtenido}%</span>
          <span class="cert-meta-item"><strong>Minimo requerido:</strong> ${c.porcentajeMinimo}%</span>
        </div>
        <div class="cert-ornament"></div>
        <div class="cert-footer">
          <div class="cert-fecha">Fecha: ${formatCertFecha(c.fecha)}</div>
          <div class="cert-firma">Firma del instructor</div>
        </div>
      </div>`;
  } catch (err) {
    main.innerHTML = `<div class="loading-container"><h3>Error al cargar el certificado</h3><p>${err.message}</p></div>`;
  }
}

function formatCertFecha(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

cargarCertificado();
