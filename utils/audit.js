'use strict';

// Registro de eventos de auditoría para trazabilidad (mejora 3.6).
// Se guarda en el propio documento (lista `logs`) para no depender de
// servicios externos.

const MAX_LOGS = 500;

function registrarLog(data, accion, detalle, actor) {
  if (!Array.isArray(data.logs)) data.logs = [];
  const entry = {
    id: data.logs.length > 0 ? Math.max(...data.logs.map((l) => l.id)) + 1 : 1,
    fecha: new Date().toISOString(),
    accion,
    actorId: actor ? actor.id : null,
    actorNombre: actor ? actor.nombre : 'sistema',
    actorTipo: actor ? actor.tipo : 'sistema',
    detalle: detalle || {}
  };
  data.logs.push(entry);
  // Evita que la lista crezca indefinidamente
  if (data.logs.length > MAX_LOGS) {
    data.logs = data.logs.slice(data.logs.length - MAX_LOGS);
  }
  return entry;
}

module.exports = { registrarLog, MAX_LOGS };
