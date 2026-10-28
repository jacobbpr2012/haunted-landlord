(() => {
  document.getElementById('themeBox').innerHTML = window.HLTheme.selectHtml();

  // Carry test params (?dev=1, ?season=...) through to the game.
  const qs = location.search;
  if (qs) {
    document.getElementById('playIdle').href = 'idle.html' + qs;
    document.getElementById('playSim').href = 'sim.html' + qs;
  }

  // Show the player's house if an Idle save exists.
  try {
    const raw = localStorage.getItem('haunted_landlord_save');
    const s = raw && JSON.parse(raw);
    if (s && s.houseName) {
      const el = document.getElementById('resume');
      el.textContent = 'Continue ' + s.houseName;
      el.hidden = false;
      document.getElementById('playIdle').textContent = 'Continue Idle';
    }
  } catch (e) { /* no save or storage blocked */ }

  // ---- Trophy room, daily streak, install chip ----
  const S = window.HLShared;
  const CUP = '<svg class="cup" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0zM5 4h2v3a3 3 0 0 1-2-2.8zm14 0h-2v3a3 3 0 0 0 2-2.8zM11 13h2v3h3v2H8v-2h3zM7 19h10v2H7z"/></svg>';
  const SKULL = '<svg class="cup" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C7 3 5 7 5 11v10l2.3-2 2.4 2 2.3-2 2.3 2 2.4-2 2.3 2V11c0-4-2-8-7-8zM9.500 10.500a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3zm5 0a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3z"/></svg>';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() {
    if (!S) return;
    const st = S.read();
    const tr = S.trophies(st);
    const got = tr.filter((t) => t.got).length;
    document.getElementById('trSub').textContent = got + ' of ' + tr.length + ' trophies on the shelf. Both modes add to the same room.';
    document.getElementById('trGrid').innerHTML = tr.map((t) =>
      '<div class="trophy' + (t.got ? '' : ' locked') + '" title="' + esc(t.name + ': ' + t.desc) + '">' + (t.got ? CUP : SKULL) +
      '<b>' + (t.got ? esc(t.name) : '???') + '</b><small>' + esc(t.desc) + '</small></div>').join('');
    const d = st.daily;
    document.getElementById('streakChip').textContent = 'Day ' + d.streak + ' streak, best ' + d.best;
    const I = st.idle, M = st.sim, f = (n) => Number(n || 0).toLocaleString();
    document.getElementById('statIdle').innerHTML = '<b>Idle</b>Ghosts found: <span>' + f(I.count) + '</span><br>Exorcisms: <span>' + f(I.exorcisms) +
      '</span><br>Achievements: <span>' + f(I.ach) + (I.achTotal ? ' / ' + f(I.achTotal) : '') + '</span>';
    document.getElementById('statSim').innerHTML = '<b>Simulator</b>Day: <span>' + f(M.day) + '</span><br>Stage: <span>' + f(M.stage) +
      '</span><br>Special guests solved: <span>' + S.solved(st.guests) + ' / ' + S.GUESTS.length + '</span>' + (M.rating ? '<br>Rating: <span>' + Number(M.rating).toFixed(1) + '</span>' : '');
  }
  if (S) {
    S.touchDay(new Date());
    render();
    S.subscribe(render);
  }
  const chip = document.getElementById('installChip');
  if (window.HLPwa) {
    window.HLPwa.onChange((p) => {
      chip.hidden = !p.canInstall;
      document.getElementById('iosHint').hidden = !p.iosHint;
    });
    chip.addEventListener('click', () => window.HLPwa.install());
  }
})();
