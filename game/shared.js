// Cross-mode Codex bridge. One localStorage key read and written by both Idle and Simulator. No DOM.
(function (root) {
  'use strict';
  const KEY = 'haunted_landlord_shared';

  // Special guests solved in Simulator Mode. They show up in the Idle Codex and give Idle rent.
  const GUESTS = [
    { id: 'harlow', name: 'Mr. Harlow', blurb: 'Found his dance. Edith was waiting.' },
    { id: 'bride', name: 'Beatrice', blurb: 'Got her ring back and stopped pacing.' },
    { id: 'auditor', name: 'Mr. Pennywhistle', blurb: 'Balanced your books, then left a template.' },
    { id: 'barnacle', name: 'Captain Barnacle', blurb: 'Found his heading at last.' },
    { id: 'ravenscroft', name: 'Lady Ravenscroft', blurb: 'Her portraits face the room again.' },
    { id: 'gunnar', name: 'Gunnar the Skier', blurb: 'Finished the last run of the day.' },
    { id: 'porter', name: 'The Night Porter', blurb: 'Finally opened the letter in Room 9.' },
    { id: 'zelda', name: 'Madame Zelda', blurb: 'Her crystal ball shows the right day now.' },
    { id: 'lastguest', name: 'The Last Guest', blurb: 'Found Room 0, and a good night.' },
    { id: 'founder', name: 'The Founder', blurb: 'Closed the doors on a good day, at last.' },
  ];
  const SIM_RENT_EACH = 0.02;   // Idle rent bonus per solved Simulator guest
  const IDLE_INCOME_EACH = 0.002, IDLE_INCOME_CAP = 0.12;   // Simulator income bonus per Idle ghost found

  function store(s) { try { return s || root.localStorage || null; } catch (e) { return null; } }
  function read(s) {
    const st = store(s);
    try {
      const o = JSON.parse((st && st.getItem(KEY)) || '{}');
      return { idle: { count: (o.idle && o.idle.count) || 0 }, guests: o.guests || {} };
    } catch (e) { return { idle: { count: 0 }, guests: {} }; }
  }
  function write(patch, s) {
    const st = store(s);
    if (!st) return;
    try {
      const cur = read(st);
      st.setItem(KEY, JSON.stringify({ idle: patch.idle || cur.idle, guests: Object.assign({}, cur.guests, patch.guests || {}) }));
    } catch (e) { /* storage blocked */ }
  }
  // Live link between modes: the other tab's writes arrive as 'storage' events. cb() runs after any change to the shared key.
  function subscribe(cb) {
    if (!root.addEventListener) return;
    root.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) cb(); });
  }
  const solved = (guests) => GUESTS.filter((g) => guests && guests[g.id]).length;
  const api = {
    KEY, GUESTS, read, write, solved, subscribe,
    simRentBonus: (guests) => SIM_RENT_EACH * solved(guests),
    idleIncomeBonus: (count) => Math.min(IDLE_INCOME_CAP, IDLE_INCOME_EACH * (count || 0)),
  };
  root.HLShared = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
