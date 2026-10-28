// Simulator Mode rules. Pure logic: no DOM access, runs in the browser and in Node (tools/simsim.js).
(function (root) {
  'use strict';
  const D = root.SimData || require('./data.js');
  const K = D.CONST;

  // RNG is swapped per Sim instance (see the prototype wrapper at the bottom): Math.random for the main hotel, a seeded stream for challenges.
  let RNG = Math.random;
  const rand = (a, b) => a + RNG() * (b - a);
  const ri = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (a) => a[Math.floor(RNG() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function newState(ch) {
    const rooms = {};
    D.ROOMS.forEach((r) => { rooms[r.id] = { owned: !!r.start && !(ch && ch.rules && ch.rules.oneRoom && r.id !== 'r1'), cond: 100, lvl: 0, guest: null, theme: null }; });
    return {
      v: 1, hotelName: D.HOTEL_NAMES[0], day: 1, phase: 'plan', cash: ch && ch.startCash !== undefined ? ch.startCash : K.START_CASH, debt: ch && ch.startDebt || 0,
      comfort: 20, spook: 10, rate: 1, stage: 1, rooms,
      arrivals: [], cards: [], cardIdx: 0, log: [], last: null, ledger: [],
      upgrades: {}, staff: {}, perks: {}, stories: {}, nextId: 1,
      stats: { revenue: 0, expenses: 0, guests: 0, complaints: 0, stories: 0, bailouts: 0 },
      review: null, adDay: 0, gmOn: true, gmLvl: 1,
      props: {}, group: { revenue: 0, expenses: 0 },
      brand: 0, campaign: null, acq: [], offers: [], offerDay: 0,
      morale: {}, traits: {}, raises: {}, partyDay: 0, landmarks: {}, legacy: 0, runs: 0, world: 0,
      tutorial: { step: 0, done: !!ch, g0: 0, d0: 1 },
      // round 4: reviews, mods (timed income buffs and debuffs), VIPs, disasters, challenge run
      reviews: [], stars: [], mods: [], vipDay: 0, disaster: null, disasterEnd: 0,
      chal: ch ? { id: ch.id, days: ch.days, done: false, score: 0, ok: false } : null, rs: ch ? ch.seed >>> 0 : undefined,
    };
  }

  class Sim {
    // opts: { challenge: id, key: save key, fresh: true } runs a seeded challenge in its own save slot.
    constructor(storage, opts) {
      opts = opts || {};
      this.storage = storage || null;
      this.onEmit = () => {};
      this.key = opts.key || K.SAVE_KEY;
      this.chalDef = opts.challenge ? D.CHMAP[opts.challenge] : null;
      this.seasonOverride = null;   // 'none' disables seasons, a season id forces one
      this.notice = null;           // one-shot message for the UI (daily bonus)
      this.rngFn = () => {
        const S = this.S;
        if (!S || !S.chal || S.rs === undefined) return Math.random();
        S.rs = (S.rs + 0x6D2B79F5) >>> 0;   // mulberry32, state kept in the save so a resumed run stays on the same stream
        let t = S.rs;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      if (opts.fresh || !this.load()) this.reset();
      this.syncShared();
      if (!this.isChal()) { this.crossDay(); this.publish(); }
    }
    isChal() { return !!(this.S && this.S.chal); }

    // Cross-mode hooks (shared.js may not have them yet): daily touch bonus and published stats.
    crossDay() {
      const H = root.HLShared;
      if (!H || typeof H.touchDay !== 'function' || !this.storage) return;
      let r = null;
      try { r = H.touchDay(Date.now(), this.storage); } catch (e) { return; }
      if (!r || !r.isNew) return;
      const L = this.S.ledger.slice(-5), avg = L.length ? L.reduce((a, l) => a + l.revenue, 0) / L.length : 0;
      const bonus = Math.round(Math.max(60, avg * 0.5) + this.S.stage * 40);
      this.S.cash += bonus;
      this.notice = 'Daily visit' + (r.streak ? ', streak ' + r.streak : '') + ': the ghosts left $' + bonus + ' in the till for turning up.';
      this.save();
    }
    storiesSolved() { return D.STORIES.filter((s) => !s.season && this.S.stories[s.id] && this.S.stories[s.id].done && this.S.stories[s.id].good >= s.steps.length - 1).length; }
    publish() {
      const H = root.HLShared;
      if (!H || typeof H.write !== 'function' || this.isChal() || !this.storage) return;
      try {
        H.write({ sim: { day: this.S.day, stage: this.S.stage, stories: this.storiesSolved(), rating: this.ratingAvg(), challenges: Sim.completed(this.storage), income: this.S.stats.revenue + this.S.group.revenue } }, this.storage);
      } catch (e) { /* shared bridge not ready */ }
    }
    takeNotice() { const n = this.notice; this.notice = null; return n; }

    // Idle's discovered-ghost count lives in the shared Codex key; Simulator guests are written back to it.
    syncShared() {
      const H = root.HLShared;
      this.idleCount = H && !this.isChal() ? H.read(this.storage).idle.count : 0;
    }
    // Called when the other mode changes the shared key (storage event from the other tab). Returns true if anything changed.
    refreshShared() {
      const before = this.idleCount;
      this.syncShared();
      return this.idleCount !== before;
    }
    shareGuest(id) {
      const H = root.HLShared;
      if (H && !this.isChal()) H.write({ guests: { [id]: 1 } }, this.storage);
    }

    reset() { this.S = newState(this.chalDef); this.S.hotelName = pick(D.HOTEL_NAMES); this.genArrivals(); this.save(); }

    save() {
      try { if (this.storage) this.storage.setItem(this.key, JSON.stringify(this.S)); } catch (e) { /* blocked */ }
      this.publish();
    }

    load() {
      try {
        const raw = this.storage && this.storage.getItem(this.key);
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s || s.v !== 1) return false;
        if (this.chalDef ? !s.chal || s.chal.id !== this.chalDef.id : !!s.chal) return false;
        const base = newState(this.chalDef);
        this.S = Object.assign(base, s);
        D.ROOMS.forEach((r) => { if (!this.S.rooms[r.id]) this.S.rooms[r.id] = base.rooms[r.id]; if (this.S.rooms[r.id].theme === undefined) this.S.rooms[r.id].theme = null; });
        Object.keys(this.S.staff).forEach((id) => { if (!(id in this.S.morale) && id !== 'regional') this.initStaff(id); });
        Object.keys(this.S.props).forEach((id) => this.prop(id));
        // Saves from before the tutorial existed: skip it for anyone who already played.
        if (!s.tutorial) this.S.tutorial = { step: 0, done: this.S.day > 1 || this.S.stats.guests > 0, g0: 0, d0: 1 };
        return true;
      } catch (e) { return false; }
    }

    // ---- lookups ----
    ownedRooms() { return D.ROOMS.filter((r) => this.S.rooms[r.id].owned); }
    freeRooms() { return this.ownedRooms().filter((r) => !this.S.rooms[r.id].guest); }
    occupied() { return this.ownedRooms().filter((r) => this.S.rooms[r.id].guest); }
    costCut() { return this.S.landmarks.tower ? 0.85 : 1; }
    staffName(id) { return id === 'gm' ? 'General Manager' : (D.STAFFMAP[id] || { name: id }).name; }
    wageOf(id) {
      const base = id === 'gm' ? D.GM.wage[this.S.gmLvl - 1] : D.STAFFMAP[id].wage;
      return Math.round(base * (1 + D.MORALE.raiseStep * (this.S.raises[id] || 0)) * (this.S.traits[id] === 'frugal' ? 0.9 : 1));
    }
    wages() { return Math.round(Object.keys(this.S.staff).filter((id) => id !== 'regional').reduce((n, id) => n + this.wageOf(id), 0) * this.costCut()); }
    // Morale factor for a staff member: 1.15 when happy, 0.7 when miserable, x1.1 for Driven.
    mor(id) {
      const m = this.S.morale[id];
      if (m === undefined) return 1;
      const f = m >= D.MORALE.high ? 1.15 : m >= D.MORALE.low ? 1 : 0.7;
      return this.S.traits[id] === 'driven' ? f * 1.1 : f;
    }
    initStaff(id) { const d = D.STAFFMAP[id]; this.S.morale[id] = (d && d.startMorale) || D.MORALE.start; this.S.traits[id] = pick(D.TRAITS).id; }
    dropStaff(id) { delete this.S.staff[id]; delete this.S.morale[id]; delete this.S.traits[id]; delete this.S.raises[id]; }
    party() {
      const S = this.S, n = this.partyHeads(), cost = D.MORALE.partyCost * n;
      if (S.phase !== 'plan' || !n || S.partyDay === S.day || S.cash < cost) return false;
      S.cash -= cost; S.partyDay = S.day;
      Object.keys(S.morale).forEach((id) => { S.morale[id] = clamp(S.morale[id] + D.MORALE.partyGain * ((D.STAFFMAP[id] && D.STAFFMAP[id].partyMult) || 1), 0, 100); });
      this.gmProps().forEach((d) => { const p = this.prop(d.id); p.morale = clamp(p.morale + D.MORALE.partyGain, 0, 100); });
      this.save(); return true;
    }
    // Staff party covers the main hotel's staff and every branch manager.
    partyHeads() { return Object.keys(this.S.morale).filter((id) => this.S.staff[id]).length + this.gmProps().length; }
    partyCost() { return D.MORALE.partyCost * this.partyHeads(); }
    gmProps() { return this.ownedProps().filter((d) => this.prop(d.id).gm); }
    // Branch managers have their own morale, trait and raises (stored on the property).
    bmor(p) {
      const f = p.morale >= D.MORALE.high ? 1.15 : p.morale >= D.MORALE.low ? 1 : 0.7;
      return p.trait === 'driven' ? f * 1.1 : f;
    }
    bWage(p) { return Math.round(D.GM.wage[p.gmLvl - 1] * (1 + D.MORALE.raiseStep * p.raises) * (p.trait === 'frugal' ? 0.9 : 1)); }
    raiseBranch(id) {
      const p = this.prop(id);
      if (!p.owned || !p.gm || p.raises >= D.MORALE.raiseMax) return false;
      p.raises++; p.morale = clamp(p.morale + D.MORALE.raiseGain, 0, 100);
      this.save(); return true;
    }
    raise(id) {
      const S = this.S;
      if (!S.staff[id] || id === 'regional' || (S.raises[id] || 0) >= D.MORALE.raiseMax) return false;
      S.raises[id] = (S.raises[id] || 0) + 1; S.morale[id] = clamp(S.morale[id] + D.MORALE.raiseGain, 0, 100);
      this.save(); return true;
    }
    moraleTick(rec) {
      const S = this.S, M = D.MORALE;
      Object.keys(S.staff).forEach((id) => {
        if (!(id in S.morale)) return;
        const t = S.traits[id];
        S.morale[id] = clamp(S.morale[id] - M.decay * (t === 'cheerful' ? 0.75 : t === 'driven' ? 1.25 : 1) * ((D.STAFFMAP[id] && D.STAFFMAP[id].decay) || 1), 0, 100);
        if (S.morale[id] <= M.quit) {
          const nm = this.staffName(id);
          rec.quit.push(nm); S.log.push(nm + ' quit. Morale hit rock bottom.');
          this.fire(id);
        }
      });
    }
    gmActive() { return !!(this.S.staff.gm && this.S.gmOn); }
    upkeep() {
      const n = this.ownedRooms().reduce((a, r) => a + K.UPKEEP * (1 + (this.S.rooms[r.id].lvl || 0) * K.UPKEEP_LEVEL), 0);
      return Math.round(n * (this.S.perks.auditor ? 0.9 : 1) * this.costCut());
    }
    // Complaint and event costs grow with the hotel so they stay a real expense.
    costMult() { return 1 + Math.max(0, this.ownedRooms().length - 2) * 0.2; }

    match(typeId, roomId) {
      const gt = D.GMAP[typeId], rm = D.RMAP[roomId];
      let m = D.MATCH[gt.want][rm.type];
      if (this.S.upgrades.spook && gt.want === 'spooky' && (rm.type === 'haunted' || rm.type === 'cellar')) m = Math.min(1, m + 0.15);
      return m;
    }
    matchLabel(m) { return m >= 0.8 ? 'Great fit' : m >= 0.5 ? 'Okay fit' : 'Poor fit'; }

    roomIncome(roomId, g) {
      const rm = D.RMAP[roomId];
      let v = rm.base * K.LEVEL_MULT[this.S.rooms[roomId].lvl || 0] * this.S.rate * D.GMAP[g.type].pay;
      if (rm.type === 'suite' && this.S.perks.bride) v *= 1.15;
      if (this.S.upgrades.minibar) v *= 1.1;
      if (this.S.upgrades.lounge) v *= K.LOUNGE_MULT;
      if (this.S.staff.chef) v *= 1 + (K.CHEF_MULT - 1) * this.mor('chef');
      const th = this.S.rooms[roomId].theme, gt = D.GMAP[g.type];
      if (th && D.TMAP[th].likes.indexOf(g.type) >= 0) v *= D.TMAP[th].mult;
      if (this.S.staff.spectral && (gt.want === 'spooky' || gt.want === 'cheap')) v *= 1 + 0.1 * this.mor('spectral');
      v *= this.ratingMult();
      v *= this.incomeMult();
      return Math.round(v);
    }

    // ---- round 4 helpers: ratings, mods, seasons, themes ----
    ratingAvg() { const a = this.S.stars; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
    ratingMult() { return this.S.stars.length >= K.RATING_MIN ? 1 + (this.ratingAvg() - 3.5) * 0.02 : 1; }
    modMult() { return this.S.mods.reduce((m, x) => m * x.mult, 1); }
    addMod(name, mult, days) {
      const S = this.S, i = S.mods.findIndex((m) => m.name === name);
      if (i >= 0) S.mods.splice(i, 1);
      S.mods.push({ name, mult, left: days });
    }
    modsTick() {
      const S = this.S;
      S.mods.forEach((m) => { m.left--; });
      S.mods.filter((m) => m.left <= 0).forEach((m) => S.log.push(m.name + (m.mult >= 1 ? ' bonus has worn off.' : ' has blown over.')));
      S.mods = S.mods.filter((m) => m.left > 0);
    }
    season() {
      if (this.isChal() || this.seasonOverride === 'none') return null;
      return D.seasonAt(Date.now(), this.seasonOverride);
    }
    seasonOpen(g) { if (!g.season) return true; const c = this.season(); return !!c && c.id === g.season; }
    themeCost(roomId) { return Math.round(D.RMAP[roomId].base * K.THEME_COST); }
    dressRoom(roomId, themeId) {
      const S = this.S, r = S.rooms[roomId];
      if (S.phase !== 'plan' || !r || !r.owned) return false;
      if (!themeId) { if (!r.theme) return false; r.theme = null; this.save(); return true; }
      const t = D.TMAP[themeId], c = this.themeCost(roomId);
      if (!t || r.theme === themeId || S.cash < c) return false;
      S.cash -= c; r.theme = themeId; this.save(); return true;
    }
    // A themed room that the guest type likes.
    themed(roomId, typeId) { const th = this.S.rooms[roomId].theme; return !!th && D.TMAP[th].likes.indexOf(typeId) >= 0; }

    // ---- reviews ----
    addReview(stars, who, text, room) {
      const S = this.S;
      const rv = { day: S.day, stars, who, room: room || '', text };
      S.reviews.unshift(rv); if (S.reviews.length > K.REVIEW_KEEP) S.reviews.length = K.REVIEW_KEEP;
      S.stars.push(stars); if (S.stars.length > K.RATING_WINDOW) S.stars.shift();
      return rv;
    }
    makeReview(g, gt, roomId) {
      const S = this.S, rm = D.RMAP[roomId], sat = g.sat;
      let stars = sat >= 85 ? 5 : sat >= 70 ? 4 : sat >= 55 ? 3 : sat >= 35 ? 2 : 1;
      if (S.staff.banshee && stars < 5 && RNG() < 0.25 * this.mor('banshee')) stars++;
      let text = pick(D.REVIEWS[stars]).replace('{room}', rm.name);
      const ex = [];
      if (S.rooms[roomId].cond < 40 && stars <= 3 && RNG() < 0.5) ex.push(D.REVIEW_ROOM);
      else if (g.cx && stars !== 3 && (stars >= 4 || (g.cs || 0) < 10) && RNG() < 0.5) ex.push(pick(stars >= 4 ? D.REVIEW_CX.good : D.REVIEW_CX.bad));
      else if (D.REVIEW_WANT[gt.want] && (stars >= 4 || stars <= 2) && RNG() < 0.4) ex.push(pick(D.REVIEW_WANT[gt.want][stars >= 4 ? 'hi' : 'lo']));
      const th = S.rooms[roomId].theme;
      if (th && stars >= 4 && this.themed(roomId, g.type) && RNG() < 0.35) ex.push('Loved the ' + D.TMAP[th].name + ' decor.');
      const sea = this.season();
      if (sea && stars >= 3 && RNG() < 0.25) ex.push(sea.review);
      if (ex.length) text += ' ' + ex.join(' ');
      return this.addReview(stars, gt.name, text, rm.name);
    }

    // ---- planning phase ----
    genArrivals() {
      const S = this.S;
      let n = 2 + Math.floor((S.comfort + S.spook) / 40) + (S.upgrades.lobby ? 1 : 0) + (S.perks.harlow ? 1 : 0) + ri(0, 2);
      if (S.rate < 1) n += 1; else if (S.rate > 1) n -= 1;
      if (S.stars.length >= K.RATING_MIN) { const R = this.ratingAvg(); if (R >= 4.3) n += 1; else if (R < 2.8) n -= 1; }
      if (S.disaster) n -= D.DMAP[S.disaster.id].tick.arr || 0;
      n = clamp(n + Math.floor(this.ownedRooms().length / 3), 1, K.MAX_ARRIVALS);
      S.arrivals = [];
      for (let i = 0; i < n; i++) this.pushArrival();
    }

    // Branch guests only show up once you own their home property.
    homeOpen(g) {
      if (!g.home) return true;
      if (g.home === 'acq') return this.S.acq.some((a) => this.prop(a.id).owned);
      return !!this.S.props[g.home] && this.S.props[g.home].owned;
    }

    pushArrival() {
      const S = this.S;
      const pool = D.GUESTS.filter((g) => this.homeOpen(g) && this.seasonOpen(g) && (!g.gate || ((g.gate.comfort || 0) <= S.comfort && (g.gate.spook || 0) <= S.spook)));
      const total = pool.reduce((a, g) => a + g.weight, 0);
      let r = RNG() * total, t = pool[0];
      for (const g of pool) { r -= g.weight; if (r <= 0) { t = g; break; } }
      S.arrivals.push({ id: S.nextId++, type: t.id, nights: ri(t.nights[0], t.nights[1]) });
    }

    // Pay for advertising: two extra arrivals today, once per day.
    runAd() {
      const S = this.S;
      if (S.phase !== 'plan' || S.adDay === S.day || S.cash < K.AD_COST) return false;
      S.cash -= K.AD_COST; S.adDay = S.day;
      this.pushArrival(); this.pushArrival();
      return true;
    }

    setRate(r) {
      if (this.S.phase !== 'plan' || !K.RATES.some((x) => x.id === r)) return false;
      this.S.rate = r; return true;
    }

    refuses(typeId) { return !!D.GMAP[typeId].cheap && this.S.rate > 1; }

    assign(arrivalId, roomId) {
      const S = this.S;
      if (S.phase !== 'plan') return { ok: false, msg: 'The desk is already open.' };
      const i = S.arrivals.findIndex((a) => a.id === arrivalId);
      const room = S.rooms[roomId];
      if (i < 0 || !room || !room.owned || room.guest) return { ok: false, msg: 'That room is not available.' };
      const a = S.arrivals[i];
      if (this.refuses(a.type)) return { ok: false, msg: D.GMAP[a.type].name + ' will not pay premium rates.' };
      const m = this.match(a.type, roomId), gt = D.GMAP[a.type];
      let sat = 35 + m * 40 + (room.cond / 100) * 15 + (S.upgrades.lounge ? 4 : 0) + (S.staff.chef ? 6 : 0);
      if (this.themed(roomId, a.type)) sat += 5;
      if (S.staff.poltergeist && gt.want === 'spooky') sat += 8 * this.mor('poltergeist');
      if (S.rate < 1) sat += 8; else if (S.rate > 1) sat += m >= 0.8 ? 2 : -12;
      room.guest = { id: a.id, type: a.type, left: a.nights, nights: a.nights, sat: Math.round(clamp(sat, 5, 100)), cx: 0, cs: 0 };
      S.arrivals.splice(i, 1);
      S.stats.guests++;
      return { ok: true };
    }

    turnAway(arrivalId) {
      const S = this.S;
      if (S.phase !== 'plan') return false;
      const i = S.arrivals.findIndex((a) => a.id === arrivalId);
      if (i < 0) return false;
      S.arrivals.splice(i, 1);
      return true;
    }

    repairCost(roomId) { return Math.ceil((100 - this.S.rooms[roomId].cond) * K.REPAIR_COST); }
    repair(roomId) {
      const r = this.S.rooms[roomId], c = this.repairCost(roomId);
      if (this.S.phase !== 'plan' || !r || !r.owned || c <= 0 || this.S.cash < c) return false;
      this.S.cash -= c; r.cond = 100; return true;
    }

    // Renovation levels: more rent per night, higher upkeep. Room must be empty.
    levelCost(roomId) {
      const lvl = this.S.rooms[roomId].lvl || 0;
      return lvl >= K.LEVEL_COST.length ? 0 : Math.round(D.RMAP[roomId].base * K.LEVEL_COST[lvl]);
    }
    upgradeRoom(roomId) {
      const r = this.S.rooms[roomId], c = this.levelCost(roomId);
      if (this.S.phase !== 'plan' || !r || !r.owned || r.guest || !c || this.S.cash < c) return false;
      this.S.cash -= c; r.lvl = (r.lvl || 0) + 1; r.cond = 100; this.save(); return true;
    }

    buyRoom(id) {
      const def = D.RMAP[id], r = this.S.rooms[id];
      if (this.S.phase !== 'plan' || !def || !def.cost || r.owned || this.S.cash < def.cost) return false;
      if (this.S.chal && this.chalDef.rules && this.chalDef.rules.oneRoom) return false;
      this.S.cash -= def.cost; r.owned = true; r.cond = 100; this.save(); return true;
    }
    buyUpgrade(id) {
      const u = D.UPGRADES.find((x) => x.id === id);
      if (this.S.phase !== 'plan' || !u || this.S.upgrades[id] || this.S.cash < u.cost) return false;
      this.S.cash -= u.cost; this.S.upgrades[id] = true; this.save(); return true;
    }
    hire(id) {
      const def = D.STAFFMAP[id];
      if (this.S.chal && this.chalDef.rules && this.chalDef.rules.noStaff) return false;
      if (id === 'gm') { if (this.S.stage < 3 || !this.S.staff.desk || this.S.staff.gm) return false; }
      else if (!def || this.S.stage < def.stage || this.S.staff[id]) return false;
      this.S.staff[id] = true; this.initStaff(id); this.save(); return true;
    }
    fire(id) {
      if (!this.S.staff[id]) return false;
      this.dropStaff(id);
      if (id === 'desk' && this.S.staff.gm) this.dropStaff('gm'); // the GM needs a front desk lead
      this.save(); return true;
    }
    trainGM() {
      const S = this.S, c = D.GM.train[S.gmLvl - 1];
      if (!S.staff.gm || !c || S.cash < c || S.phase !== 'plan') return false;
      S.cash -= c; S.gmLvl++; this.save(); return true;
    }
    toggleGM() { if (!this.S.staff.gm) return false; this.S.gmOn = !this.S.gmOn; this.save(); return true; }

    // Place each waiting arrival in its best-fit free room (front desk lead and GM do this).
    autoAssign() {
      this.S.arrivals.slice().forEach((a) => {
        if (this.refuses(a.type)) return;
        let best = null, bm = 0.4;
        this.freeRooms().forEach((r) => { const m = this.match(a.type, r.id); if (m >= bm) { bm = m; best = r; } });
        if (best) this.assign(a.id, best.id);
      });
    }
    repay() {
      const S = this.S, amt = Math.min(S.cash, S.debt);
      if (amt <= 0) return false;
      S.cash -= amt; S.debt -= amt; return true;
    }

    // ---- stage 4: extra properties ----
    prop(id) {
      const P = this.S.props;
      if (!P[id]) P[id] = { owned: false, lvl: 0, gm: false, gmLvl: 1, quality: 40, last: null, rev: 0, exp: 0 };
      const p = P[id];
      if (p.morale === undefined) { p.morale = D.MORALE.start; p.trait = pick(D.TRAITS).id; p.raises = 0; }
      return p;
    }
    allProps() { return D.PROPERTIES.concat(this.S.acq, D.FRANCHISES); }
    ownedProps() { return this.allProps().filter((p) => this.prop(p.id).owned); }
    propDef(id) { return this.allProps().find((p) => p.id === id); }

    // ---- stage 5: group marketing and acquisitions ----
    incomeMult() {
      const S = this.S, H = root.HLShared;
      return (1 + D.BRAND.income * S.brand) * (S.campaign ? S.campaign.mult : 1) * (1 + (H ? H.idleIncomeBonus(this.idleCount) : 0)) *
        (1 + K.LEGACY_INCOME * S.legacy) * (S.landmarks.palace ? 1.1 : 1) * (S.perks.lastguest ? 1.03 : 1) * (1 + D.WORLD.income * S.world) * (S.perks.founder ? 1.08 : 1) * this.modMult() * (this.season() ? this.season().mult : 1);
    }
    legacyPoints() { return Math.floor(Math.sqrt((this.S.stats.revenue + this.S.group.revenue) / K.LEGACY_DIV)); }
    buyLandmark(id) {
      const S = this.S, def = D.LANDMARKS.find((l) => l.id === id);
      if (S.stage < 6 || S.phase !== 'plan' || !def || S.landmarks[id] || S.cash < def.cost) return false;
      S.cash -= def.cost; S.landmarks[id] = true; this.save(); return true;
    }
    // Retire: start over with a permanent income bonus and a cash gift. Shared Codex progress is kept.
    retire() {
      const S = this.S, pts = this.legacyPoints();
      if (S.stage < 6 || S.phase !== 'plan' || pts < 1) return false;
      const ns = newState();
      ns.tutorial.done = true;
      ns.legacy = S.legacy + pts; ns.runs = S.runs + 1; ns.cash += ns.legacy * K.LEGACY_CASH;
      this.S = ns; this.genArrivals(); this.save();
      return pts;
    }
    worldCost() { return this.S.world >= D.WORLD.max ? 0 : Math.round(D.WORLD.cost * Math.pow(D.WORLD.growth, this.S.world) / 1000) * 1000; }
    buyWorld() {
      const S = this.S, c = this.worldCost();
      if (S.stage < 7 || S.phase !== 'plan' || !c || S.cash < c) return false;
      S.cash -= c; S.world++; this.save(); return true;
    }
    buyBrand() {
      const S = this.S, c = D.BRAND.cost[S.brand];
      if (S.stage < 5 || S.phase !== 'plan' || !c || S.cash < c) return false;
      S.cash -= c; S.brand++; this.save(); return true;
    }
    startCampaign(id) {
      const S = this.S, def = D.CAMPAIGNS.find((c) => c.id === id);
      if (S.stage < 5 || S.phase !== 'plan' || !def || S.campaign || S.cash < def.cost) return false;
      S.cash -= def.cost; S.campaign = { id, name: def.name, mult: def.mult, left: def.days + (S.perks.zelda ? 5 : 0) }; this.save(); return true;
    }
    refreshOffers() {
      const S = this.S;
      S.offers = [];
      for (let i = 0; i < 3; i++) {
        const rooms = ri(5, 12), rate = ri(110, 260);
        S.offers.push({
          id: 'acq' + (S.nextId++), name: pick(D.RUNDOWN.names) + ' ' + pick(D.RUNDOWN.kinds), rooms, rate,
          trouble: Math.round(rand(0.25, 0.55) * 100) / 100, text: pick(D.RUNDOWN.flavor),
          cost: Math.round(rooms * rate * K.ACQ_PRICE * rand(0.85, 1.15) / 100) * 100,
        });
      }
      S.offerDay = S.day;
    }
    buyAcq(id) {
      const S = this.S, i = S.offers.findIndex((o) => o.id === id);
      if (i < 0 || S.stage < 5 || S.phase !== 'plan' || S.acq.length >= K.ACQ_MAX || S.cash < S.offers[i].cost) return false;
      const o = S.offers.splice(i, 1)[0];
      S.cash -= o.cost; S.acq.push(o);
      const p = this.prop(o.id); p.owned = true; p.quality = 15;
      this.save(); return true;
    }
    propRenoCost(id) {
      const p = this.prop(id);
      return p.lvl >= K.RENO_COST.length ? 0 : Math.round(this.propDef(id).cost * K.RENO_COST[p.lvl]);
    }
    buyProp(id) {
      const def = this.propDef(id), p = def && this.prop(id);
      if (!def || this.S.stage < (def.stage || 4) || this.S.phase !== 'plan' || p.owned || this.S.cash < def.cost) return false;
      this.S.cash -= def.cost; p.owned = true; this.save(); return true;
    }
    hireBranchGM(id) {
      const p = this.prop(id);
      if (!p.owned || p.gm) return false;
      p.gm = true; p.morale = D.MORALE.start; p.trait = pick(D.TRAITS).id; p.raises = 0; this.save(); return true;
    }
    fireBranchGM(id) { const p = this.prop(id); if (!p.gm) return false; p.gm = false; p.gmLvl = 1; p.raises = 0; this.save(); return true; }
    trainBranchGM(id) {
      const p = this.prop(id), c = D.GM.train[p.gmLvl - 1];
      if (!p.owned || !p.gm || !c || this.S.cash < c || this.S.phase !== 'plan') return false;
      this.S.cash -= c; p.gmLvl++; this.save(); return true;
    }
    renovateProp(id) {
      const p = this.prop(id), c = this.propRenoCost(id);
      if (!p.owned || !c || this.S.cash < c || this.S.phase !== 'plan') return false;
      this.S.cash -= c; p.lvl++; p.quality = clamp(p.quality + 15, 0, 100); this.save(); return true;
    }
    hireRegional() {
      const S = this.S;
      if (S.stage < 4 || S.staff.regional || !this.ownedProps().length || this.isChal()) return false;
      S.staff.regional = true; this.save(); return true;
    }
    fireRegional() { if (!this.S.staff.regional) return false; delete this.S.staff.regional; this.save(); return true; }

    // Overnight books for every owned property. Profit goes to group cash; the regional wage is a group expense.
    runBranches(rec) {
      const S = this.S;
      rec.branches = []; rec.branchProfit = 0; rec.regional = S.staff.regional ? D.REGIONAL.wage : 0;
      this.ownedProps().forEach((def) => {
        const p = this.prop(def.id);
        let occ = p.gm ? 0.4 + p.quality / 250 + p.gmLvl * 0.06 * this.bmor(p) + (S.staff.regional ? 0.05 : 0) : 0.2;
        if (def.swing) { const sw = Math.sin(S.day / def.swing * Math.PI * 2) * 0.15; occ += S.perks.gunnar ? Math.max(0, sw) : sw; }
        if (S.perks.porter && def.id.indexOf('acq') === 0) occ += 0.05;
        if (S.landmarks.spire) occ += 0.05;
        occ = clamp(occ + D.BRAND.occ * S.brand + rand(-0.08, 0.08), 0.1, 0.95);
        const rev = Math.round(Math.round(def.rooms * occ) * def.rate * (1 + 0.2 * p.lvl) * this.incomeMult() * (S.perks.barnacle && def.id === 'seaside' ? 1.15 : 1));
        const upkeep = Math.round(def.rooms * K.BRANCH_UPKEEP * (1 + 0.4 * p.lvl) * (def.upkeepMult || 1));
        const exp = Math.round((upkeep + (p.gm ? this.bWage(p) : 0)) * this.costCut()) + Math.round(rev * K.BRANCH_TAX);
        p.quality = clamp(p.quality + (p.gm ? (0.5 + 0.2 * (p.gmLvl - 1)) * this.bmor(p) : 0) - (S.landmarks.spire ? 0 : 0.5), 0, 100);
        p.rev += rev; p.exp += exp;
        S.group.revenue += rev; S.group.expenses += exp;
        p.last = { occ: Math.round(occ * 100), rev, exp, profit: rev - exp };
        rec.branches.push({ id: def.id, name: def.name, occ: p.last.occ, rev, exp, profit: rev - exp, nogm: !p.gm, morale: p.gm ? Math.round(p.morale) : null });
        if (p.gm) {
          p.morale = clamp(p.morale - D.MORALE.branchDecay * (p.trait === 'cheerful' ? 0.75 : p.trait === 'driven' ? 1.25 : 1), 0, 100);
          if (p.morale <= D.MORALE.quit) {
            rec.quit.push('The manager of ' + def.name); S.log.push('The manager of ' + def.name + ' quit. Morale hit rock bottom.');
            p.gm = false; p.gmLvl = 1; p.raises = 0;
          }
        }
        rec.branchProfit += rev - exp;
      });
      S.group.expenses += rec.regional;
      if (S.campaign && --S.campaign.left <= 0) { S.log.push('The ' + S.campaign.name + ' campaign has ended.'); S.campaign = null; }
    }

    applyBranchEvent(card, optIdx, byRegional) {
      const S = this.S, def = D.BRANCH_EVENTS.find((x) => x.id === card.event), o = def.opts[optIdx];
      const pd = this.propDef(card.prop), p = this.prop(card.prop);
      const cash = Math.round(o.cash * pd.rooms / 4);
      S.cash += cash;
      p.quality = clamp(p.quality + o.q, 0, 100);
      S.comfort = clamp(S.comfort + o.comfort, 0, 100);
      const note = def.title + ' at ' + pd.name + ': ' + o.t + (cash ? ' (' + (cash > 0 ? '+' : '-') + '$' + Math.abs(cash) + ')' : '');
      S.log.push((byRegional ? 'Regional manager handled ' : '') + note);
      return { note, ok: cash >= 0 && o.q >= 0 };
    }

    // ---- shift phase ----
    openDesk() {
      const S = this.S;
      if (S.phase !== 'plan') return false;
      if (S.staff.desk) this.autoAssign();
      S.arrivals = []; // anyone not placed walks away
      S.log = [];
      const cards = [];
      const used = {};
      this.occupied().forEach((r) => {
        const g = S.rooms[r.id].guest;
        const p = clamp(0.15 + (60 - g.sat) / 100 + (50 - S.rooms[r.id].cond) / 200, 0.05, 0.8) * (S.upgrades.soundproof ? 0.75 : 1);
        if (RNG() < p * (S.staff.watchman ? 0.8 : 1) && cards.length < K.MAX_CARDS) {
          const def = pick(D.COMPLAINTS.filter((x) => !used[x.id])); used[def.id] = 1;
          cards.push({ kind: 'complaint', def: def.id, room: r.id });
        }
      });
      if (S.staff.poltergeist && this.occupied().length && cards.length < K.MAX_CARDS && RNG() < 0.15 / this.mor('poltergeist')) {
        const rr = pick(this.occupied());
        cards.push({ kind: 'complaint', def: pick(D.COMPLAINTS.filter((x) => !used[x.id])).id, room: rr.id });
      }
      const story = D.STORIES.find((s) => this.storyOpen(s) && !(S.stories[s.id] && S.stories[s.id].done));
      // staff take complaints first, up to their capacity
      const gm = this.gmActive();
      let cap = gm ? Infinity : Math.round((S.staff.housekeeper ? 2 * this.mor('housekeeper') : 0) + (S.staff.bellhop ? 2 * this.mor('bellhop') : 0));
      const satMult = gm ? D.GM.sat[S.gmLvl - 1] * this.mor('gm') : 1;
      const todo = [];
      cards.forEach((c) => {
        if (cap > 0) { cap--; this.applyComplaint(c, 1, true, satMult); } else todo.push(c);
      });
      if (S.day >= 2 && RNG() < K.EVENT_CHANCE) {
        const ec = { kind: 'event', event: pick(D.EVENTS).id };
        if (gm) this.applyEvent(ec, 1, true); else todo.push(ec);
      }
      this.ownedProps().forEach((def) => {
        const p = this.prop(def.id);
        if (!p.gm || RNG() >= def.trouble * (S.perks.ravenscroft && def.id === 'manor' ? 0.5 : 1) / (p.gmLvl * this.bmor(p))) return;
        const bc = { kind: 'branch', prop: def.id, event: pick(D.BRANCH_EVENTS).id };
        if (S.staff.regional) this.applyBranchEvent(bc, 1, true); else todo.push(bc);
      });
      this.rollDisaster();
      if (S.disaster) {
        const dc = { kind: 'disaster', id: S.disaster.id, step: S.disaster.day };
        if (gm && D.DMAP[S.disaster.id].gmOk) this.applyDisaster(dc, 1, true); else todo.unshift(dc);
      }
      const vip = this.rollVip();
      if (vip) todo.push({ kind: 'vip', vip, step: 0, good: 0 });
      if (story) {
        if (!S.stories[story.id]) S.stories[story.id] = { step: 0, good: 0, done: false };
        todo.push({ kind: 'story', story: story.id, step: S.stories[story.id].step });
      }
      S.cards = todo; S.cardIdx = 0; S.phase = 'shift';
      this.save();
      if (!todo.length && gm) this.closeDesk(); // the GM runs the whole day
      return true;
    }

    // ---- VIP and inspector days ----
    rollVip() {
      const S = this.S, rules = (this.chalDef && this.chalDef.rules) || {};
      if (S.day < K.VIP_MIN_DAY || S.day - S.vipDay < K.VIP_GAP || this.ownedRooms().length < 2) return null;
      const chance = clamp(0.06 + 0.004 * S.day + 0.01 * this.ownedRooms().length, 0, 0.22) * (rules.disasterMult ? 2 : 1);
      if (RNG() >= chance) return null;
      S.vipDay = S.day;
      return pick(D.VIPS).id;
    }
    // The Resident Medium points at the best answer (and at a wrong one when he is miserable).
    hint(card) {
      const S = this.S;
      if (!S.staff.medium || !card) return -1;
      let idx = -1;
      if (card.kind === 'vip') idx = D.VMAP[card.vip].steps[card.step].opts.findIndex((o) => o.ok);
      else if (card.kind === 'disaster') idx = 2;
      if (idx < 0) return -1;
      return S.morale.medium < D.MORALE.low ? (idx + 1) % 3 : idx;
    }
    finishVip(v, good) {
      const S = this.S, tier = good === 3 ? 'win' : good === 2 ? 'ok' : 'bad', o = v[tier];
      const cash = Math.round(o.cash * this.costMult());
      S.cash += cash;
      S.comfort = clamp(S.comfort + o.comfort, 0, 100); S.spook = clamp(S.spook + o.spook, 0, 100);
      o.stars.forEach((st2) => this.addReview(st2, v.guest, pick(D.REVIEWS[st2]).replace('{room}', 'the hotel'), ''));
      if (o.mod) this.addMod(o.mod.name, o.mod.mult, o.mod.days);
      S.log.push(v.guest + ': ' + o.t + (cash ? ' (' + (cash > 0 ? '+' : '-') + '$' + Math.abs(cash) + ')' : ''));
      return { ending: o.t, tier, perk: o.mod ? o.mod.name + ': income x' + o.mod.mult + ' for ' + o.mod.days + ' days.' : '' };
    }

    // ---- disasters: multi-day crises with one decision a day ----
    rollDisaster() {
      const S = this.S, rules = (this.chalDef && this.chalDef.rules) || {}, mult = rules.disasterMult || 1;
      if (S.disaster || S.day < (mult > 1 ? 3 : K.DISASTER_MIN_DAY) || S.day - S.disasterEnd < (mult > 1 ? 3 : K.DISASTER_GAP)) return;
      if (RNG() >= K.DISASTER_CHANCE * mult) return;
      S.disaster = { id: pick(D.DISASTERS).id, day: 0, sev: 2, start: S.day };
    }
    applyDisaster(card, optIdx, byGM) {
      const S = this.S, d = S.disaster, def = D.DMAP[d.id], o = def.opts[optIdx];
      const cash = Math.round(o[1] * this.costMult());
      S.cash += cash; d.sev = clamp(d.sev + o[2], 0, 5); d.day++;
      const note = def.name + ', day ' + d.day + ': ' + o[0] + (cash ? ' (-$' + Math.abs(cash) + ')' : '');
      S.log.push((byGM ? 'GM handled ' : '') + note);
      return { note, ok: o[2] <= 0 };
    }
    disasterLoss(revenue) {
      const d = this.S.disaster;
      return d ? Math.round(revenue * (D.DMAP[d.id].tick.rev || 0) * d.sev * (this.S.staff.watchman ? 0.7 : 1)) : 0;
    }
    // Overnight effects of an active crisis; ends it after the last day.
    disasterNight(rec) {
      const S = this.S, d = S.disaster;
      if (!d) return;
      const def = D.DMAP[d.id], t = def.tick, f = d.sev * (S.staff.watchman ? 0.7 : 1);
      if (t.cond) this.ownedRooms().forEach((r) => { S.rooms[r.id].cond = clamp(S.rooms[r.id].cond - Math.round(t.cond * f), 0, 100); });
      if (t.sat) this.occupied().forEach((r) => { const g = S.rooms[r.id].guest; g.sat = clamp(g.sat - Math.round(t.sat * f), 0, 100); });
      if (t.comfort) S.comfort = clamp(S.comfort - t.comfort * f, 0, 100);
      if (t.fake && d.sev >= 3) this.addReview(1, 'Anonymous account', pick(D.REVIEWS[1]).replace('{room}', 'the hotel'), '');
      rec.disaster = { name: def.name, day: d.day, len: def.days.length, loss: rec.disasterLoss, end: '' };
      if (d.day < def.days.length) return;
      const tier = d.sev <= 1 ? 'good' : d.sev <= 3 ? 'mid' : 'bad';
      if (tier === 'good') { S.comfort = clamp(S.comfort + 3, 0, 100); this.addMod('Crisis hero', 1.06, 7); }
      else if (tier === 'bad') {
        this.addMod(def.scar.name, def.scar.mult, def.scar.days);
        if (def.scarCond) this.ownedRooms().forEach((r) => { S.rooms[r.id].cond = clamp(S.rooms[r.id].cond - def.scarCond, 0, 100); });
        for (let i = 0; i < 2; i++) this.addReview(1, 'Disgruntled guest', pick(D.REVIEWS[1]).replace('{room}', 'the hotel'), '');
      }
      rec.disaster.end = def.ends[tier]; rec.disaster.tier = tier;
      S.log.push(def.name + ' is over. ' + def.ends[tier]);
      S.disaster = null; S.disasterEnd = S.day;
    }

    applyEvent(card, optIdx, byGM) {
      const S = this.S, def = D.EVENTS.find((x) => x.id === card.event), o = def.opts[optIdx];
      const cash = Math.round(o.cash * this.costMult());
      S.cash += cash;
      S.comfort = clamp(S.comfort + o.comfort, 0, 100); S.spook = clamp(S.spook + o.spook, 0, 100);
      if (o.cond) this.ownedRooms().forEach((r) => { S.rooms[r.id].cond = clamp(S.rooms[r.id].cond + o.cond, 0, 100); });
      const note = def.title + ': ' + o.t + (cash ? ' (' + (cash > 0 ? '+' : '-') + '$' + Math.abs(cash) + ')' : '');
      S.log.push((byGM ? 'GM handled ' : '') + note);
      return { note, ok: cash >= 0 && o.comfort >= 0 };
    }

    applyComplaint(card, optIdx, byStaff, satMult) {
      const S = this.S, def = D.CMAP[card.def], o = def.opts[optIdx];
      const room = S.rooms[card.room], g = room && room.guest;
      const cash = o.cash < 0 ? Math.round(o.cash * this.costMult() / (byStaff ? 2 : 1)) : o.cash;
      S.cash += cash;
      if (g) { g.sat = clamp(g.sat + (o.sat > 0 ? o.sat * (satMult || 1) : o.sat), 0, 100); g.cx = (g.cx || 0) + 1; g.cs = (g.cs || 0) + o.sat; }
      S.comfort = clamp(S.comfort + o.comfort * (S.upgrades.lobby && o.comfort > 0 ? 1.5 : 1), 0, 100);
      S.spook = clamp(S.spook + o.spook * (S.upgrades.spook && o.spook > 0 ? 1.5 : 1), 0, 100);
      S.stats.complaints++;
      const who = g ? D.GMAP[g.type].name : 'A guest';
      S.log.push((byStaff ? 'Staff handled' : 'You handled') + ': ' + who + ' (' + D.RMAP[card.room].name + '): ' + o.t + (cash ? ' (' + (cash > 0 ? '+' : '-') + '$' + Math.abs(cash) + ')' : ''));
    }

    storyOpen(s) {
      if (s.season) { const c = this.season(); return !!c && c.id === s.season; }
      if (s.stage7) return this.S.stage >= 7;
      if (s.prop) return this.prop(s.prop).owned;
      if (s.acq) return this.S.acq.length >= s.acq;
      return this.S.day >= s.unlockDay;
    }

    currentCard() { return this.S.phase === 'shift' ? this.S.cards[this.S.cardIdx] || null : null; }
    shiftDone() { return this.S.phase === 'shift' && this.S.cardIdx >= this.S.cards.length; }

    resolveCard(optIdx) {
      const S = this.S, card = this.currentCard();
      if (!card) return null;
      const result = { kind: card.kind };
      if (card.kind === 'complaint') {
        this.applyComplaint(card, optIdx, false);
      } else if (card.kind === 'event') {
        Object.assign(result, this.applyEvent(card, optIdx, false));
      } else if (card.kind === 'branch') {
        Object.assign(result, this.applyBranchEvent(card, optIdx, false));
      } else if (card.kind === 'disaster') {
        Object.assign(result, this.applyDisaster(card, optIdx, false));
      } else if (card.kind === 'vip') {
        const v = D.VMAP[card.vip], opt = v.steps[card.step].opts[optIdx], good = (card.good || 0) + (opt.ok ? 1 : 0);
        result.note = opt.note; result.ok = opt.ok;
        S.log.push(v.guest + ': ' + opt.note);
        if (card.step + 1 < v.steps.length) S.cards.splice(S.cardIdx + 1, 0, { kind: 'vip', vip: card.vip, step: card.step + 1, good });
        else Object.assign(result, this.finishVip(v, good));
      } else {
        const story = D.STORIES.find((s) => s.id === card.story), prog = S.stories[card.story];
        const opt = story.steps[prog.step].opts[optIdx];
        if (opt.ok) prog.good++;
        result.note = opt.note; result.ok = opt.ok;
        S.log.push(story.guest + ': ' + opt.note);
        prog.step++;
        if (prog.step >= story.steps.length) {
          prog.done = true; S.stats.stories++;
          const n = story.steps.length, tier = prog.good === n ? 'good' : prog.good >= n - 1 ? 'ok' : 'bad';
          result.ending = story.endings[tier]; result.tier = tier;
          if (tier !== 'bad' && !story.season) this.shareGuest(story.id);
          if (tier === 'good') { if (story.season) this.addMod(story.guest, 1.12, 14); else S.perks[story.perk] = true; result.perk = story.perkText; S.comfort = clamp(S.comfort + 3, 0, 100); S.spook = clamp(S.spook + 3, 0, 100); }
          else if (tier === 'ok') S.cash += 60;
          else { S.cash -= 40; S.comfort = clamp(S.comfort - 3, 0, 100); }
          S.log.push(result.ending);
        }
      }
      S.cardIdx++;
      this.save();
      return result;
    }

    // ---- night ----
    closeDesk() {
      const S = this.S;
      if (S.phase !== 'shift' || !this.shiftDone()) return false;
      const rec = { day: S.day, revenue: 0, upkeep: this.upkeep(), wages: this.wages(), interest: 0, tax: 0, checkouts: [], quit: [], referrals: [], reviews: [], disasterLoss: 0 };
      this.occupied().forEach((r) => { rec.revenue += this.roomIncome(r.id, S.rooms[r.id].guest); });
      const acct = S.staff.accountant ? 1 - 0.2 * this.mor('accountant') : 1;
      rec.interest = Math.round(S.debt * K.INTEREST * (S.perks.auditor ? 0.9 : 1) * acct);
      rec.tax = S.stage >= 2 ? Math.round(rec.revenue * K.TAX * acct) : 0;
      rec.disasterLoss = this.disasterLoss(rec.revenue);
      rec.expenses = rec.upkeep + rec.wages + rec.interest + rec.tax + rec.disasterLoss;
      this.disasterNight(rec);

      this.occupied().forEach((r) => {
        const room = S.rooms[r.id], g = room.guest, gt = D.GMAP[g.type];
        room.cond = Math.max(0, room.cond - Math.round(ri(5, 9) * (S.staff.maint ? 1 - (1 - K.MAINT_DECAY) * this.mor('maint') : 1)));
        g.sat = clamp(g.sat + (room.cond >= 70 ? 2 : room.cond < 40 ? -6 : -1), 0, 100);
        g.left--;
        if (g.left <= 0) {
          const d = clamp((g.sat - 55) / 25, -2, 2);
          S.comfort = clamp(S.comfort + d * (S.upgrades.lobby && d > 0 ? 1.5 : 1), 0, 100);
          const sp = (gt.want === 'spooky' ? d * 1.2 : 0) + (D.RMAP[r.id].type === 'haunted' ? 0.5 : 0) + (d > 0 && gt.spookBonus ? gt.spookBonus : 0);
          S.spook = clamp(S.spook + sp * (S.upgrades.spook && sp > 0 ? 1.5 : 1), 0, 100);
          rec.checkouts.push({ name: gt.name, room: D.RMAP[r.id].name, sat: g.sat });
          rec.reviews.push(this.makeReview(g, gt, r.id));
          if (gt.home && g.sat >= K.REFERRAL_SAT) {
            const homes = gt.home === 'acq' ? S.acq.filter((a) => this.prop(a.id).owned) : [this.propDef(gt.home)];
            const hd = pick(homes), hp = this.prop(hd.id);
            hp.quality = clamp(hp.quality + K.REFERRAL_Q, 0, 100);
            rec.referrals.push(gt.name + ' recommends ' + hd.name + ' (quality +' + K.REFERRAL_Q + ')');
          }
          if (S.upgrades.gift) rec.revenue += K.GIFT_PER_GUEST;
          room.guest = null;
        }
      });
      if (S.staff.housekeeper) this.ownedRooms().forEach((r) => { if (S.rooms[r.id].cond < 70) S.rooms[r.id].cond = Math.min(100, S.rooms[r.id].cond + 25); });

      if (S.staff.maint) this.ownedRooms().forEach((r) => { if (S.rooms[r.id].cond < 60) S.rooms[r.id].cond = 100; });
      rec.profit = rec.revenue - rec.expenses;
      // reputation above 50 slowly fades unless you keep earning it
      S.comfort = clamp(S.comfort - Math.max(0, S.comfort - 50) * K.REP_DRIFT, 0, 100);
      S.spook = clamp(S.spook - Math.max(0, S.spook - 50) * K.REP_DRIFT, 0, 100);
      this.runBranches(rec);
      this.moraleTick(rec);
      this.modsTick();
      S.cash += rec.profit + rec.branchProfit - rec.regional;
      S.stats.revenue += rec.revenue; S.stats.expenses += rec.expenses;
      if (S.cash < 0) {
        const loan = Math.ceil((-S.cash + 150) / 50) * 50;
        S.cash += loan; S.debt += loan; S.stats.bailouts++; rec.bailout = loan;
        S.log.push('Cash ran dry. The bank, grudgingly, lends you $' + loan + '.');
      }
      if (S.stage < 2 && S.stats.revenue >= K.STAGE2_REVENUE) { S.stage = 2; rec.stageUp = true; S.log.push('You can afford staff now. Check the Staff tab.'); }
      if (S.stage < 3 && S.stage >= 2 && S.stats.revenue >= K.STAGE3_REVENUE && this.ownedRooms().length >= K.STAGE3_ROOMS) {
        S.stage = 3; rec.stageUp = 3; S.log.push('Stage 3: departments and a General Manager are available in the Staff tab.');
      }
      if (S.stage === 3 && S.stats.revenue >= K.STAGE4_REVENUE && S.staff.gm && S.gmLvl >= 2) {
        S.stage = 4; rec.stageUp = 4; S.log.push('Stage 4: you can buy more properties. See the Properties tab.');
      }
      if (S.stage === 4 && this.ownedProps().length >= 2 && S.group.revenue >= K.STAGE5_GROUP_REVENUE) {
        S.stage = 5; rec.stageUp = 5; this.refreshOffers(); S.log.push('Stage 5: group marketing and hotel acquisitions are open. See the Group tab.');
      }
      if (S.stage === 5 && S.brand >= D.BRAND.cost.length && S.group.revenue >= K.STAGE6_GROUP_REVENUE) {
        S.stage = 6; rec.stageUp = 6; S.log.push('Stage 6: landmarks and Legacy are open. See the Group tab.');
      }
      if (S.stage === 6 && D.LANDMARKS.every((l) => S.landmarks[l.id]) && S.group.revenue >= K.STAGE7_GROUP_REVENUE) {
        S.stage = 7; rec.stageUp = 7; S.log.push('Stage 7: the Afterlife Empire. Franchises abroad and the World Brand are open in the Group tab.');
      }
      if (S.day % 7 === 0) {
        const wk = S.ledger.slice(-6).concat([{ revenue: rec.revenue, expenses: rec.expenses, profit: rec.profit }]);
        rec.week = { revenue: wk.reduce((a, l) => a + l.revenue, 0), expenses: wk.reduce((a, l) => a + l.expenses, 0), profit: wk.reduce((a, l) => a + l.profit, 0), best: Math.max(...wk.map((l) => l.profit)), worst: Math.min(...wk.map((l) => l.profit)) };
      }
      if (S.day === K.REVIEW_DAY && !S.review) {
        const profit = S.stats.revenue - S.stats.expenses;
        const score = profit / 20 + S.comfort + S.spook + S.stats.stories * 15 - S.debt / 20;
        S.review = { score: Math.round(score), grade: score >= 380 ? 'A' : score >= 250 ? 'B' : score >= 130 ? 'C' : 'D' };
        rec.review = S.review;
      }
      if (S.chal && S.day >= S.chal.days && !S.chal.done) {
        S.chal.done = true; S.chal.score = this.challengeScore(); S.chal.ok = S.chal.score >= this.chalDef.goal;
        rec.challenge = { id: S.chal.id, score: S.chal.score, ok: S.chal.ok, days: S.day, code: Sim.code(S.chal.id, S.chal.score, S.day) };
        Sim.recordResult(this.storage, S.chal.id, S.chal.score, S.day, S.chal.ok);
      }
      S.ledger.push({ day: rec.day, revenue: rec.revenue, expenses: rec.expenses, profit: rec.profit, cash: S.cash });
      if (S.ledger.length > 60) S.ledger.shift();
      S.last = rec; S.phase = 'summary';
      this.save();
      return true;
    }

    nextDay() {
      const S = this.S;
      if (S.phase !== 'summary' || (S.chal && S.chal.done)) return false;
      S.day++; S.phase = 'plan'; S.cards = []; S.cardIdx = 0;
      if (S.stage >= 5 && S.day - S.offerDay >= K.OFFER_DAYS) this.refreshOffers();
      this.genArrivals();
      this.save();
      return true;
    }

    // First-play tutorial: one tip at a time. The UI shows tutorialStep() and the engine advances it when the player does the thing.
    tutorialSkip() { this.S.tutorial.done = true; this.save(); }
    tutorialReplay() { this.S.tutorial = { step: 0, done: false, g0: this.S.stats.guests, d0: this.S.day }; this.save(); }
    tutorialNext() { this.S.tutorial.step++; this.save(); }
    // Move the tutorial forward when the game state shows the current tip's task is done. Returns the active step, or -1 when finished.
    tutorialSync() {
      const S = this.S, T = S.tutorial;
      if (T.done) return -1;
      const L = D.TUTORIAL.length;
      let moved = true;
      while (moved && T.step < L) {
        moved = false;
        const c = D.TUTORIAL[T.step].until;
        if ((c === 'placed' && (S.stats.guests > T.g0 || S.phase !== 'plan')) || (c === 'shift' && S.phase !== 'plan') ||
            (c === 'summary' && S.phase === 'summary') || (c === 'day2' && S.day > T.d0 && S.phase === 'plan')) { T.step++; moved = true; }
      }
      if (T.step >= L) { T.done = true; this.save(); return -1; }
      return T.step;
    }

    // ---- challenge mode ----
    challengeScore() {
      const S = this.S;
      return Math.round(S.cash - S.debt + 3 * (S.comfort + S.spook) + 40 * this.ratingAvg() + 50 * this.storiesSolved());
    }
    devCash(n) { this.S.cash += n; this.save(); }

    static records(storage) { try { return JSON.parse((storage && storage.getItem(K.CHAL_BEST_KEY)) || '{}') || {}; } catch (e) { return {}; } }
    static recordResult(storage, id, score, days, ok) {
      if (!storage) return;
      const r = Sim.records(storage), cur = r[id];
      if (!cur || score > cur.score) r[id] = { score, days, ok: !!ok || !!(cur && cur.ok) }; else if (ok) cur.ok = true;
      try { storage.setItem(K.CHAL_BEST_KEY, JSON.stringify(r)); } catch (e) { /* blocked */ }
    }
    static completed(storage) { const r = Sim.records(storage); return Object.keys(r).filter((k) => r[k].ok).length; }
    static code(id, score, days) { return 'HLC1:' + id + ':' + score + ':' + days; }
    static parseCode(str) {
      const m = /^HLC1:([a-z0-9]+):(-?\d+):(\d+)$/i.exec(String(str || '').trim());
      return m && D.CHMAP[m[1]] ? { id: m[1], score: Number(m[2]), days: Number(m[3]) } : null;
    }
  }

  // Every rule method runs with this Sim's own random stream (Math.random, or the seeded one in a challenge).
  Object.getOwnPropertyNames(Sim.prototype).forEach((n) => {
    const f = Sim.prototype[n];
    if (n === 'constructor' || typeof f !== 'function') return;
    Sim.prototype[n] = function (...a) { const prev = RNG; RNG = this.rngFn; try { return f.apply(this, a); } finally { RNG = prev; } };
  });

  const api = { Sim, newState };
  root.SimEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
