// ── Confirm dialog reutilizable (reemplaza confirm()) ──────────────────────
function showConfirm({ title, message, confirmText = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('confirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'confirmOverlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-card confirm-card">
          <div class="modal-icon confirm-icon"></div>
          <div class="modal-title confirm-title"></div>
          <div class="modal-text confirm-text"></div>
          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel confirm-cancel">Cancelar</button>
            <button type="button" class="btn-modal-confirm confirm-ok"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    const icon = overlay.querySelector('.confirm-icon');
    icon.textContent = danger ? '\u26A0' : '\u2753';
    overlay.querySelector('.confirm-title').textContent = title || 'Confirmar';
    overlay.querySelector('.confirm-text').textContent = message || '';
    const okBtn = overlay.querySelector('.confirm-ok');
    okBtn.textContent = confirmText;
    okBtn.className = 'btn-modal-confirm confirm-ok' + (danger ? ' danger' : '');

    const close = (val) => {
      overlay.classList.remove('visible');
      overlay.onclick = null;
      cancelBtn.onclick = null;
      okBtn.onclick = null;
      resolve(val);
    };
    const cancelBtn = overlay.querySelector('.confirm-cancel');
    cancelBtn.onclick = () => close(false);
    okBtn.onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    overlay.classList.add('visible');
  });
}

// ── Descarga de archivos desde una respuesta fetch ──────────────────────────
async function downloadFromResponse(res, fallbackName) {
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const fileName = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
