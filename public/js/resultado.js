const resultado = JSON.parse(sessionStorage.getItem('resultado'));
const card = document.getElementById('resultadoCard');

if (!resultado) {
  card.innerHTML = `
    <div class="loading-container">
      <h3>No hay resultado para mostrar</h3>
      <a href="/dashboard" class="btn-volver" style="margin-top:16px;max-width:200px;">Volver al inicio</a>
    </div>`;
} else {
  const pct = Math.round((resultado.puntaje / resultado.totalPreguntas) * 100);
  const aprobado = resultado.aprobado;
  const porcentajeMin = resultado.porcentajeAprobacion || 60;
  const minimo = Math.ceil(resultado.totalPreguntas * (porcentajeMin / 100));
  const intentosMax = resultado.intentosMax || 3;

  card.innerHTML = `
    <div class="resultado-icon-wrap ${aprobado ? 'aprobado' : 'desaprobado'}">
      ${aprobado ? '&#10003;' : '&#10007;'}
    </div>
    <div class="resultado-badge ${aprobado ? 'aprobado' : 'desaprobado'}">
      ${aprobado ? 'APROBADO' : 'DESAPROBADO'}
    </div>
    <div class="resultado-score ${aprobado ? 'aprobado' : 'desaprobado'}">${resultado.puntaje}/${resultado.totalPreguntas}</div>
    <div class="resultado-total">${resultado.totalPreguntas} preguntas totales</div>
    <div class="resultado-porcentaje">${pct}% de aciertos</div>
    <div class="resultado-divider"></div>
    <div class="resultado-info">
      <div class="resultado-info-item">
        <span class="label">Intento</span>
        <span class="value">${resultado.intentoActual} de ${intentosMax}</span>
      </div>
      <div class="resultado-info-item">
        <span class="label">Minimo para aprobar</span>
        <span class="value">${minimo}/${resultado.totalPreguntas} (${porcentajeMin}%)</span>
      </div>
      <div class="resultado-info-item">
        <span class="label">Correctas</span>
        <span class="value" style="color:var(--success);font-weight:700;">${resultado.detalle.filter((d) => d.esCorrecta).length}</span>
      </div>
      <div class="resultado-info-item">
        <span class="label">Incorrectas</span>
        <span class="value" style="color:var(--danger);font-weight:700;">${resultado.detalle.filter((d) => !d.esCorrecta).length}</span>
      </div>
    </div>
    <div class="resultado-divider"></div>
    <a href="/dashboard" class="btn-volver">Volver a mis evaluaciones</a>
    ${
      aprobado && resultado.certificadoDisponible
        ? `
      <a href="/certificado?evaluacionId=${encodeURIComponent(resultado.evaluacionId || '')}" class="btn-certificado-full">Ver mi certificado / Constancia</a>`
        : ''
    }
    <button class="btn-repasar" id="btnRepasar" type="button">Revisar respuestas y explicaciones</button>
  `;

  document.getElementById('btnRepasar').addEventListener('click', () => {
    const detalle = document.getElementById('resultadoDetalle');
    const visible = detalle.style.display !== 'none';
    detalle.style.display = visible ? 'none' : 'block';
    document.getElementById('btnRepasar').textContent = visible
      ? 'Revisar respuestas y explicaciones'
      : 'Ocultar respuestas';
    if (!visible) renderDetalle();
  });

  function renderDetalle() {
    const detalle = document.getElementById('resultadoDetalle');
    detalle.innerHTML = `<div class="detalle-wrap">
      <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px;">Desglose de respuestas y explicaciones</h3>
      ${resultado.detalle
        .map((d, i) => {
          const letras = ['A', 'B', 'C', 'D'];
          const tipo = d.tipo && d.tipo !== 'opcion' ? d.tipo : 'opcion';
          const cuerpo =
            tipo === 'desarrollo'
              ? `<div class="detalle-respuestas">
            <div class="detalle-opcion-texto">${escapeHtml(d.respuestaTexto || '(sin respuesta)')}</div>
          </div>`
              : `<div class="detalle-respuestas">
            ${d.opciones
              .map((op, oi) => {
                const isCorrect = oi === d.correcta;
                const isUser = oi === d.respondida;
                let cls = 'detalle-opt';
                if (isCorrect) cls += ' correct';
                if (isUser && !isCorrect) cls += ' wrong';
                return `<div class="${cls}">${letras[oi]}. ${escapeHtml(op)} ${isCorrect ? '(correcta)' : ''} ${isUser && isCorrect ? '(tu respuesta)' : ''}</div>`;
              })
              .join('')}
          </div>`;
          return `
        <div class="detalle-item">
          <div class="detalle-q">
            <span class="detalle-num">${i + 1}.</span>
            <span class="detalle-state ${d.esCorrecta ? 'ok' : 'bad'}">${d.esCorrecta ? '&#10003; Correcta' : '&#10007; Incorrecta'}</span>
          </div>
          <div class="detalle-pregunta">${escapeHtml(d.pregunta)}</div>
          ${cuerpo}
          ${d.explicacion ? `<div class="detalle-explicacion"><strong>Explicacion:</strong> ${escapeHtml(d.explicacion)}</div>` : ''}
        </div>`;
        })
        .join('')}
    </div>`;
  }
}
