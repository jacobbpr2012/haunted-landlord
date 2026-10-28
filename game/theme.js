// Theme switcher shared by the homepage, Idle and Simulator. Loaded in <head> so the theme applies before first paint.
(function (root) {
  'use strict';
  const KEY = 'haunted_landlord_theme';
  const THEMES = [
    { id: 'midnight', name: 'Midnight concierge' }, { id: 'deco', name: 'Art deco lobby' }, { id: 'neon', name: 'Neon motel' },
    { id: 'victorian', name: 'Victorian inn' }, { id: 'pastel', name: 'Pastel grand hotel' }, { id: 'noir', name: 'Noir check-in' },
    { id: 'seventies', name: 'Seventies lodge' }, { id: 'overlook', name: 'Overlook carpet' }, { id: 'bnb', name: 'Cozy bed and breakfast' },
    { id: 'liner', name: 'Ghost liner' },
  ];
  function get() {
    try { const t = root.localStorage.getItem(KEY); if (THEMES.some((x) => x.id === t)) return t; } catch (e) { /* storage blocked */ }
    return 'midnight';
  }
  function apply(id) { root.document.documentElement.setAttribute('data-theme', id); }
  function set(id) {
    if (!THEMES.some((x) => x.id === id)) return;
    try { root.localStorage.setItem(KEY, id); } catch (e) { /* storage blocked */ }
    apply(id);
  }
  // Markup for a theme dropdown. The change handler below wires every #themeSel on the page.
  function selectHtml() {
    const cur = get();
    return '<select id="themeSel" aria-label="Theme" style="padding:8px;border-radius:var(--r);border:1px solid var(--line);background:var(--deep);color:var(--text);font:inherit">' +
      THEMES.map((t) => `<option value="${t.id}"${t.id === cur ? ' selected' : ''}>${t.name}${t.id === 'midnight' ? ' (default)' : ''}</option>`).join('') + '</select>';
  }
  apply(get());
  root.document.addEventListener('change', (e) => { if (e.target && e.target.id === 'themeSel') set(e.target.value); });
  root.HLTheme = { THEMES, get, set, selectHtml };
})(window);
