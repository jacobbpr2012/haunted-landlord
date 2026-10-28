// Everything that touches the DOM.
(function () {
  'use strict';
  const D = window.HLData, Snd = window.HLSound;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const DEV = qs.get('dev') === '1';

  // ---------- helpers ----------
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n, dec) {
    if (!isFinite(n)) return 'Infinity';
    if (n < 1000) return dec != null && n < 100 ? n.toFixed(dec).replace(/\.0+$/, '') : String(Math.floor(n));
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= SUF.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(1000, e);
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUF[e];
  }
  window.HLFormat = fmt;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function dur(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h}h ${m}m` : m ? `${m}m ${sec % 60}s` : `${sec}s`;
  }

  function safeStorage() { try { const s = window.localStorage; s.getItem('x'); return s; } catch (e) { return null; } }
  const g = new window.HLEngine.Game(safeStorage());
  const hadSave = g.load();
  window.HL = { g, fmt }; // handy in DevTools

  // ---------- ghost art ----------
  const FAMACC = {
    victorian: '<rect x="11" y="-4" width="18" height="9" fill="#222"/><rect x="7" y="4" width="26" height="3" fill="#222"/>',
    retro: '<rect x="8" y="17" width="10" height="6" rx="2" fill="#19e6ff"/><rect x="22" y="17" width="10" height="6" rx="2" fill="#ff3fa8"/><rect x="18" y="19" width="4" height="2" fill="#111"/>',
    office: '<path d="M20 33 l-3 4 3 10 3 -10z" fill="#2b5fb8"/><rect x="16" y="31" width="8" height="3" fill="#fff"/>',
    sea: '<path d="M5 8 q15 -18 30 0 z" fill="#222"/><circle cx="14" cy="21" r="4.4" fill="#111"/>',
    west: '<ellipse cx="20" cy="6" rx="18" ry="3.5" fill="#8a5a2a"/><path d="M12 6 q8 -14 16 0z" fill="#8a5a2a"/>',
    kids: '<path d="M20 5 l-9 -6 v12z M20 5 l9 -6 v12z" fill="#ff6fa8"/>',
    beasts: '<path d="M7 11 l1 -13 9 8z M33 11 l-1 -13 -9 8z" fill="#ffffffaa"/>',
    cosmic: '<path d="M20 4 v-10" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="-8" r="3.2" fill="#7ac8ff"/>',
    holiday: '<path d="M20 -8 l2.5 5 5.5 .8 -4 4 1 5.5 -5 -2.7 -5 2.7 1 -5.5 -4 -4 5.5 -.8z" fill="#fff6a0"/>',
  };
  function ghostSVG(id, color) {
    const acc = ({
      beatrix: '<path d="M9 9 q11 -13 22 0 z" fill="#5a3a8a"/><circle cx="20" cy="-1" r="3" fill="#e0b0ff"/>',
      dan: '<rect x="8" y="17" width="10" height="6" rx="2" fill="#111"/><rect x="22" y="17" width="10" height="6" rx="2" fill="#111"/><rect x="18" y="19" width="4" height="2" fill="#111"/>',
      pete: '<path d="M10 8 l-5 -9 l10 5z M30 8 l5 -9 l-10 5z" fill="#d94a2a"/>',
      accountant: '<rect x="9" y="16" width="9" height="8" rx="1" fill="none" stroke="#222" stroke-width="1.6"/><rect x="22" y="16" width="9" height="8" rx="1" fill="none" stroke="#222" stroke-width="1.6"/><path d="M20 33 l-3 5 3 8 3 -8z" fill="#c0392b"/>',
      mabel: '<path d="M20 -6 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#fff6a0" transform="translate(0 -2) scale(1)"/>',
      karen: '<path d="M6 22 q0 -22 14 -22 q14 0 14 22 q-4 -12 -14 -12 q-10 0 -14 12z" fill="#e8c26a"/>',
      hoa: '<rect x="9" y="3" width="22" height="5" rx="2" fill="#2f7a4a"/><rect x="25" y="32" width="9" height="12" fill="#f4ecd0" stroke="#555" stroke-width=".8"/>',
      chad: '<rect x="8" y="17" width="24" height="5" rx="2" fill="#111"/><circle cx="20" cy="38" r="3" fill="#ffd24a"/>',
      dolores: '<path d="M10 30 q10 10 20 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-dasharray="1 2.4"/><circle cx="14" cy="21" r="5" fill="none" stroke="#333" stroke-width="1.2"/><circle cx="26" cy="21" r="5" fill="none" stroke="#333" stroke-width="1.2"/>',
      landlord: '<path d="M8 6 l4 -10 5 6 3 -9 3 9 5 -6 4 10z" fill="#ffd24a"/><circle cx="32" cy="40" r="3" fill="none" stroke="#ffd24a" stroke-width="1.5"/>',
    }[id]) || (D.LMAP[id] ? FAMACC[D.LMAP[id].fam] || '' : '');
    return `<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M4 46V20a16 16 0 0 1 32 0V46l-6.4-5-6.4 5-6.4-5-6.4 5-6.4-5z" fill="${color}" fill-opacity=".95" stroke="#ffffff55" stroke-width="1.2"/><circle cx="14" cy="21" r="2.4" fill="#1b1030"/><circle cx="26" cy="21" r="2.4" fill="#1b1030"/><path d="M16 29q4 3.5 8 0" stroke="#1b1030" stroke-width="1.6" fill="none" stroke-linecap="round"/>${acc}</svg>`;
  }

  // ---------- house scene (also used when visiting other houses) ----------
  function decorSVG(id) {
    switch (id) {
      case 'cobwebs': return '<g stroke="#ddd" stroke-width=".8" fill="none" opacity=".65"><path d="M0 0 L46 0 M0 0 L0 46 M0 0 L34 34 M10 0 Q10 10 0 10 M22 0 Q22 22 0 22 M34 0 Q34 34 0 34"/></g><g stroke="#ddd" stroke-width=".8" fill="none" opacity=".65" transform="translate(400 0) scale(-1 1)"><path d="M0 0 L46 0 M0 0 L0 46 M0 0 L34 34 M10 0 Q10 10 0 10 M22 0 Q22 22 0 22 M34 0 Q34 34 0 34"/></g>';
      case 'bats': return [[130, 26], [170, 40], [60, 34]].map((p, i) => `<path class="flit" style="animation-delay:${i * .6}s" transform="translate(${p[0]} ${p[1]})" d="M0 0 q4 -6 8 0 q4 -6 8 0 q-4 2 -8 6 q-4 -4 -8 -6z" fill="#0d0818"/>`).join('');
      case 'tombs': return '<g fill="#6e6e8c"><rect x="22" y="122" width="14" height="26" rx="7"/><rect x="44" y="130" width="12" height="18" rx="5"/><rect x="62" y="125" width="13" height="23" rx="6"/></g><g stroke="#2a2a3a" stroke-width="1.4"><path d="M29 130v10M25 134h8"/></g>';
      case 'lights': {
        let s = '';
        for (let i = 0; i < 9; i++) {
          const x = 24 + i * 19, y = 150 - (x - 10) * 0.547 - 4, col = ['#ff5a5a', '#ffd24a', '#5aff9a', '#6ab8ff'][i % 4];
          s += `<circle cx="${x}" cy="${y.toFixed(1)}" r="2.4" fill="${col}"/><circle cx="${400 - x}" cy="${y.toFixed(1)}" r="2.4" fill="${col}"/>`;
        }
        return s;
      }
      case 'gnome': return '<g transform="translate(346 124)"><path d="M0 0 l5 -14 l5 14z" fill="#d94a2a"/><rect x="1" y="0" width="8" height="12" rx="2" fill="#4a7ad0"/><circle cx="5" cy="3" r="3" fill="#f2d2b0"/><path d="M2 5 q3 7 6 0z" fill="#fff"/></g>';
      case 'lantern': return '<g transform="translate(60 98)"><line y1="-10" y2="0" stroke="#999"/><rect x="-5" y="0" width="10" height="14" rx="2" fill="#ffcf70" stroke="#6a4a2a"/><circle cx="0" cy="7" r="12" fill="#ffcf70" opacity=".15"/></g>';
      case 'pumpkins': return [[330, 140, 9], [352, 143, 7], [30, 142, 8]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${p[2]}" ry="${p[2] * .8}" fill="#ff8a1e"/><rect x="${p[0] - 1}" y="${p[1] - p[2] * .8 - 3}" width="2.4" height="4" fill="#3a6a2a"/>`).join('');
      case 'wreath': return '<circle cx="200" cy="100" r="9" fill="none" stroke="#2f8a4a" stroke-width="4"/><circle cx="194" cy="95" r="1.8" fill="#d94a2a"/><circle cx="205" cy="104" r="1.8" fill="#d94a2a"/><path d="M196 110 l4 -3 4 3 -4 4z" fill="#d94a2a"/>';
      case 'hearts': return [[150, 70], [248, 76], [200, 60]].map((p, i) => `<path class="flit" style="animation-delay:${i * .5}s" transform="translate(${p[0]} ${p[1]})" d="M0 3 q-6 -8 0 -8 q3 0 3 3 q0 -3 3 -3 q6 0 0 8 l-3 4z" fill="#ff6fa8"/>`).join('');
      case 'flowers': return [20, 44, 70, 330, 356, 380].map((x, i) => `<path d="M${x} 148 v-8" stroke="#3a8a4a" stroke-width="1.5"/><circle cx="${x}" cy="138" r="3.4" fill="${['#ff8ac8', '#ffe27a', '#b8a0ff'][i % 3]}"/>`).join('');
      case 'beach': return '<g transform="translate(354 138)"><circle r="8" fill="#fff"/><path d="M0 -8 a8 8 0 0 1 8 8 h-8z" fill="#ff5a5a"/><path d="M0 8 a8 8 0 0 1 -8 -8 h8z" fill="#4aa8ff"/></g>';
      default: return '';
    }
  }
  function petSVG(id) {
    if (id === 'raven') return '<ellipse cx="96" cy="100" rx="10" ry="6" fill="#0d0818"/><circle cx="106" cy="94" r="5" fill="#0d0818"/><path d="M110 93 l7 2 -7 2z" fill="#ffb84a"/><circle cx="107" cy="93" r="1.2" fill="#ffe27a"/><path d="M88 100 l-12 5 12 -1z" fill="#0d0818"/>';
    if (id === 'toad') return '<ellipse cx="96" cy="102" rx="12" ry="8" fill="#3a8a4a"/><circle cx="90" cy="95" r="4" fill="#4aa85a"/><circle cx="102" cy="95" r="4" fill="#4aa85a"/><circle cx="90" cy="94.5" r="1.4" fill="#111"/><circle cx="102" cy="94.5" r="1.4" fill="#111"/>';
    if (id === 'none') return '';
    return '<ellipse cx="96" cy="100" rx="13" ry="8" fill="#0d0818"/><circle cx="108" cy="92" r="7" fill="#0d0818"/><polygon points="103,87 105,79 109,86" fill="#0d0818"/><polygon points="108,86 112,79 114,88" fill="#0d0818"/><path d="M84 100 q-14 -4 -10 -18" stroke="#0d0818" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="106" cy="91" r="1.3" fill="#ffe27a"/><circle cx="111" cy="91" r="1.3" fill="#ffe27a"/>';
  }
  // cfg: {theme, pet, decor[]}; pfx keeps gradient ids unique when two scenes are on screen.
  function sceneInner(cfg, pfx) {
    const T = D.CMAP.theme[cfg.theme] || D.CMAP.theme.classic;
    return `<defs><linearGradient id="${pfx}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.sky[0]}"/><stop offset="1" stop-color="${T.sky[1]}"/></linearGradient></defs>
      <rect width="400" height="150" fill="url(#${pfx}sky)"/>
      <g fill="#fff" opacity=".8"><circle cx="40" cy="22" r="1.4"/><circle cx="120" cy="14" r="1"/><circle cx="250" cy="26" r="1.3"/><circle cx="300" cy="12" r="1"/><circle cx="210" cy="10" r="1.2"/><circle cx="70" cy="50" r="1"/></g>
      <g data-egg="moon" class="egg"><circle cx="340" cy="42" r="22" fill="#f6f1c7"/><circle cx="331" cy="36" r="5" fill="#e4dea6"/><circle cx="348" cy="50" r="4" fill="#e4dea6"/></g>
      <g data-egg="chimney" class="egg"><rect x="262" y="40" width="26" height="60" fill="#2c1e45"/><rect x="258" y="36" width="34" height="8" fill="#3a2a5a"/><circle class="smoke" cx="275" cy="26" r="6" fill="#8a7aa8" opacity=".5"/><circle class="smoke s2" cx="281" cy="14" r="8" fill="#8a7aa8" opacity=".35"/></g>
      <polygon points="10,150 200,46 390,150" fill="${T.roof[0]}" stroke="${T.roof[1]}" stroke-width="3"/>
      <g data-egg="cat" class="egg">${petSVG(cfg.pet)}</g>
      ${cfg.decor.map(decorSVG).join('')}`;
  }
  function renderScene() {
    const H = g.S.house;
    $('scene').innerHTML = sceneInner({ theme: H.theme, pet: H.pet, decor: H.decor }, 'm');
  }
  function applyDoor() {
    const d = D.CMAP.door[g.S.house.door] || D.CMAP.door.wood, b = $('door');
    b.style.background = `linear-gradient(${d.c[0]}, ${d.c[1]})`;
    b.style.borderColor = d.b;
  }

  // ---------- feedback ----------
  function floater(text, x, y, cls) {
    const el = document.createElement('div');
    el.className = 'fl ' + (cls || '');
    if (text) el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('floaters').appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
  function toast(msg, cls) {
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.textContent = msg;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => el.remove(), 4500);
  }
  function shake() {
    if (g.S.settings.calm) return;
    const a = $('app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
  }

  // ---------- modal ----------
  let modalActions = [];
  function modal(html, actions) {
    modalActions = actions || [];
    const box = $('modal').firstElementChild;
    box.innerHTML = html + (modalActions.length
      ? `<div class="actions">${modalActions.map((a, i) => `<button class="btn ${a.cls || ''}" data-ma="${i}">${a.label}</button>`).join('')}</div>` : '');
    $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; modalActions = []; }
  $('modal').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ma]');
    if (b) {
      const a = modalActions[+b.dataset.ma];
      if (a && a.fn && a.fn() === false) return;
      closeModal();
    } else if (e.target === $('modal')) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ---------- state shared by the UI ----------
  let tab = 'tenants';
  let buyMode = 1;
  const dirty = { rooms: true, tab: true };
  let lastInput = Date.now();
  let mabelEl = null, mabelNext = 0;

  const TABS = [
    { id: 'tenants', label: 'Tenants' }, { id: 'upgrades', label: 'Upgrades' }, { id: 'exorcism', label: 'Exorcism' },
    { id: 'codex', label: 'Codex' }, { id: 'house', label: 'House' }, { id: 'neighbors', label: 'Neighbors' }, { id: 'ach', label: 'Achievements' }, { id: 'ledger', label: 'Ledger' }, { id: 'settings', label: 'Settings' },
  ];
  function renderTabs() {
    $('tabs').innerHTML = TABS.map((t) =>
      `<button role="tab" data-tab="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.label}${t.id === 'exorcism' && g.pending() >= 1 ? '<span class="dot"></span>' : ''}</button>`).join('');
  }
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab; dirty.tab = true; renderTabs(); Snd.init();
  });

  // ---------- rooms ----------
  function renderRooms() {
    const S = g.S;
    let html = '';
    for (const r of D.ROOMS) {
      const owned = !!S.rooms[r.id];
      let body = '';
      if (owned) {
        const sprites = D.GHOSTS.filter((d) => d.room === r.id && (S.ghosts[d.id] || 0) > 0).map((d) => {
          const n = S.ghosts[d.id], show = Math.min(n, 5);
          let s = '';
          for (let i = 0; i < show; i++) s += `<button class="ghost" data-g="${d.id}" style="animation-delay:${(i * 0.37).toFixed(2)}s" aria-label="${esc(d.name)}: collect rent">${ghostSVG(d.id, d.color)}</button>`;
          if (n > show) s += `<span class="more">x${n}</span>`;
          return s;
        }).join('');
        body = `<div class="sprites">${sprites || '<span class="blurb">Empty. Spooky, but unprofitable.</span>'}</div>`;
      } else {
        body = `<button class="btn" data-act="room" data-id="${r.id}">Unlock - ${fmt(r.cost)}</button>`;
      }
      html += `<div class="room ${owned ? 'owned' : 'locked'}" data-room="${r.id}"><h3>${r.name}</h3><div class="blurb">${r.blurb}</div>${body}</div>`;
    }
    const found = D.LODGERS.filter((l) => S.codex.lodgers[l.id]);
    if (found.length) {
      const show = found.slice(-12);
      html += `<div class="room owned" style="grid-column:1/-1"><h3>The Guest Wing</h3><div class="blurb">Ghosts you have summoned in seances. Each adds a little permanent rent.</div><div class="sprites">${show.map((l, i) =>
        `<button class="ghost lodger" data-g="${l.id}" style="animation-delay:${(i * 0.29).toFixed(2)}s" aria-label="${esc(l.name)}: collect rent">${ghostSVG(l.id, l.color)}</button>`).join('')}${found.length > show.length ? `<span class="more">+${found.length - show.length}</span>` : ''}</div></div>`;
    }
    if (S.cellar) html += `<div class="room cellar owned"><h3>The Forgotten Cellar</h3><div class="blurb">Dusty crates. Rent +25%. A note reads: "Check the parlor at midnight."</div></div>`;
    $('rooms').innerHTML = html;
    refreshRooms();
  }
  function refreshRooms() {
    document.querySelectorAll('#rooms [data-act=room]').forEach((b) => { b.disabled = g.S.rent < g.roomCost(b.dataset.id); b.classList.toggle('off', b.disabled); });
  }

  // ---------- tabs: tenants ----------
  let tenantRefs = {};
  function buildTenants() {
    const S = g.S;
    let h = `<div class="modes">${[1, 10, 'max'].map((m) => `<button class="chip ${m === buyMode ? 'on' : ''}" data-act="mode" data-m="${m}">${m === 'max' ? 'Max' : 'x' + m}</button>`).join('')}</div>`;
    for (const d of D.GHOSTS) {
      if (d.id === 'mabel' && !S.mabel) continue;
      const open = g.available(d.id);
      h += `<div class="row-item ${d.cost == null ? 'owned' : ''}" data-gid="${d.id}"><div><span class="nm">${d.name}</span><span class="tag ${d.rarity}">${d.rarity}</span> <b class="cnt"></b></div><div class="sub"></div>${d.cost != null ? `<button class="btn" data-act="buy" data-id="${d.id}"></button>` : ''}</div>`;
      void open;
    }
    $('tabBody').innerHTML = h;
    tenantRefs = {};
    document.querySelectorAll('[data-gid]').forEach((row) => {
      tenantRefs[row.dataset.gid] = { cnt: row.querySelector('.cnt'), sub: row.querySelector('.sub'), btn: row.querySelector('button') };
    });
    refreshTenants();
  }
  function refreshTenants() {
    const S = g.S;
    for (const d of D.GHOSTS) {
      const r = tenantRefs[d.id];
      if (!r) continue;
      const n = S.ghosts[d.id] || 0;
      r.cnt.textContent = n ? 'x' + n : '';
      const each = n ? g.C.ghostRps[d.id] / n : d.base * g.C.global;
      r.sub.textContent = `${d.quirk}  -  each pays ~${fmt(each, 1)}/s`;
      if (!r.btn) continue;
      if (!g.available(d.id)) {
        const room = D.ROOMS.find((x) => x.id === d.room);
        r.btn.textContent = 'Unlock ' + room.name.replace('The ', ''); r.btn.disabled = true; r.btn.classList.add('off');
        continue;
      }
      let q = buyMode === 'max' ? Math.max(g.maxAffordable(d.id), 1) : buyMode;
      const cost = g.costN(d.id, q);
      r.btn.textContent = `Move in${q > 1 ? ' x' + q : ''} - ${fmt(cost)}`;
      r.btn.disabled = cost > S.rent; r.btn.classList.toggle('off', r.btn.disabled);
    }
  }

  // ---------- tabs: upgrades ----------
  function describeFx(fx, hideUp) {
    const parts = [];
    const add = (txt, good) => { if (!hideUp || !good) parts.push(txt); };
    if (fx.click) add(`Click power x${fx.click}`, fx.click > 1);
    if (fx.all) add(`All rent x${fx.all}`, fx.all > 1);
    if (fx.g) for (const id in fx.g) add(`${D.GMAP[id].name} rent x${fx.g[id]}`, fx.g[id] > 1);
    if (fx.offlineCap) add(`+${fx.offlineCap / 3600}h offline cap`, true);
    if (fx.offline) add(`+${Math.round(fx.offline * 100)}% offline earnings`, true);
    if (hideUp) parts.push('...and a catch? Probably. Maybe good.');
    return parts.join(', ');
  }
  let upgKey = '';
  function visibleUpgrades() {
    return D.UPGRADES.filter((u) => g.upgradeVisible(u)).sort((a, b) => a.cost - b.cost).slice(0, 6);
  }
  function buildUpgrades() {
    const vis = visibleUpgrades();
    upgKey = vis.map((u) => u.id).join();
    let h = vis.length ? '' : '<p class="note">Nothing to renovate right now. More ideas arrive as you move in new tenants.</p>';
    for (const u of vis) {
      h += `<div class="row-item ${u.cursed ? 'cursed' : ''}" data-uid="${u.id}"><div><span class="nm">${u.name}</span>${u.cursed ? '<span class="tag cursed">Cursed</span>' : ''}</div><div class="sub">${describeFx(u.fx, u.cursed)}<br><i>${u.flavor}</i></div><button class="btn" data-act="upg" data-id="${u.id}">${fmt(u.cost)}</button></div>`;
    }
    const owned = D.UPGRADES.filter((u) => g.S.upgrades[u.id]);
    if (owned.length) {
      h += `<div class="sect">Installed (${owned.length}/${D.UPGRADES.length})</div>`;
      h += owned.map((u) => `<div class="row-item owned"><div><span class="nm">${u.name}</span></div><div class="sub">${describeFx(u.fx)}</div></div>`).join('');
    }
    $('tabBody').innerHTML = h;
    refreshUpgrades();
  }
  function refreshUpgrades() {
    document.querySelectorAll('[data-act=upg]').forEach((b) => { const u = D.UMAP[b.dataset.id]; b.disabled = g.S.rent < u.cost; b.classList.toggle('off', b.disabled); });
  }

  // ---------- tabs: exorcism ----------
  function buildExorcism() {
    const S = g.S, p = g.pending();
    let h = `<div class="card"><h3>Exorcism</h3><p>Evict every ghost, reset the house, and keep a permanent bonus. Each Spectral Essence you have ever earned gives +10% rent (growth slows after 100). Essence is also spent in the shop below.</p>
      <p style="margin-top:8px">This run: <b>${fmt(S.run)}</b> rent. Exorcism now would give <span class="big" style="font-size:20px">+${p}</span> Spectral Essence.</p>
      <p>Next Essence at <b>${fmt(Math.pow(p + 1, 2) * D.CONST.ESS_DIV)}</b> rent this run.</p>
      <button class="btn alt" data-act="exorcise" ${p < 1 ? 'disabled' : ''} style="margin-top:8px">${p < 1 ? 'Keep earning...' : 'Perform Exorcism'}</button></div>
      <div class="sect">Spectral Essence shop - you have ${S.essence}</div>`;
    h += D.ESHOP.map((e) => {
      const owned = S.eshop[e.id];
      return `<div class="row-item ${owned ? 'owned' : ''}"><div><span class="nm">${e.name}</span></div><div class="sub">${e.desc}</div><button class="btn" data-act="ess" data-id="${e.id}" ${owned || S.essence < e.cost ? 'disabled' : ''}>${owned ? 'Owned' : e.cost + ' Essence'}</button></div>`;
    }).join('');
    $('tabBody').innerHTML = h;
  }

  // ---------- tabs: codex / achievements / ledger / settings ----------
  function ghostCard(d, found, fam) {
    if (found) {
      const L = D.LMAP[d.id];
      return `<div class="card"><div class="art">${ghostSVG(d.id, d.color)}</div><h3>${esc(d.name)}</h3><span class="tag ${d.rarity}">${d.rarity}</span><p>${esc(d.quirk)}</p>${L ? `<p class="bonus">+${(D.LODGER_BONUS[d.rarity] * 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}% rent</p>` : `<p><i>${esc(d.bio)}</i></p>`}</div>`;
    }
    let hint = d.id === 'mabel' ? 'Some tenants keep unusual hours.' : 'Move this tenant in to discover them.';
    let cls = '';
    if (D.LMAP[d.id]) {
      if (d.season) {
        const s = D.SMAP[d.season];
        if (g.curSeason && g.curSeason.id === d.season) { hint = 'Available now! Hold a Seance.'; cls = 'now'; } else hint = 'Returns during ' + s.name + '.';
      } else hint = 'Hold a Seance to find them.';
    }
    return `<div class="card lock ${cls}"><h3>???</h3><span class="tag ${d.rarity}">${d.rarity}</span><p>${hint}</p></div>`;
  }
  function buildCodex() {
    const S = g.S, disc = g.discovered();
    let h = `<p class="note">Discovered <b>${disc}</b> of ${g.totalCodex()} ghosts. Codex bonus: rent x${g.C.codexMult.toFixed(2)} (each ghost found adds a little, complete families add more).</p>`;
    h += `<div class="card" id="seanceCard"></div>`;
    h += `<div class="fam"><h3>Residents</h3><span>${D.GHOSTS.filter((d) => S.seen[d.id]).length}/${D.GHOSTS.length} - move them in from the Tenants tab</span></div><div class="grid2">`;
    for (const d of D.GHOSTS) h += ghostCard(d, !!S.seen[d.id]);
    h += '</div>';
    for (const f of D.FAMILIES) {
      const n = g.familyFound(f.id), done = g.familyDone(f.id);
      h += `<div class="fam ${done ? 'done' : ''}"><h3>${f.name}${done ? ' - complete!' : ''}</h3><span>${n}/${f.members.length} - set bonus rent +${Math.round(f.set * 100)}%</span></div><p class="note" style="margin:0 2px 6px">${f.blurb}</p><div class="grid2">`;
      for (const id of f.members) h += ghostCard(D.LMAP[id], !!S.codex.lodgers[id]);
      h += '</div>';
    }
    if (window.HLShared) {
      const gs = g.simGuests || {}, SH = window.HLShared;
      h += `<div class="fam"><h3>Simulator guests</h3><span>${SH.solved(gs)}/${SH.GUESTS.length} - solved in Simulator Mode, rent +${Math.round((g.simBonus || 0) * 100)}%</span></div><div class="grid2">` +
        SH.GUESTS.map((x) => (gs[x.id] ? `<div class="card done"><h3>${x.name}</h3><p>${x.blurb}</p></div>` : '<div class="card lock"><h3>???</h3><p>Solve their story in Simulator Mode.</p></div>')).join('') + '</div>';
    }
    $('tabBody').innerHTML = h;
    refreshSeance();
  }
  function refreshSeance() {
    const box = $('seanceCard');
    if (!box) return;
    const pool = g.seanceEligible(), cost = g.seanceCost();
    const key = pool.length + '|' + cost + '|' + (g.S.rent >= cost);
    if (box.dataset.k === key) return;
    box.dataset.k = key;
    const se = g.curSeason;
    box.innerHTML = `<h3>Hold a Seance</h3><p>Summon a random ghost into your Codex and the Guest Wing. ${pool.length ? `${pool.length} still out there.` : 'You have found everyone available right now.'}</p>${se ? `<p style="color:var(--gold)">${se.name} is on: seasonal ghosts are three times as likely.</p>` : ''}
      <button class="btn" data-act="seance" style="margin-top:8px" ${!pool.length || g.S.rent < cost ? 'disabled' : ''}>${pool.length ? 'Summon - ' + fmt(cost) : 'Nobody left to summon'}</button>`;
  }
  function buildAch() {
    const S = g.S, done = D.ACHIEVEMENTS.filter((a) => S.ach[a.id]).length;
    let h = `<p class="note">${done} of ${D.ACHIEVEMENTS.length} unlocked. Each gives a permanent +1% rent (secrets +2%). Current bonus: x${g.C.achMult.toFixed(2)}.</p><div class="grid2">`;
    for (const a of D.ACHIEVEMENTS) {
      const got = S.ach[a.id];
      h += `<div class="card ${got ? 'done' : 'lock'}"><h3>${got || !a.secret ? a.name : '???'}</h3><p>${got || !a.secret ? a.desc : 'Secret. Hint: ' + a.desc}</p></div>`;
    }
    $('tabBody').innerHTML = h + '</div>';
  }
  // ---------- tabs: house customization ----------
  function unlockText(un) {
    if (!un) return '';
    if (un.lodgers) return `Find ${un.lodgers} ghosts in seances`;
    if (un.exor) return `Perform ${un.exor} Exorcism${un.exor > 1 ? 's' : ''}`;
    if (un.ach) return `Earn ${un.ach} achievements`;
    if (un.season) return `Visit during ${D.SMAP[un.season].name}`;
    return '';
  }
  function buildHouse() {
    const H = g.S.house;
    const groups = [['theme', 'Exterior'], ['door', 'Front door'], ['decor', `Decorations (up to ${D.MAX_DECOR})`], ['pet', 'Pet']];
    let h = '<p class="note">Cosmetic only: make the place yours. Locked items show how to earn them. Seasonal items unlock when you are around for the season.</p>';
    for (const [kind, label] of groups) {
      h += `<div class="sect">${label}</div><div class="chips">`;
      for (const c of D.COSMETICS[kind]) {
        const open = g.cosmeticUnlocked(kind, c.id);
        const on = kind === 'decor' ? H.decor.includes(c.id) : H[kind] === c.id;
        const sw = kind === 'theme' ? `<span class="swatch" style="background:${c.sky[1]}"></span>` : kind === 'door' ? `<span class="swatch" style="background:${c.b}"></span>` : '';
        h += `<button class="chip ${on ? 'sel' : ''} ${open ? '' : 'lockd'}" data-act="cos" data-k="${kind}" data-id="${c.id}" ${open ? '' : 'disabled'} title="${open ? '' : esc(unlockText(c.unlock))}">${sw}${c.name}${open ? '' : ' (' + unlockText(c.unlock) + ')'}</button>`;
      }
      h += '</div>';
    }
    $('tabBody').innerHTML = h;
  }

  // ---------- tabs: neighbors (rent race + visiting houses) ----------
  const RACE_END = () => { const W = 7 * 864e5; return (Math.floor(Date.now() / W) + 1) * W; };
  function buildNeighbors() {
    let h = `<div class="sect">Weekly Rent Race</div><div id="raceBox"></div>
      <div class="sect">Visit a house</div>
      <p class="note">Share your code with a friend, or paste theirs to drop by. Each house you visit leaves you a small guest tip once a day. No server needed.</p>
      <div class="modes"><button class="btn ghosty" data-act="copyhouse">Show my house code</button></div>
      <textarea id="visitBox" placeholder="Paste a friend's house code (starts with HLH1:) and press Visit." spellcheck="false"></textarea>
      <div class="modes" style="margin-top:6px"><button class="btn" data-act="visitcode">Visit this house</button></div>
      <div class="sect">Rival landlords</div>`;
    h += D.RIVALS.map((r) => `<div class="row-item"><div><span class="nm">${r.name}</span></div><div class="sub">${r.house} - ${r.bio}</div><button class="btn ghosty" data-act="visitrival" data-id="${r.id}">Visit</button></div>`).join('');
    $('tabBody').innerHTML = h;
    refreshRace();
  }
  function refreshRace() {
    const box = $('raceBox');
    if (!box) return;
    const now = Date.now(), board = g.raceBoard(now), W = g.S.week;
    const top = Math.max(1, board[0].score);
    const left = Math.max(0, RACE_END() - now);
    const me = board.find((r) => r.you);
    const lead = board[0].you ? null : D.RIVALS.find((r) => r.id === board[0].id);
    let h = `<p class="note">Out-earn four rival landlords this week. Rivals aim for a share of what you earned last week, so keep growing. Resets in <b>${dur(left / 1000)}</b>. You are <b>#${me.rank}</b>.</p>`;
    if (W.pending) {
      const p = W.pending;
      h += `<div class="card done" style="margin-bottom:8px"><h3>Last week: you placed #${p.rank}</h3><p>You earned ${fmt(p.earned)} rent.</p><button class="btn alt" data-act="claimweek" style="margin-top:6px">Claim prize</button></div>`;
    }
    h += board.map((r) => `<div class="race-row ${r.you ? 'you' : ''}"><span>#${r.rank}</span><span>${esc(r.name)}<small>${esc(r.house)}</small></span><b>${fmt(r.score)}</b><div class="bar race-bar"><i style="width:${(100 * r.score / top).toFixed(1)}%"></i></div></div>`).join('');
    const taunt = me.rank === 1 ? D.RIVALS.find((r) => r.id === board[1].id)[ 'behind'] : lead ? lead.ahead : '';
    if (taunt) h += `<p class="note"><i>${esc(taunt)}</i></p>`;
    h += '<p class="note">Prizes: 1st rent x1.3 for 2h, 2nd x1.2, 3rd x1.1 for 1h, otherwise a small tip. Rivals are simulated until a server exists.</p>';
    if (box.dataset.k !== h) { box.dataset.k = h; box.innerHTML = h; }
  }
  function houseView(s, tipMsg) {
    const rooms = s.rm.map((rid) => {
      const gs = D.GHOSTS.filter((d) => d.room === rid && s.gh[d.id] > 0).map((d) => {
        let x = ''; const n = s.gh[d.id];
        for (let i = 0; i < Math.min(n, 4); i++) x += `<span class="vg ghost" style="animation-delay:${(i * 0.4).toFixed(1)}s">${ghostSVG(d.id, d.color)}</span>`;
        return x + (n > 4 ? `<span class="more">x${n}</span>` : '');
      }).join('');
      return `<div class="vroom"><b style="color:var(--teal)">${D.RMAP[rid].name}</b><div class="sprites">${gs || 'Empty'}</div></div>`;
    }).join('');
    return `<h2>${esc(s.n)}</h2>${tipMsg ? `<p style="color:var(--gold)">${tipMsg}</p>` : ''}
      <svg class="vscene" viewBox="0 0 400 150">${sceneInner({ theme: s.th, pet: s.pt, decor: s.dc }, 'v')}</svg>
      <p style="margin-top:8px"><small>Lifetime rent ${fmt(s.tot)} - ${s.ex} Exorcisms - ${s.lg} seance ghosts - ${s.ac} achievements<br>Spookiest tenant: ${esc(s.sp)}</small></p>
      <div class="vrooms">${rooms}</div>`;
  }
  function doVisit(snap) {
    const r = g.visit(snap, Date.now());
    const msg = r.own ? 'This is your own house. Quite the haunting.' : r.tip ? `The tenants press ${fmt(r.tip)} rent into your hand as a guest tip.` : 'You already collected a tip from this house today. Come back tomorrow.';
    Snd.init(); if (r.tip) Snd.coin();
    modal(houseView(snap, msg), [{ label: 'Leave politely', cls: 'ghosty' }]);
  }

  function buildLedger() {
    const S = g.S, C = g.C;
    const rows = [
      ['Rent per second', fmt(C.rps, 1)], ['Click power', fmt(C.clickPower, 1)], ['Rent this run', fmt(S.run)], ['Lifetime rent', fmt(S.total)],
      ['Hand collections', S.clicks], ['Tenants', g.totalGhosts()], ['Exorcisms', S.exorcisms], ['Spectral Essence earned', S.essenceTotal],
      ['Essence multiplier', 'x' + C.essMult.toFixed(2)], ['Achievement multiplier', 'x' + C.achMult.toFixed(2)], ['Room multiplier', 'x' + C.roomMult.toFixed(2)],
      ['Offline earnings', Math.round(C.offlineRate * 100) + '% for up to ' + dur(C.offlineCap)], ['Incidents handled', S.stats.eventsDone],
      ['Time played', dur(S.stats.timePlayed)],
    ];
    let h = rows.map((r) => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    h += '<div class="sect">Income by tenant</div>';
    for (const d of D.GHOSTS) {
      const v = C.ghostRps[d.id] || 0;
      if (!v) continue;
      h += `<div class="kv"><span>${d.name}</span><b>${fmt(v, 1)}/s (${Math.round(100 * v / C.rps)}%)</b></div><div class="bar"><i style="width:${(100 * v / C.rps).toFixed(1)}%"></i></div>`;
    }
    $('tabBody').innerHTML = h;
  }
  function buildSettings(extra) {
    const S = g.S;
    let h = `<div class="row-item"><div><span class="nm">Sound</span></div><div class="sub">Coins, chimes and spooky sighs.</div><button class="btn ghosty" data-act="sound">${S.settings.sound ? 'On' : 'Off'}</button></div>
      <div class="row-item"><div><span class="nm">Calm mode</span></div><div class="sub">No screen shake, slower animations, softer sound.</div><button class="btn ghosty" data-act="calm">${S.settings.calm ? 'On' : 'Off'}</button></div>
      <div class="row-item"><div><span class="nm">Notifications</span></div><div class="sub">Browser alerts for incidents, a ready Exorcism and race results while this tab is in the background. They stop if you close the tab.</div><button class="btn ghosty" data-act="notify">${S.settings.notify && notifyOK() ? 'On' : 'Off'}</button></div>
      <div class="row-item"><div><span class="nm">Tutorial</span></div><div class="sub">Replay the short intro tips.</div><button class="btn ghosty" data-act="tutorial">Replay</button></div>
      <div class="row-item"><div><span class="nm">Theme</span></div><div class="sub">Pick a hotel look. Shared with the homepage and Simulator.</div><span>${window.HLTheme ? window.HLTheme.selectHtml() : ''}</span></div>
      <div class="sect">Save</div>
      <p class="note">The game saves automatically in this app. Use an export code to back up or move your house.</p>
      <div class="modes"><button class="btn ghosty" data-act="export">Export save</button><button class="btn ghosty" data-act="import">Import save</button><button class="btn ghosty" data-act="reset">Reset</button></div>
      <textarea id="saveBox" placeholder="Export code appears here. Paste a code here and press Import." spellcheck="false">${extra || ''}</textarea>
      <div class="sect">About</div>
      <p class="note">Haunted Landlord, early test build. The "ghosts summoned worldwide" counter and the Community Haunting Meter are simulated for now; they will connect to real players once a server exists. Share link on the card is a placeholder.</p>`;
    if (DEV) {
      h += `<div class="sect">Test tools</div><div class="modes" style="flex-wrap:wrap">
        ${[['+1K rent', 'r3'], ['+1M rent', 'r6'], ['+1B rent', 'r9'], ['+1T rent', 'r12'], ['Skip 1 hour away', 'ff'], ['Trigger incident', 'ev'], ['Ghost hunter', 'hunt'], ['Spawn Mabel', 'mab'], ['Unlock cellar', 'cel'], ['Cycle season', 'sea'], ['End race week', 'wk']]
          .map((x) => `<button class="chip" data-act="dev" data-d="${x[1]}">${x[0]}</button>`).join('')}</div>`;
    }
    $('tabBody').innerHTML = h;
  }

  function buildTab() {
    dirty.tab = false;
    ({ tenants: buildTenants, upgrades: buildUpgrades, exorcism: buildExorcism, codex: buildCodex, house: buildHouse, neighbors: buildNeighbors, ach: buildAch, ledger: buildLedger, settings: () => buildSettings() })[tab]();
  }

  // ---------- actions ----------
  function collect(e) {
    Snd.init();
    const t = e.currentTarget || e.target;
    let x = e.clientX, y = e.clientY;
    if (!x && !y) { const r = t.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const gain = g.click(Date.now());
    floater('+' + fmt(gain, 1), x - 14, y - 20);
    floater('', x + (Math.random() * 30 - 15), y - 6, 'coinpop');
    Snd.coin();
  }
  $('door').addEventListener('click', collect);
  $('rooms').addEventListener('click', (e) => {
    const gh = e.target.closest('.ghost');
    if (gh) { collect({ clientX: e.clientX, clientY: e.clientY, currentTarget: gh, target: gh }); return; }
    const b = e.target.closest('[data-act=room]');
    if (b) g.buyRoom(b.dataset.id);
  });
  $('scene').addEventListener('click', (e) => {
    const eg = e.target.closest('[data-egg]');
    if (!eg) return;
    Snd.init(); Snd.ghost();
    const k = Math.random() < 0.12 ? 'dev' : eg.dataset.egg;
    toast(pick(D.EGGS[k]));
  });

  $('tabBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    Snd.init();
    switch (act) {
      case 'mode': buyMode = b.dataset.m === 'max' ? 'max' : +b.dataset.m; buildTenants(); break;
      case 'buy': g.buyGhost(id, buyMode === 'max' ? 'max' : buyMode); break;
      case 'upg': g.buyUpgrade(id); break;
      case 'ess': g.buyEssence(id); break;
      case 'exorcise': confirmExorcism(); break;
      case 'sound': g.S.settings.sound = !g.S.settings.sound; applySettings(); buildSettings(); break;
      case 'calm': g.S.settings.calm = !g.S.settings.calm; applySettings(); buildSettings(); break;
      case 'export': buildSettings(g.exportSave()); break;
      case 'import': {
        const ok = g.importSave($('saveBox').value);
        if (ok) { g.save(); applySettings(); refreshAll(); dirty.rooms = dirty.tab = true; toast('Save imported. Welcome back, landlord.'); } else toast('That does not look like a valid save code.');
        break;
      }
      case 'reset':
        modal('<h2>Reset everything?</h2><p>This permanently deletes your house, your Essence and your achievements.</p>', [
          { label: 'Keep my house', cls: 'ghosty' },
          { label: 'Delete it all', cls: 'alt', fn: () => { g.hardReset(); applySettings(); refreshAll(); dirty.rooms = dirty.tab = true; renderHeader(); } }]);
        break;
      case 'seance': {
        const l = g.seance();
        if (l) { Snd.big(); const k = $('seanceCard'); if (k) delete k.dataset.k; }
        break;
      }
      case 'cos': if (g.setCosmetic(b.dataset.k, id)) { Snd.buy(); } break;
      case 'claimweek': { const r = g.claimWeek(); if (r) { Snd.big(); toast(r.msg, 'ach'); } break; }
      case 'copyhouse': {
        const code = g.houseCode();
        modal(`<h2>Your house code</h2><p>Send this to a friend. They paste it in the Neighbors tab to visit your house.</p><textarea id="hcBox" readonly spellcheck="false">${code}</textarea>`, [
          { label: 'Copy', fn: async () => { try { await navigator.clipboard.writeText(code); toast('House code copied.'); } catch (e) { $('hcBox').select(); toast('Press Ctrl+C to copy.'); } return false; } },
          { label: 'Close', cls: 'ghosty' }]);
        break;
      }
      case 'visitcode': {
        const snap = g.parseHouseCode($('visitBox').value);
        if (snap) doVisit(snap); else toast('That does not look like a valid house code.');
        break;
      }
      case 'visitrival': doVisit(g.rivalHouse(D.RIVALS.find((r) => r.id === id))); break;
      case 'notify': toggleNotify(); break;
      case 'tutorial': g.S.tutorial = { step: 0, done: false }; coachStep = -1; toast('Tutorial restarted.'); break;
      case 'dev': devAction(b.dataset.d); break;
    }
  });

  function devAction(d) {
    if (d[0] === 'r') { g.gain(Math.pow(10, +d.slice(1))); }
    else if (d === 'ff') { g.S.lastSeen -= 3600e3; const r = g.applyOffline(Date.now()); if (r) showWelcome(r); }
    else if (d === 'ev') g.forceEvent(pick(window.HLEngine.EVENTS.filter((x) => x.need(g.S, g) && !x.tap)).id, Date.now());
    else if (d === 'hunt') g.forceEvent('hunter', Date.now());
    else if (d === 'mab') spawnMabel();
    else if (d === 'cel') g.unlockCellar();
    else if (d === 'sea') {
      const ids = D.SEASONS.map((s) => s.id), i = ids.indexOf(g.seasonOverride);
      g.seasonOverride = i === ids.length - 1 ? null : ids[i + 1];
      g.checkSeason(Date.now());
      toast('Season preview: ' + (g.curSeason ? g.curSeason.name : 'none (real date)'));
    }
    else if (d === 'wk') { g.S.week.cycle -= 1; g.weekCheck(Date.now()); }
  }

  $('houseName').addEventListener('click', () => {
    modal(`<h2>Rename your house</h2><input id="nameIn" maxlength="40" value="${esc(g.S.houseName)}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);background:#0e0819;color:var(--text);font-size:16px">`, [
      { label: 'Save', fn: () => { const v = $('nameIn').value.trim(); if (v) g.S.houseName = v.slice(0, 40); renderHeader(); } },
      { label: 'Random name', cls: 'ghosty', fn: () => { g.S.houseName = window.HLEngine.newState(0).houseName; renderHeader(); } },
      { label: 'Cancel', cls: 'ghosty' }]);
  });
  $('btnMute').addEventListener('click', () => { Snd.init(); g.S.settings.sound = !g.S.settings.sound; applySettings(); if (tab === 'settings') buildSettings(); });
  $('btnDaily').addEventListener('click', () => {
    const r = g.claimDaily(Date.now());
    if (r) { Snd.big(); toast(`Daily Haunting: +${fmt(r.reward)} rent! Streak: ${r.streak} day${r.streak > 1 ? 's' : ''}.${r.note}`, 'ach'); }
  });
  const btnEx = document.createElement('button');
  btnEx.className = 'chip glow'; btnEx.hidden = true;
  btnEx.addEventListener('click', () => { tab = 'exorcism'; renderTabs(); dirty.tab = true; });
  document.querySelector('.tools').prepend(btnEx);

  // ---------- exorcism flow ----------
  function confirmExorcism() {
    const p = g.pending();
    if (p < 1) return;
    modal(`<h2>Perform the Exorcism?</h2><p>Every tenant leaves, your rent and upgrades reset, and you gain <span class="big">+${p}</span> Spectral Essence (permanent).</p><p>You keep: Essence, shop items, achievements, the Codex and any secrets you found.</p>`, [
      { label: 'Not yet', cls: 'ghosty' }, { label: 'Exorcise!', cls: 'alt', fn: runExorcism }]);
  }
  let exToken = 0;
  function runExorcism() {
    const info = g.exorcise();
    if (!info) return;
    shake(); Snd.exorcism();
    const token = ++exToken;
    setTimeout(() => {
      modal('<div class="swirl"><svg viewBox="0 0 40 50">' + ghostSVG('gary', '#fff').replace(/<svg[^>]*>|<\/svg>/g, '') + '</svg><h2>Begone, foul tenants!</h2></div>', [{ label: 'Skip', cls: 'ghosty', fn: () => { exToken++; showResult(info); return false; } }]);
      setTimeout(() => { if (token === exToken) { exToken++; showResult(info); } }, 1500);
    }, 0);
    return false;
  }
  function showResult(info) {
    modal(`<h2>Notice of Exorcism</h2><p>+${info.essence} Spectral Essence. Share your achievement with the afterlife:</p><canvas id="cardCv"></canvas>`, [
      { label: 'Copy image', fn: async () => { toast((await window.HLShare.copy($('cardCv'))) ? 'Image copied. Paste it anywhere.' : 'Copy is not supported here. Use Save PNG.'); return false; } },
      { label: 'Save PNG', cls: 'ghosty', fn: () => { window.HLShare.save($('cardCv'), 'notice-of-exorcism'); return false; } },
      { label: 'Back to haunting', cls: 'alt' }]);
    window.HLShare.drawCard($('cardCv'), info, fmt, D.CONST.SHARE_URL);
    dirty.rooms = dirty.tab = true;
  }

  // ---------- welcome back ----------
  function showWelcome(r) {
    Snd.init();
    modal(`<h2>The ghosts haunted while you slept</h2><p>You were away for <b>${dur(r.away)}</b>${r.capped ? ` (earnings are capped at ${dur(g.C.offlineCap)})` : ''}.</p><p>Rent collected: <span class="big">+${fmt(r.gain)}</span></p><p><i>${r.anecdote}</i></p>`, [{ label: 'Collect', cls: '' }]);
  }

  // ---------- event bar ----------
  function renderEvent() {
    const ev = g.ev, bar = $('eventBar');
    if (!ev) { bar.hidden = true; return; }
    const d = ev.def;
    bar.hidden = false;
    bar.innerHTML = `<h3>${esc(ev.title)}</h3><p>${esc(ev.text)}</p><div class="row">${d.tap
      ? `<button class="btn alt" data-ev="tap">DEFEND! (<span id="tapCount">0</span>/${d.tap.need})</button>`
      : ev.labels.map((l, i) => `<button class="btn" data-ev="${i}">${esc(l)}</button>`).join('')}</div><div class="timer"><i id="evTimer" style="width:100%"></i></div>`;
  }
  $('eventBar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ev]');
    if (!b) return;
    Snd.init();
    if (b.dataset.ev === 'tap') { g.tapHunter(); Snd.coin(); const c = $('tapCount'); if (c && g.ev) c.textContent = g.ev.taps; } else g.chooseEvent(+b.dataset.ev);
  });

  // ---------- secrets ----------
  function spawnMabel() {
    if (mabelEl || g.S.mabel) return;
    mabelEl = document.createElement('button');
    mabelEl.className = 'mabel';
    mabelEl.setAttribute('aria-label', 'A glowing ghost appears. Click to meet her.');
    mabelEl.innerHTML = ghostSVG('mabel', '#ffe27a');
    mabelEl.style.left = (10 + Math.random() * 70) + '%';
    mabelEl.style.top = (35 + Math.random() * 40) + '%';
    mabelEl.addEventListener('click', () => { g.catchMabel(); removeMabel(); });
    $('house').appendChild(mabelEl);
    Snd.ghost();
    toast('Something glows in the house...');
    setTimeout(removeMabel, 90000);
  }
  function removeMabel() { if (mabelEl) { mabelEl.remove(); mabelEl = null; mabelNext = Date.now() + 5 * 60000; } }

  // ---------- engine events ----------
  g.onEmit = function (type, data) {
    switch (type) {
      case 'buy':
        if (data.kind === 'room' || data.cost >= 1000) { Snd.big(); shake(); } else Snd.buy();
        dirty.rooms = true;
        if (data.kind !== 'ghost' && ['tenants', 'upgrades', 'exorcism'].includes(tab)) dirty.tab = true;
        break;
      case 'toast': toast(data); break;
      case 'event': Snd.alert(); renderEvent(); notify('Incident at ' + g.S.houseName, data.title, 'event'); break;
      case 'seance': {
        const l = data.ghost;
        toast(`${l.name} answers the call! (${l.rarity}) "${l.quirk}"`, 'ach');
        dirty.rooms = dirty.tab = true; break;
      }
      case 'season': renderSeason(); if (data) notify(data.name + ' has begun', data.blurb, 'season'); if (tab === 'codex' || tab === 'house') dirty.tab = true; break;
      case 'house': renderScene(); applyDoor(); if (tab === 'house') dirty.tab = true; break;
      case 'week': notify('Weekly Rent Race finished', `You placed #${data.rank}. Claim your prize!`, 'week'); if (tab === 'neighbors') dirty.tab = true; break;
      case 'eventEnd': renderEvent(); break;
      case 'ach': Snd.ach(); toast('Achievement: ' + data.name, 'ach'); if (tab === 'ach') dirty.tab = true; break;
      case 'cellar': toast('You sat still long enough that a hidden door creaked open. The Forgotten Cellar is yours!', 'ach'); Snd.ghost(); dirty.rooms = true; break;
      case 'mabel': toast('Midnight Mabel moves in for free. "Don\'t ask how I got a key."', 'ach'); Snd.big(); dirty.rooms = dirty.tab = true; break;
      case 'gary': toast('A ghost named Gary drifts in. "Is this the Wi-Fi? ...Oh. I\'m dead. Right."', 'speech'); Snd.ghost(); dirty.rooms = dirty.tab = true; break;
      case 'exorcism': dirty.rooms = dirty.tab = true; break;
    }
  };

  // ---------- seasons ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function renderSeason() {
    const s = g.curSeason, bar = $('seasonBar');
    if (!s) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = `<b>${s.name}</b> is on: all rent x${s.mult} until ${MONTHS[s.end[0] - 1]} ${s.end[1]}. ${s.blurb} Seasonal ghosts can be summoned in the Codex, and seasonal house styles are unlocked in the House tab.`;
  }

  // ---------- browser notifications ----------
  const notifyOK = () => 'Notification' in window && Notification.permission === 'granted';
  function notify(title, body, tag) {
    if (!g.S.settings.notify || !notifyOK() || !document.hidden) return;
    try { const n = new Notification(title, { body, tag }); n.onclick = () => { window.focus(); n.close(); }; } catch (e) { /* not supported here */ }
  }
  function toggleNotify() {
    const S = g.S.settings;
    if (S.notify) { S.notify = false; buildSettings(); return; }
    if (!('Notification' in window)) { toast('This browser does not support notifications.'); return; }
    const done = () => {
      if (Notification.permission === 'granted') { S.notify = true; toast('Notifications on. You will hear from the house when this tab is in the background.'); } else toast('Notifications are blocked. Allow them in your browser settings.');
      buildSettings();
    };
    if (Notification.permission === 'default') Notification.requestPermission().then(done); else done();
  }

  // ---------- tutorial coach (small, one tip at a time, skippable) ----------
  const TUT = [
    { text: 'Welcome, landlord! <b>Ring the bell</b> to collect your first rent.', el: () => $('door'), done: () => g.S.stats.firstClick },
    { text: 'Ghosts pay rent. Open <b>Tenants</b> and <b>move one in</b>. Keep ringing until you can afford it.', el: () => (tab === 'tenants' ? document.querySelector('#tabBody [data-act=buy]:not(:disabled)') || document.querySelector('[data-tab=tenants]') : document.querySelector('[data-tab=tenants]')), done: () => g.S.stats.ghostsBought >= 1 },
    { text: 'Tenants keep paying even while you are away. <b>Upgrades</b> make them pay more. Take a peek.', el: () => document.querySelector('[data-tab=upgrades]'), done: () => tab === 'upgrades' || Object.keys(g.S.upgrades).length > 0 },
    { text: 'Last tip: <b>incidents</b> pop up now and then, so pick a choice. Later, an <b>Exorcism</b> resets the house for permanent bonuses. Explore the other tabs whenever you like.', el: null, manual: true },
  ];
  let coachStep = -1;
  function endTutorial() { g.S.tutorial.done = true; renderCoach(); }
  function renderCoach() {
    const T = g.S.tutorial, bar = $('coach');
    document.querySelectorAll('.pulse').forEach((e) => e.classList.remove('pulse'));
    if (T.done || !TUT[T.step]) { bar.hidden = true; coachStep = -1; return; }
    const st = TUT[T.step];
    bar.hidden = false;
    bar.innerHTML = `<div class="dots">${TUT.map((_, i) => `<i class="${i <= T.step ? 'on' : ''}"></i>`).join('')}</div><div class="txt">${st.text}</div>${st.manual ? '<button class="btn" data-co="next">Start haunting</button>' : ''}<button class="skip" data-co="skip">Skip tutorial</button>`;
    coachStep = T.step;
  }
  $('coach').addEventListener('click', (e) => {
    const b = e.target.closest('[data-co]');
    if (!b) return;
    endTutorial();
  });
  function tutorialCheck() {
    const T = g.S.tutorial;
    if (T.done) { if (coachStep !== -1) renderCoach(); return; }
    let st = TUT[T.step];
    while (st && !st.manual && st.done()) { T.step++; st = TUT[T.step]; }
    if (T.step !== coachStep) renderCoach();
    document.querySelectorAll('.pulse').forEach((e) => e.classList.remove('pulse'));
    const el = TUT[T.step] && TUT[T.step].el && TUT[T.step].el();
    if (el) el.classList.add('pulse');
  }
  function refreshAll() { renderScene(); applyDoor(); renderSeason(); coachStep = -1; }

  // ---------- header / footer ----------
  function applySettings() {
    Snd.on = g.S.settings.sound; Snd.calm = g.S.settings.calm;
    document.body.classList.toggle('calm', g.S.settings.calm);
    $('btnMute').textContent = 'Sound: ' + (Snd.on ? 'on' : 'off');
  }
  function renderHeader() {
    $('houseName').textContent = g.S.houseName + '  (rename)';
    document.title = g.S.houseName + ' - Haunted Landlord';
  }
  let lastRent = '', exKey = '', exNotified = false, dailyNotified = false;
  function renderWallet() {
    const r = fmt(g.S.rent);
    if (r !== lastRent) { $('rent').textContent = r; lastRent = r; }
    $('rps').textContent = fmt(g.C.rps, 1) + ' rent / sec  -  click: +' + fmt(g.C.clickPower, 1);
  }
  function renderSlow(now) {
    const S = g.S;
    // buffs
    $('buffs').innerHTML = S.buffs.filter((b) => b.until > now)
      .map((b) => `<span class="buff ${b.mult < 1 ? 'bad' : ''}">${esc(b.label)} x${b.mult} (${Math.ceil((b.until - now) / 1000)}s)</span>`).join('');
    // pending exorcism chip
    const p = g.pending();
    btnEx.hidden = p < 1;
    btnEx.textContent = `Exorcism ready: +${p} Essence`;
    // daily
    $('btnDaily').hidden = !g.dailyState(now).ready || !S.stats.firstClick;
    // footer
    const c = g.community(now);
    $('worldwide').textContent = `${c.worldwide.toLocaleString()} ghosts summoned worldwide (simulated)`;
    $('comm').innerHTML = `<div>Community Haunting Meter (preview): ${Math.floor(c.pct)}%</div><div class="bar"><i style="width:${c.pct}%"></i></div>${c.claimable ? '<button class="btn alt" data-comm="1">Meter full! Claim Halloween Hank (+25% for 1h)</button>' : c.claimed ? '<div>Hank is haunting your house. Thank the community.</div>' : ''}`;
    // tab-specific live updates
    if (tab === 'ledger') buildLedger();
    if (tab === 'exorcism' && !modalOpen()) {
      const k = p + '|' + S.essence + '|' + Math.floor(S.run / 1e3);
      if (k !== exKey) { exKey = k; buildExorcism(); }
    }
    if (tab === 'upgrades') {
      const key = visibleUpgrades().map((u) => u.id).join();
      if (key !== upgKey) buildUpgrades();
    }
    if (tab === 'neighbors') refreshRace();
    if (p >= 1 && !exNotified) { exNotified = true; notify('Exorcism ready', `Your house can bank +${p} Spectral Essence.`, 'exorcism'); } else if (p < 1) exNotified = false;
    const dailyReady = g.dailyState(now).ready && S.stats.firstClick;
    if (dailyReady && !dailyNotified) { dailyNotified = true; notify('Daily Haunting is ready', 'Free rent and a streak bonus are waiting.', 'daily'); } else if (!dailyReady) dailyNotified = false;
    // renderTabs dot
    const dot = document.querySelector('[data-tab=exorcism] .dot');
    if ((p >= 1) !== !!dot) renderTabs();
  }
  const modalOpen = () => !$('modal').hidden;
  $('comm').addEventListener('click', (e) => { if (e.target.closest('[data-comm]') && g.claimCommunity(Date.now())) { Snd.big(); toast('Halloween Hank moves in for an hour.', 'ach'); } });

  // ---------- main loop ----------
  let last = Date.now(), slowAcc = 0, saveAcc = 0, fastAcc = 0;
  ['pointerdown', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));

  function frame() {
    const now = Date.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 5) {
      const r = g.applyOffline(now);
      if (r) { showWelcome(r); dt = 0; } else dt = Math.min(dt, 60);
    }
    g.tick(dt, now);

    if (dirty.rooms) { dirty.rooms = false; renderRooms(); }
    if (dirty.tab) buildTab();
    renderWallet();

    if (g.ev) {
      const t = $('evTimer');
      if (t) t.style.width = Math.max(0, (g.ev.until - now) / ((g.ev.def.tap ? g.ev.def.tap.secs : 45) * 1000) * 100) + '%';
    }

    fastAcc += dt;
    if (fastAcc >= 0.25) {
      fastAcc = 0;
      refreshRooms();
      if (tab === 'tenants') refreshTenants();
      else if (tab === 'upgrades') refreshUpgrades();
      else if (tab === 'codex') refreshSeance();
      tutorialCheck();
    }
    slowAcc += dt;
    if (slowAcc >= 1) {
      slowAcc = 0;
      renderSlow(now);
      if (!g.S.cellar && now - lastInput >= 5 * 60000) g.unlockCellar();
      if (!mabelEl && !g.S.mabel && new Date().getHours() === 0 && now > mabelNext) spawnMabel();
    }
    saveAcc += dt;
    if (saveAcc >= 10) { saveAcc = 0; g.save(); }
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) g.save(); });
  window.addEventListener('beforeunload', () => g.save());

  // ---------- boot ----------
  if (qs.get('season')) g.seasonOverride = qs.get('season');
  g.checkSeason(Date.now());
  g.weekCheck(Date.now());
  applySettings();
  renderHeader();
  renderTabs();
  refreshAll();
  // Live link: when Simulator Mode (another tab) solves a guest, pick up the rent bonus without a reload.
  if (window.HLShared) window.HLShared.subscribe(() => {
    if (g.refreshShared()) { g.recalc(Date.now()); toast('A Simulator guest joined your Codex. Rent bonus updated.'); if (tab === 'codex') dirty.tab = true; }
  });
  setInterval(frame, 100);
  if (hadSave) {
    const r = g.applyOffline(Date.now());
    if (r) showWelcome(r);
  } else {
    toast('Welcome, landlord. Ring the bell to collect your first rent.');
  }
  renderSlow(Date.now());
})();
