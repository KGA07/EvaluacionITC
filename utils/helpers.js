'use strict';

const MIN_PERCENT = 0.6; // 60% para aprobar

function aprobacionMinima(totalPreguntas) {
  return Math.ceil(totalPreguntas * MIN_PERCENT);
}

function esAprobado(puntaje, totalPreguntas) {
  return puntaje !== null && puntaje >= aprobacionMinima(totalPreguntas);
}

// Convierte un array de objetos a CSV
function toCSV(headers, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  rows.forEach((row) => lines.push(row.map(escape).join(',')));
  return lines.join('\r\n');
}

module.exports = { MIN_PERCENT, aprobacionMinima, esAprobado, toCSV };
