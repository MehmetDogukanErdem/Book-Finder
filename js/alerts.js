(function(){
  function showAlert(message, type = 'info', timeout = 3000) {
    try {
      const id = 'site-alerts';
      let container = document.getElementById(id);
      if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.className = 'alerts-container';
        document.body.appendChild(container);
      }

      const el = document.createElement('div');
      el.className = `alert alert-${type}`;

      const msgWrap = document.createElement('div');
      msgWrap.className = 'alert-message';

      let icon = null;
      switch (type) {
        case 'success':
          icon = document.createElement('i');
          icon.className = 'fa-regular fa-circle-check';
          icon.style.color = '#12c009ff';
          break;
        case 'info':
          icon = document.createElement('i');
          icon.className = 'fa-solid fa-circle-info';
          icon.style.color = '#0386e9ff';
          break;
        case 'fail':
        case 'error':
        case 'danger':
          icon = document.createElement('i');
          icon.className = 'fa-solid fa-triangle-exclamation';
          icon.style.color = '#ed0c0c';
          break;
      }
      if (icon) msgWrap.appendChild(icon);

      const msgText = document.createElement('span');
      msgText.textContent = message;
      msgWrap.appendChild(msgText);

      el.appendChild(msgWrap);

      const close = document.createElement('span');
      close.className = 'closebtn';
      close.setAttribute('role', 'button');
      close.innerHTML = '&times;';
      close.addEventListener('click', () => el.remove());
      el.appendChild(close);

      container.appendChild(el);

      setTimeout(() => el.classList.add('show'), 10);

      const t = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 180); }, timeout);
      return el;
    } catch (e) {
      try { window.alert(message); } catch (er) {}
    }
  }

  if (typeof window !== 'undefined') window.showAlert = showAlert;

  function showConfirm(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      try {
        const id = 'site-alerts';
        let container = document.getElementById(id);
        if (!container) {
          container = document.createElement('div');
          container.id = id;
          container.className = 'alerts-container';
          document.body.appendChild(container);
        }

        const wrap = document.createElement('div');
        wrap.className = 'confirm-wrap';

        const box = document.createElement('div');
        box.className = 'confirm-box';

        const msg = document.createElement('div');
        msg.className = 'confirm-message';
        msg.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'confirm-actions';

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-outline-light btn-sm';
        btnCancel.textContent = opts.cancelText || 'Cancel';
        const btnOk = document.createElement('button');
        btnOk.className = 'btn btn-primary btn-sm';
        btnOk.textContent = opts.confirmText || 'Confirm';

        btnCancel.addEventListener('click', () => { wrap.remove(); resolve(false); });
        btnOk.addEventListener('click', () => { wrap.remove(); resolve(true); });

        actions.appendChild(btnCancel);
        actions.appendChild(btnOk);
        box.appendChild(msg);
        box.appendChild(actions);
        wrap.appendChild(box);
        container.appendChild(wrap);

        setTimeout(() => wrap.classList.add('show'), 10);
        const cleanup = (val) => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 180); resolve(val); };
        btnCancel.addEventListener('click', () => cleanup(false));
        btnOk.addEventListener('click', () => cleanup(true));
        wrap.addEventListener('click', (e) => { if (e.target === wrap) cleanup(false); });
        btnOk.focus();
      } catch (e) {
        resolve(false);
      }
    });
  }

  if (typeof window !== 'undefined') window.showConfirm = showConfirm;
})();