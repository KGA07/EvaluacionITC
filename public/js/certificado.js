const token = Session.getToken();
const tipo = Session.getTipo();

if (!token) window.location.replace('/');
if (tipo === 'profesor' || tipo === 'admin') window.location.replace('/profesor');

const evId = new URLSearchParams(window.location.search).get('evaluacionId');
const main = document.getElementById('certificate');

function formatDNI(dni) {
  const s = String(dni || '').replace(/\D/g, '');
  return s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}

function formatFechaLarga(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

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
    const dni = formatDNI(c.dni);
    const sitio = window.location.origin;

    main.innerHTML = `
      <div class="certificado-sheet" role="document" aria-label="Certificado de aprobacion">
        <div class="cert-top-stripe"></div>

        <header class="cert-header">
          <div class="cert-header-side">
            <img src="/img/logo-itc.svg" alt="Informatic Training Center" class="cert-header-logo">
            <span class="cert-header-text">${escapeHtml(c.institucion)}</span>
          </div>
          <div class="cert-header-center">
            <h1 class="cert-header-title">${escapeHtml(c.institucionTitulo)}</h1>
          </div>
          <div class="cert-header-side cert-header-side-right">
            <img src="/img/logo-udemm.svg" alt="UdeMM" class="cert-header-logo">
            <span class="cert-header-text">${escapeHtml(c.universidad)}</span>
          </div>
        </header>

        <div class="cert-body">
          <section class="cert-apertura">
            <p class="cert-por-cuanto">Por cuanto</p>
            <h2 class="cert-alumno">${escapeHtml(c.alumno)}</h2>
            ${dni ? `<p class="cert-dni">DNI: ${dni}</p>` : ''}
          </section>

          <section class="cert-cuerpo">
            <p>
              Ha participado y aprobado la capacitacion en &laquo;${escapeHtml(c.capacitacion)}&raquo;,
              superando la evaluacion correspondiente con un puntaje de
              ${c.puntaje}/${c.totalPreguntas} (${c.porcentajeObtenido}%), siendo el minimo
              requerido del ${c.porcentajeMinimo}%.
            </p>
            <p class="cert-resolucion">Se le extiende el presente certificado de <strong class="cert-aprobacion">APROBACION</strong>.</p>
          </section>

          <section class="cert-firmas">
            <div class="cert-firma">
              <div class="cert-firma-linea"></div>
              <div class="cert-firma-nombre">${escapeHtml(c.director)}</div>
              <div class="cert-firma-cargo">${escapeHtml(c.directorCargo)}</div>
            </div>
            <div class="cert-firma">
              <div class="cert-firma-linea"></div>
              <div class="cert-firma-nombre">${escapeHtml(c.instructor)}</div>
              <div class="cert-firma-cargo">${escapeHtml(c.instructorCargo)}</div>
            </div>
          </section>
        </div>

        <footer class="cert-footer">
          <div class="cert-footer-item cert-fecha">Fecha de Emision: ${formatFechaLarga(c.fecha)}</div>
          <div class="cert-footer-item cert-validacion">Para verificar la autenticidad de este documento acceda a: ${escapeHtml(sitio)}/certificado e ingrese el codigo.</div>
          <div class="cert-footer-item cert-codigo">Codigo del certificado: ${escapeHtml(c.codigo)}</div>
        </footer>

        <div class="cert-bottom-stripe"></div>
      </div>`;
  } catch (err) {
    main.innerHTML = `<div class="loading-container"><h3>Error al cargar el certificado</h3><p>${err.message}</p></div>`;
  }
}

cargarCertificado();