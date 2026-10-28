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
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  // Full normalised state. Idle/Sim sections keep any extra keys the modes write (ach, stories, rating...).
  function read(s) {
    const st = store(s);
    let o = {};
    try { o = JSON.parse((st && st.getItem(KEY)) || '{}') || {}; } catch (e) { o = {}; }
    const idle = Object.assign({ count: 0, ach: 0, achTotal: 0, exorcisms: 0, challenges: 0, total: 0 }, o.idle || {});
    idle.count = num(idle.count);
    const sim = Object.assign({ day: 0, stage: 0, stories: 0, rating: 0, challenges: 0, income: 0 }, o.sim || {});
    const d = o.daily || {};
    return { idle, sim, guests: o.guests || {}, daily: { last: d.last || '', streak: num(d.streak), best: num(d.best) } };
  }
  function save(st, cur) { try { st.setItem(KEY, JSON.stringify(cur)); } catch (e) { /* storage blocked */ } }
  // write({idle:{...}}), write({sim:{...}}), write({guests:{...}}): shallow merge into what is stored.
  function write(patch, s) {
    const st = store(s);
    if (!st || !patch) return;
    const cur = read(st);
    if (patch.idle) Object.assign(cur.idle, patch.idle);
    if (patch.sim) Object.assign(cur.sim, patch.sim);
    if (patch.guests) Object.assign(cur.guests, patch.guests);
    if (patch.daily) Object.assign(cur.daily, patch.daily);
    save(st, cur);
  }
  // Live link between modes: the other tab's writes arrive as 'storage' events. cb() runs after any change to the shared key.
  function subscribe(cb) {
    if (!root.addEventListener) return;
    root.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) cb(); });
  }
  const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dayNum = (k) => { const p = String(k).split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); };
  // Daily streak across both modes. Idempotent per local calendar day. -> { streak, isNew, best }
  function touchDay(now, s) {
    const st = store(s);
    const d = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    const key = dayKey(d);
    const cur = read(st);
    const dl = cur.daily;
    if (dl.last === key) return { streak: dl.streak, isNew: false, best: dl.best };
    dl.streak = dl.last && dayNum(key) - dayNum(dl.last) === 1 ? dl.streak + 1 : 1;
    dl.best = Math.max(dl.best, dl.streak);
    dl.last = key;
    if (st) save(st, cur);
    return { streak: dl.streak, isNew: true, best: dl.best };
  }
  // Cross-mode trophies derived from the shared state.
  function trophies(state) {
    const st = state || read();
    const I = st.idle || {}, M = st.sim || {}, D = st.daily || {};
    const g = solved(st.guests), best = Math.max(num(D.best), num(D.streak));
    const played = (I.count > 0 || num(I.total) > 0) && (num(M.day) > 0 || num(M.stage) > 0);
    const T = (id, name, desc, got) => ({ id, name, desc, got: !!got });
    return [
      T('beginner', 'Haunted Beginner', 'Find your first ghost in Idle.', I.count >= 1),
      T('whisperer', 'Ghost Whisperer', 'Find 25 ghosts in Idle.', I.count >= 25),
      T('collector', 'Full Haunt', 'Find 60 ghosts in Idle.', I.count >= 60),
      T('exorcist', 'Exorcist', 'Exorcise your house 5 times.', num(I.exorcisms) >= 5),
      T('achiever', 'Overachiever', 'Earn 15 Idle achievements.', num(I.ach) >= 15),
      T('newhire', 'Night Clerk', 'Reach day 7 in the Simulator.', num(M.day) >= 7),
      T('manager', 'Hotel Manager', 'Reach stage 3 in the Simulator.', num(M.stage) >= 3),
      T('story5', 'Story Collector', 'Solve 5 special guests.', g >= 5),
      T('story10', 'Every Last Guest', 'Solve all 10 special guests.', g >= GUESTS.length),
      T('fivestar', 'Five-Star Host', 'Hold a Simulator rating of 4.5 or more.', num(M.rating) >= 4.5),
      T('both', 'Landlord of Both Worlds', 'Play both Idle and Simulator.', played),
      T('challenger', 'Challenger', 'Finish a challenge in either mode.', num(I.challenges) + num(M.challenges) >= 1),
      T('devoted', 'Devoted', 'Visit 7 days in a row.', best >= 7),
      T('haunted30', 'Permanent Resident', 'Visit 30 days in a row.', best >= 30),
    ];
  }
  const solved = (guests) => GUESTS.filter((g) => guests && guests[g.id]).length;
  const api = {
    KEY, GUESTS, read, write, solved, subscribe, touchDay, trophies,
    simRentBonus: (guests) => SIM_RENT_EACH * solved(guests),
    idleIncomeBonus: (count) => Math.min(IDLE_INCOME_CAP, IDLE_INCOME_EACH * (count || 0)),
  };
  root.HLShared = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
