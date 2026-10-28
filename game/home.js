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
})();
