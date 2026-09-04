'use strict';

const DEFAULT_MIN_PERCENT = 0.6; // 60% por defecto

// Normaliza el porcentaje configurado de una evaluación (0-100) a una fracción (0-1)
function fractionPorcentaje(porcentaje) {
  let p = parseInt(porcentaje, 10);
  if (!Number.isFinite(p)) p = DEFAULT_MIN_PERCENT * 100;
  if (p <= 0) p = 1;
  if (p > 100) p = 100;
  return p / 100;
}

function aprobacionMinima(totalPreguntas, porcentaje) {
  return Math.ceil(totalPreguntas * fractionPorcentaje(porcentaje));
}

function esAprobado(puntaje, totalPreguntas, porcentaje) {
  return puntaje !== null && puntaje !== undefined && puntaje >= aprobacionMinima(totalPreguntas, porcentaje);
}

function esAprobadoEvaluacion(ev, puntaje) {
  if (!ev) return false;
  return esAprobado(puntaje, ev.preguntas.length, ev.porcentaje);
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

// Mezcla el array de opciones de forma determinística por intento
function shuffle(arr, seed) {
  const a = arr.slice();
  if (a.length <= 1) return a;
  // Xorshift simple para reproducibilidad sin depender de Math.random global
  let s = (typeof seed === 'number' ? seed : Date.now()) >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Valida que `orden` sea una permutación válida para las opciones de una pregunta
function esPermutacionValida(orden, largo) {
  if (!Array.isArray(orden) || orden.length !== largo) return false;
  const vistos = new Set();
  for (const n of orden) {
    if (!Number.isInteger(n) || n < 0 || n >= largo || vistos.has(n)) return false;
    vistos.add(n);
  }
  return true;
}

module.exports = {
  DEFAULT_MIN_PERCENT,
  fractionPorcentaje,
  aprobacionMinima,
  esAprobado,
  esAprobadoEvaluacion,
  toCSV,
  shuffle,
  esPermutacionValida
};
