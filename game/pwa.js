// PWA glue: service worker registration, install prompt, notification helper. Plain global HLPwa.
(function () {
  'use strict';
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  let deferred = null;
  const listeners = [];
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  let reg = null;
  if (secure && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then((r) => { reg = r; }).catch(() => {});
    });
  }

  function state() {
    return { canInstall: !!deferred && !standalone(), iosHint: ios && !standalone() && !deferred, installed: standalone() };
  }
  function emit() { const s = state(); listeners.forEach((f) => { try { f(s); } catch (e) { /* ignore */ } }); }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });

  window.HLPwa = {
    state,
    onChange(f) { listeners.push(f); f(state()); },
    install() {
      if (!deferred) return Promise.resolve(false);
      const d = deferred; deferred = null; emit();
      d.prompt();
      return d.userChoice.then((c) => c && c.outcome === 'accepted').catch(() => false);
    },
    // Uses the service worker registration when available (works when the tab is backgrounded/installed), else Notification.
    notify(title, body) {
      try {
        if (!('Notification' in window) || Notification.permission !== 'granted') return false;
        const opts = { body: body || '', icon: 'icon-192.png', badge: 'icon-192.png' };
        if (reg && reg.showNotification) { reg.showNotification(title, opts); return true; }
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(() => new Notification(title, opts));
          return true;
        }
        new Notification(title, opts); return true;
      } catch (e) { return false; }
    },
  };
})();
