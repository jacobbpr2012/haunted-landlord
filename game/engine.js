// Game rules. Pure logic: no DOM access, so it runs in the browser, in Electron and in Node (tools/sim.js).
(function (root) {
  'use strict';
  const D = root.HLData || require('./data.js');
  if (!D.LODGERS) require('./codex.js');
  // Cross-mode Codex bridge (optional: absent in Node tools that do not need it).
  const SH = root.HLShared || (typeof require === 'function' ? (() => { try { return require('./shared.js'); } catch (e) { return null; } })() : null);
  const K = D.CONST;
  const G = K.GROWTH;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function genHouseName() {
    const P = D.HOUSE_PARTS;
    const a = pick(P.adj), n = pick(P.noun), o = pick(P.owner);
    return pick([`${a} ${n} of ${o}`, `${o}'s Bed and Breakfast`, `The ${a} ${n}`, `${o}'s ${a} ${n}`]);
  }

  function newState(now) {
    return {
      v: 1, created: now, lastSeen: now, lastClick: now,
      rent: 0, total: 0, run: 0, clicks: 0,
      ghosts: {}, rooms: { parlor: true }, upgrades: {}, buffs: [],
      essence: 0, essenceTotal: 0, eshop: {}, exorcisms: 0, lastExorcism: null,
      ach: {}, seen: {}, cellar: false, mabel: false,
      houseName: genHouseName(),
      daily: { last: '', count: 0, freezes: 1 },
      comm: { cycle: 0, contrib: 0, claimed: false },
      settings: { sound: true, calm: false, notify: false },
      stats: { eventsDone: 0, ghostsBought: 0, firstClick: false, timePlayed: 0, longestAway: 0, customized: 0, visits: 0, raceWins: 0 },
      codex: { lodgers: {}, seances: 0 },
      house: { theme: 'classic', door: 'wood', decor: [], pet: 'cat', seasons: {} },
      week: { cycle: 0, earned: 0, ref: D.RACE_MIN_REF, prev: 0, pending: null },
      visits: {},
      tutorial: { step: 0, done: false },
    };
  }

  function dayKey(now) {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function dayNum(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 864e5);
  }

  // Random incidents. choices[].do(game) returns the message shown afterwards.
  const EVENTS = [
    { id: 'party', title: 'Basement Party', need: (s) => s.ghosts.dan > 0,
      text: 'Disco Dan is throwing a party in the basement. Nobody invited him to throw it.',
      choices: [
        { label: 'Join in (costs 15s of rent)', do: (g) => { g.lose(g.income(15)); g.addBuff('Party Time', 3, 'all', 20); return 'Rent x3 for 20 seconds. Your knees will never forgive you.'; } },
        { label: 'Call the ghost police', do: (g) => { const x = g.income(30); g.gain(x); return `The fines come to ${g.fmt(x)}. Dan is sulking.`; } },
      ] },
    { id: 'noise', title: 'Noise Complaint', need: (s) => s.ghosts.dan > 0,
      text: 'Disco Dan has been rehearsing at 3 AM. Again.',
      choices: [
        { label: 'Issue a fine', do: (g) => { const x = g.income(40); g.gain(x); g.addBuff('Sulking Tenants', 0.9, 'all', 60); return `Collected ${g.fmt(x)}, but the tenants are sulking (-10% for a minute).`; } },
        { label: 'Let it slide', do: (g) => { g.addBuff('Happy Tenants', 1.2, 'all', 60); return 'Happy tenants: rent +20% for a minute.'; } },
      ] },
    { id: 'dispute', title: 'Tenant Dispute', need: (s) => s.ghosts.dan > 0 && s.ghosts.beatrix > 0,
      text: 'Lady Beatrix and Disco Dan are arguing about the thermostat. Neither of them can feel temperature.',
      choices: [
        { label: 'Side with Beatrix', do: (g) => { g.addBuff('Beatrix Vindicated', 3, 'beatrix', 60); return 'Beatrix pays triple for a minute. She did not say thank you.'; } },
        { label: 'Side with Dan', do: (g) => { g.addBuff('Dan Vindicated', 3, 'dan', 60); return 'Dan pays triple for a minute. He is already dancing.'; } },
      ] },
    { id: 'tantrum', title: 'Poltergeist Tantrum', need: (s) => s.ghosts.pete > 0,
      text: 'Poltergeist Pete is throwing a tantrum. There goes the good china.',
      choices: [
        { label: 'Bribe him (costs 30s of rent)', do: (g) => { g.lose(g.income(30)); g.addBuff('Pete Appeased', 4, 'pete', 45); return 'Pete pays 4x for 45 seconds. Bribery works.'; } },
        { label: 'Wait it out', do: (g) => { const x = g.lose(g.S.rent * 0.05); return `The damage comes to ${g.fmt(x)}. You tell yourself it builds character.`; } },
      ] },
    { id: 'roof', title: 'Leaky Roof', need: () => true,
      text: 'The roof is leaking. Ectoplasm, mostly.',
      choices: [
        { label: 'Patch it (costs 25s of rent)', do: (g) => { g.lose(g.income(25)); g.addBuff('Fresh Patch', 1.15, 'all', 120); return 'Rent +15% for two minutes. The patch is mostly tape.'; } },
        { label: 'Put out a bucket', do: (g) => { const x = g.income(10); g.gain(x); return `A ghost tipped you ${g.fmt(x)} for the bucket. Nobody asked why.`; } },
      ] },
    { id: 'audit', title: 'Books Audit', need: (s) => s.ghosts.accountant > 0,
      text: 'The Accountant found a missing zero in the books.',
      choices: [
        { label: 'Check the math', do: (g) => { const x = g.income(60); g.gain(x); return `It was real. +${g.fmt(x)}.`; } },
        { label: 'Do not look', do: (g) => { g.addBuff('Plausible Deniability', 1.1, 'all', 120); return 'Ignorance is bliss. Rent +10% for two minutes.'; } },
      ] },
    { id: 'karen', title: 'Speak to the Manager', need: (s) => s.ghosts.karen > 0,
      text: 'Karen the Unliving would like to speak to the manager. You are the manager. She knows.',
      choices: [
        { label: 'Offer a coupon (costs 20s of rent)', do: (g) => { g.lose(g.income(20)); g.addBuff('Coupon Applied', 3, 'karen', 60); return 'Karen pays triple for a minute. She still wants the manager.'; } },
        { label: 'Give her your own number', do: (g) => { const x = g.income(45); g.gain(x); g.addBuff('One-Star Review', 0.9, 'all', 45); return `She tipped ${g.fmt(x)} to be rid of you, then left a one-star review (-10% for 45s).`; } },
      ] },
    { id: 'hoa', title: 'HOA Violation Notice', need: (s) => s.ghosts.hoa > 0,
      text: 'The HOA Spirit has noticed a "visible haunting" on the front lawn. Violation level: Maximum.',
      choices: [
        { label: 'Pay the fine (costs 30s of rent)', do: (g) => { g.lose(g.income(30)); g.addBuff('Neighborhood Pride', 1.2, 'all', 90); return 'The lawn is compliant. Rent +20% for 90 seconds.'; } },
        { label: 'Argue the bylaws', do: (g) => { if (Math.random() < 0.5) { const x = g.income(70); g.gain(x); return `You found a loophole. The HOA pays you ${g.fmt(x)} in damages.`; } const x = g.lose(g.income(40)); return `You lost the argument. Fees: -${g.fmt(x)}.`; } },
      ] },
    { id: 'chad', title: 'Chad Has a Tip', need: (s) => s.ghosts.chad > 0,
      text: 'Chad leans in: "Bro. Bro. Put your rent in my coin. Trust me."',
      choices: [
        { label: 'Go all in (costs 30s of rent)', do: (g) => { g.lose(g.income(30)); if (Math.random() < 0.5) { const x = g.income(140); g.gain(x); return `It pumped! +${g.fmt(x)}. Chad will not shut up about it.`; } return 'It rugged. Chad says it is "a learning experience".'; } },
        { label: 'Politely decline', do: (g) => { g.addBuff('Peace and Quiet', 1.08, 'all', 60); return 'Chad sulks. The house is calm. Rent +8% for a minute.'; } },
      ] },
    { id: 'dolores', title: 'Dolores Checks the Books', need: (s) => s.ghosts.dolores > 0,
      text: 'Dead Landlord Dolores wants to "just glance at the ledger". She has her glasses on. This is serious.',
      choices: [
        { label: 'Show her the books (costs 40s of rent)', do: (g) => { g.lose(g.income(40)); g.addBuff('Dolores Approves', 1.3, 'all', 90); return 'She nods slowly. Rent +30% for 90 seconds. High praise.'; } },
        { label: 'Hide the ledger', do: (g) => { if (Math.random() < 0.5) { g.addBuff('Hidden Reserves', 1.25, 'all', 90); return 'Nobody noticed. Rent +25% for 90 seconds.'; } const x = g.lose(g.income(60)); return `She noticed. Her cut: -${g.fmt(x)}.`; } },
      ] },
    { id: 'rival', title: 'Rival Landlord Poaching', need: (s, g) => g.totalGhosts() >= 8,
      text: 'A rival landlord is leaving flyers about "better ectoplasm" on your tenants\' doors.',
      choices: [
        { label: 'Counter-offer (costs 25s of rent)', do: (g) => { g.lose(g.income(25)); g.addBuff('Loyal Tenants', 1.2, 'all', 90); return 'Tenants stay. Rent +20% for 90 seconds.'; } },
        { label: 'Poach theirs back', do: (g) => { const x = g.income(40); g.gain(x); return `A rival tenant pays ${g.fmt(x)} up front. The rival is furious. Good.`; } },
      ] },
    { id: 'season', title: 'Seasonal Visitors', need: (s, g) => !!g.curSeason,
      title_: (g) => g.curSeason.visitTitle, text_: (g) => g.curSeason.visitText, text: '',
      choices: [
        { label: '', labelFn: (g) => g.curSeason.yes + ' (costs 20s of rent)', do: (g) => { g.lose(g.income(20)); g.addBuff('Festive Spirit', 1.25, 'all', 90); return 'Everyone is delighted. Rent +25% for 90 seconds.'; } },
        { label: '', labelFn: (g) => g.curSeason.no, do: (g) => { const x = g.income(25); g.gain(x); return `Somebody left ${g.fmt(x)} on the porch as a bribe. Nobody asked.`; } },
      ] },
    { id: 'hunter', title: 'Ghost Hunter!', need: (s, g) => g.totalGhosts() >= 3, tap: { need: 6, secs: 7 },
      text: 'A GHOST HUNTER is at the door! Tap DEFEND fast to protect your tenants.',
      onWin: (g) => { const x = g.income(90); g.gain(x); return `Hunter repelled! Tenants chip in ${g.fmt(x)}.`; },
      onLose: (g) => { g.addBuff('Shaken Tenants', 0.8, 'all', 30); return 'The hunter spooked everyone. Rent -20% for 30 seconds.'; },
      choices: [] },
  ];

  class Game {
    constructor(storage) {
      this.storage = storage || null;
      this.S = newState(Date.now());
      this.C = {};
      this.onEmit = null;
      this.ev = null;
      this.evTimer = 60;
      this.peteTimer = 15;
      this.autoTimer = 0;
      this.slowTimer = 0;
      this.chadTimer = 20;
      this.chadMult = 1;
      this.curSeason = null;
      this.seasonOverride = null;
      this.recalc(Date.now());
    }

    emit(type, data) { if (this.onEmit) this.onEmit(type, data); }
    fmt(n) { return root.HLFormat ? root.HLFormat(n) : String(Math.floor(n)); }
    totalGhosts() { let n = 0; for (const k in this.S.ghosts) n += this.S.ghosts[k]; return n; }

    // ---------- derived numbers ----------
    recalc(now) {
      const S = this.S;
      let click = 1, all = 1, offlineCap = K.BASE_OFFLINE_CAP, offline = K.OFFLINE_RATE, costMult = 1;
      const gm = {};
      for (const id in S.upgrades) {
        const fx = D.UMAP[id] && D.UMAP[id].fx;
        if (!fx) continue;
        if (fx.click) click *= fx.click;
        if (fx.all) all *= fx.all;
        if (fx.offlineCap) offlineCap += fx.offlineCap;
        if (fx.offline) offline += fx.offline;
        if (fx.g) for (const gid in fx.g) gm[gid] = (gm[gid] || 1) * fx.g[gid];
      }
      if (S.eshop.spookypaint) click *= 2;
      if (S.eshop.eternal) offlineCap += 4 * 3600;
      if (S.eshop.interest) all *= 1.25;
      if (S.eshop.haggle) costMult = 0.9;
      for (const b of S.buffs) {
        if (b.until <= now) continue;
        if (b.target === 'all') all *= b.mult; else gm[b.target] = (gm[b.target] || 1) * b.mult;
      }
      let achMult = 1;
      for (const a of D.ACHIEVEMENTS) if (S.ach[a.id]) achMult += a.secret ? 0.02 : 0.01;
      const extraRooms = D.ROOMS.filter((r) => r.id !== 'parlor' && S.rooms[r.id]).length;
      const roomMult = 1 + 0.1 * extraRooms + (S.cellar ? 0.25 : 0);
      // Linear up to 100 Essence, then square-root growth so late tiers cannot snowball a run into the quintillions.
      const E = S.essenceTotal;
      const essMult = E <= 100 ? 1 + K.ESS_MULT * E : 1 + K.ESS_MULT * 100 + Math.sqrt(E - 100);
      const dan = S.ghosts.dan || 0;
      const danAura = 1 + 0.02 * dan;
      const hoa = S.ghosts.hoa || 0, dol = S.ghosts.dolores || 0, ll = S.ghosts.landlord || 0;
      let lodgerSum = 0;
      for (const id in S.codex.lodgers) if (D.LMAP[id]) lodgerSum += D.LODGER_BONUS[D.LMAP[id].rarity];
      let setMult = 1;
      for (const f of D.FAMILIES) if (this.familyDone(f.id)) setMult *= 1 + f.set;
      const codexMult = (1 + lodgerSum) * setMult * (1 + (this.simBonus || 0));
      const seasonMult = this.curSeason ? this.curSeason.mult : 1;
      const global = all * achMult * roomMult * essMult * codexMult * seasonMult * Math.pow(1.05, ll);

      const ghostRps = {};
      let rps = 0;
      for (const d of D.GHOSTS) {
        const n = S.ghosts[d.id] || 0;
        if (!n) { ghostRps[d.id] = 0; continue; }
        let v = d.base * n * (gm[d.id] || 1);
        if (d.id === 'beatrix' && dan > 0) v *= 0.85;
        if (d.id !== 'dan') v *= danAura;
        if (hoa && d.id !== 'hoa') v *= 1 + 0.03 * hoa;
        if (hoa && d.id === 'dan') v *= 0.9;
        if (dol && d.id !== 'dolores') v *= 0.9;
        if (d.id === 'chad') v *= this.chadMult;
        v *= global;
        ghostRps[d.id] = v;
        rps += v;
      }
      const acc = S.ghosts.accountant || 0;
      this.C = {
        rps, ghostRps, global, costMult, offlineCap,
        offlineRate: Math.min(1.5, offline + 0.1 * acc),
        clickPower: click * global + rps * K.CLICK_RPS_SHARE,
        essMult, achMult, roomMult, codexMult, seasonMult,
      };
    }

    income(secs) { return this.C.rps * secs; }
    gain(x) { const S = this.S; x = Math.max(0, x); S.rent += x; S.total += x; S.run += x; S.week.earned += x; return x; }
    lose(x) { const S = this.S; x = Math.min(Math.max(0, x), S.rent); S.rent -= x; return x; }
    addBuff(label, mult, target, secs) {
      const now = Date.now();
      this.S.buffs.push({ label, mult, target, until: now + secs * 1000 });
      this.recalc(now);
    }

    // ---------- purchases ----------
    available(id) {
      const d = D.GMAP[id], S = this.S;
      return !!d && d.cost != null && !!S.rooms[d.room];
    }
    growth(id) { return D.GMAP[id].growth || G; }
    unitCost(id) {
      const d = D.GMAP[id];
      return Math.ceil(d.cost * this.C.costMult * Math.pow(this.growth(id), this.S.ghosts[id] || 0));
    }
    costN(id, n) {
      const d = D.GMAP[id], k = this.S.ghosts[id] || 0, r = this.growth(id);
      return Math.ceil(d.cost * this.C.costMult * Math.pow(r, k) * (Math.pow(r, n) - 1) / (r - 1));
    }
    maxAffordable(id) {
      const first = this.unitCost(id), r = this.growth(id);
      if (this.S.rent < first) return 0;
      let n = Math.floor(Math.log(1 + this.S.rent * (r - 1) / first) / Math.log(r));
      n = Math.min(n, 1000);
      while (n > 0 && this.costN(id, n) > this.S.rent) n--;
      return Math.max(n, 1);
    }
    buyGhost(id, n) {
      if (!this.available(id)) return 0;
      if (n === 'max') n = this.maxAffordable(id);
      if (n <= 0) return 0;
      const c = this.costN(id, n), S = this.S;
      if (c > S.rent) return 0;
      S.rent -= c;
      S.ghosts[id] = (S.ghosts[id] || 0) + n;
      S.seen[id] = true;
      S.stats.ghostsBought += n;
      this.recalc(Date.now());
      this.emit('buy', { kind: 'ghost', id, n, cost: c });
      return n;
    }
    roomCost(id) { return D.RMAP[id].cost; }
    buyRoom(id) {
      const S = this.S, r = D.RMAP[id];
      if (!r || S.rooms[id] || S.rent < r.cost) return false;
      S.rent -= r.cost;
      S.rooms[id] = true;
      this.recalc(Date.now());
      this.emit('buy', { kind: 'room', id, cost: r.cost });
      return true;
    }
    upgradeVisible(u) {
      const S = this.S;
      return !S.upgrades[u.id] && (!u.req || (S.ghosts[u.req.ghost] || 0) >= u.req.n);
    }
    buyUpgrade(id) {
      const S = this.S, u = D.UMAP[id];
      if (!u || S.upgrades[id] || !this.upgradeVisible(u) || S.rent < u.cost) return false;
      S.rent -= u.cost;
      S.upgrades[id] = true;
      this.recalc(Date.now());
      this.emit('buy', { kind: 'upgrade', id, cost: u.cost });
      return true;
    }
    buyEssence(id) {
      const S = this.S, e = D.ESHOP.find((x) => x.id === id);
      if (!e || S.eshop[id] || S.essence < e.cost) return false;
      S.essence -= e.cost;
      S.eshop[id] = true;
      this.recalc(Date.now());
      this.emit('buy', { kind: 'essence', id, cost: e.cost });
      return true;
    }
    autoBuy() {
      let best = null, bestCost = Infinity;
      for (const d of D.GHOSTS) {
        if (!this.available(d.id)) continue;
        const c = this.unitCost(d.id);
        if (c <= this.S.rent && c < bestCost) { best = d.id; bestCost = c; }
      }
      if (best) this.buyGhost(best, 1);
    }

    // ---------- clicking ----------
    click(now) {
      const S = this.S;
      let first = false;
      if (!S.stats.firstClick) {
        S.stats.firstClick = true;
        first = true;
        if (!S.ghosts.gary) { S.ghosts.gary = 1; S.seen.gary = true; this.recalc(now); }
      }
      const x = this.C.clickPower;
      this.gain(x);
      S.clicks++;
      S.lastClick = now;
      if (first) this.emit('gary', {});
      return x;
    }

    // ---------- time ----------
    tick(dt, now) {
      const S = this.S;
      const x = this.C.rps * dt;
      if (x > 0) { S.rent += x; S.total += x; S.run += x; S.comm.contrib += x; S.week.earned += x; }
      S.stats.timePlayed += dt;
      S.lastSeen = now;

      if (S.buffs.length && S.buffs.some((b) => b.until <= now)) {
        S.buffs = S.buffs.filter((b) => b.until > now);
        this.recalc(now);
      }
      if (S.eshop.autobuy) {
        this.autoTimer += dt;
        if (this.autoTimer >= 2) { this.autoTimer = 0; this.autoBuy(); }
      }
      if (S.ghosts.pete > 0) {
        this.peteTimer -= dt;
        if (this.peteTimer <= 0) { this.peteTimer = 15; this.peteChaos(); }
      }
      if (this.ev) {
        if (now > this.ev.until) this.expireEvent();
      } else {
        this.evTimer -= dt;
        if (this.evTimer <= 0) this.spawnEvent(now);
      }
      if (S.ghosts.chad > 0) {
        this.chadTimer -= dt;
        if (this.chadTimer <= 0) { this.chadTimer = 20; this.chadSwing(); }
      }
      this.slowTimer += dt;
      if (this.slowTimer >= 1) { this.slowTimer = 0; this.checkSeason(now); this.weekCheck(now); this.checkAchievements(now); }
    }

    chadSwing() {
      const prev = this.chadMult;
      this.chadMult = pick(D.CHAD_MULTS.filter((m) => m !== prev));
      this.recalc(Date.now());
      this.emit('toast', pick(this.chadMult > prev ? D.CHAD_LINES.up : D.CHAD_LINES.down) + ` (rent x${this.chadMult})`);
    }

    peteChaos() {
      const pete = this.C.ghostRps.pete;
      if (Math.random() < 0.6) {
        const x = this.gain(pete * 30);
        this.emit('toast', `Poltergeist Pete rattled the pipes. Coins fell out: +${this.fmt(x)}`);
      } else {
        const x = this.lose(pete * 20);
        this.emit('toast', `Poltergeist Pete broke a lamp. Repairs: -${this.fmt(x)}`);
      }
    }

    // ---------- offline ----------
    applyOffline(now) {
      const S = this.S;
      const away = (now - S.lastSeen) / 1000;
      if (away < 60) return null;
      S.buffs = [];
      this.recalc(now);
      const sec = Math.min(away, this.C.offlineCap);
      const x = this.gain(this.C.rps * sec * this.C.offlineRate);
      S.comm.contrib += x;
      S.lastSeen = now;
      S.stats.longestAway = Math.max(S.stats.longestAway, away);
      this.checkAchievements(now);
      return { away, sec, gain: x, capped: away > this.C.offlineCap, anecdote: pick(D.ANECDOTES) };
    }

    // ---------- events ----------
    spawnEvent(now) {
      const pool = EVENTS.filter((e) => e.need(this.S, this) && (!this.lastEv || e.id !== this.lastEv));
      if (!pool.length) { this.evTimer = 30; return; }
      this.forceEvent(pick(pool).id, now);
    }
    forceEvent(id, now) {
      const def = EVENTS.find((e) => e.id === id);
      if (!def) return;
      this.lastEv = def.id;
      this.ev = { id, def, until: now + (def.tap ? def.tap.secs : 45) * 1000, taps: 0,
                  title: def.title_ ? def.title_(this) : def.title, text: def.text_ ? def.text_(this) : def.text,
                  labels: def.choices.map((c) => (c.labelFn ? c.labelFn(this) : c.label)) };
      this.emit('event', this.ev);
    }
    finishEvent(msg) {
      this.ev = null;
      this.evTimer = rand(70, 130);
      this.S.stats.eventsDone++;
      this.recalc(Date.now());
      this.emit('eventEnd', {});
      if (msg) this.emit('toast', msg);
    }
    chooseEvent(i) {
      if (!this.ev || !this.ev.def.choices[i]) return;
      this.finishEvent(this.ev.def.choices[i].do(this));
    }
    tapHunter() {
      const e = this.ev;
      if (!e || !e.def.tap) return;
      e.taps++;
      if (e.taps >= e.def.tap.need) this.finishEvent(e.def.onWin(this));
    }
    expireEvent() {
      const e = this.ev;
      if (e.def.tap) this.finishEvent(e.def.onLose(this));
      else {
        this.ev = null;
        this.evTimer = rand(70, 130);
        this.emit('eventEnd', {});
        this.emit('toast', 'You ignored it. It ignored you back.');
      }
    }

    // ---------- secrets ----------
    unlockCellar() {
      if (this.S.cellar) return false;
      this.S.cellar = true;
      this.recalc(Date.now());
      this.emit('cellar', {});
      return true;
    }
    catchMabel() {
      const S = this.S;
      if (S.mabel) return false;
      S.mabel = true;
      S.ghosts.mabel = 1;
      S.seen.mabel = true;
      this.recalc(Date.now());
      this.emit('mabel', {});
      return true;
    }

    // ---------- achievements ----------
    checkAchievements(now) {
      const S = this.S;
      let changed = false;
      for (const a of D.ACHIEVEMENTS) {
        if (!S.ach[a.id] && a.test(S, this)) {
          S.ach[a.id] = now;
          changed = true;
          this.emit('ach', a);
        }
      }
      if (changed) this.recalc(now);
    }

    // ---------- prestige ----------
    pending() { return Math.floor(Math.sqrt(this.S.run / K.ESS_DIV)); }
    spookiest() {
      let best = null;
      for (const d of D.GHOSTS) {
        if (!this.S.seen[d.id]) continue;
        if (!best || D.RARITY_RANK[d.rarity] > D.RARITY_RANK[best.rarity] ||
            (D.RARITY_RANK[d.rarity] === D.RARITY_RANK[best.rarity] && d.base > best.base)) best = d;
      }
      return best ? best.name : 'Nobody (yet)';
    }
    exorcise() {
      const S = this.S, p = this.pending();
      if (p < 1) return null;
      const info = { essence: p, run: S.run, total: S.total, exorcisms: S.exorcisms + 1,
                     spookiest: this.spookiest(), houseName: S.houseName, at: Date.now() };
      S.essence += p;
      S.essenceTotal += p;
      S.exorcisms++;
      S.lastExorcism = info;
      S.rent = 0; S.run = 0;
      S.ghosts = {}; S.rooms = { parlor: true }; S.upgrades = {}; S.buffs = [];
      if (S.mabel) S.ghosts.mabel = 1;
      if (S.eshop.headstart) { S.ghosts.gary = 5; S.seen.gary = true; }
      this.ev = null;
      this.evTimer = 90;
      this.emit('eventEnd', {});
      this.recalc(Date.now());
      this.checkAchievements(Date.now());
      this.emit('exorcism', info);
      return info;
    }

    // ---------- daily haunting ----------
    dailyState(now) {
      const d = this.S.daily, today = dayKey(now);
      return { ready: d.last !== today, count: d.count, freezes: d.freezes };
    }
    claimDaily(now) {
      const d = this.S.daily, today = dayKey(now);
      if (d.last === today) return null;
      let note = '';
      if (!d.last) d.count = 1;
      else {
        const gap = dayNum(today) - dayNum(d.last);
        if (gap === 1) d.count++;
        else if (gap === 2 && d.freezes > 0) { d.freezes--; d.count++; note = ' A streak freeze saved you.'; }
        else d.count = 1;
      }
      if (d.count % 7 === 0) d.freezes = Math.min(3, d.freezes + 1);
      d.last = today;
      const x = this.gain(Math.max(25 * d.count, this.C.rps * 60 * Math.min(d.count, 7)));
      return { reward: x, streak: d.count, note };
    }

    // ---------- community meter (simulated until a server exists) ----------
    community(now) {
      const S = this.S, WEEK = 7 * 864e5;
      const cycle = Math.floor(now / WEEK);
      if (S.comm.cycle !== cycle) S.comm = { cycle, contrib: 0, claimed: false };
      const crowd = ((now % WEEK) / WEEK) * 60;
      const you = Math.min(40, Math.log10(1 + S.comm.contrib) * 5);
      const pct = Math.min(100, crowd + you);
      const worldwide = 1284000 + Math.floor(Math.max(0, now - Date.UTC(2026, 9, 1)) / 4000) + S.stats.ghostsBought;
      return { pct, worldwide, claimable: pct >= 100 && !S.comm.claimed, claimed: S.comm.claimed };
    }
    claimCommunity(now) {
      if (!this.community(now).claimable) return false;
      this.S.comm.claimed = true;
      this.addBuff('Halloween Hank', 1.25, 'all', 3600);
      return true;
    }

    // ---------- codex, seances and seasons ----------
    discovered() {
      let n = Object.keys(this.S.codex.lodgers).length;
      for (const d of D.GHOSTS) if (this.S.seen[d.id]) n++;
      return n;
    }
    totalCodex() { return D.GHOSTS.length + D.LODGERS.length; }
    lodgerCount() { return Object.keys(this.S.codex.lodgers).length; }
    familyFound(fid) { return D.FMAP[fid].members.filter((id) => this.S.codex.lodgers[id]).length; }
    familyDone(fid) { const f = D.FMAP[fid]; return f.members.length > 0 && this.familyFound(fid) === f.members.length; }
    setsDone() { return D.FAMILIES.filter((f) => this.familyDone(f.id)).length; }
    seasonalFound() { return D.LODGERS.filter((l) => l.season && this.S.codex.lodgers[l.id]).length; }
    seanceCost() { return Math.ceil(D.SEANCE_BASE * Math.pow(D.SEANCE_GROWTH, this.lodgerCount())); }
    seanceEligible() {
      const cur = this.curSeason && this.curSeason.id;
      return D.LODGERS.filter((l) => !this.S.codex.lodgers[l.id] && (!l.season || l.season === cur));
    }
    seance() {
      const S = this.S, pool = this.seanceEligible(), cost = this.seanceCost();
      if (!pool.length || S.rent < cost) return null;
      const cur = this.curSeason && this.curSeason.id;
      const w = pool.map((l) => D.SEANCE_WEIGHT[l.rarity] * (l.season && l.season === cur ? 3 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
      while (i < pool.length - 1 && (r -= w[i]) > 0) i++;
      const l = pool[i];
      S.rent -= cost;
      S.codex.lodgers[l.id] = Date.now();
      S.codex.seances++;
      this.recalc(Date.now());
      this.emit('seance', { ghost: l, cost });
      this.checkAchievements(Date.now());
      return l;
    }
    checkSeason(now) {
      const s = D.seasonAt(now, this.seasonOverride);
      const id = s ? s.id : null;
      if ((this.curSeason ? this.curSeason.id : null) === id) return;
      this.curSeason = s;
      if (s) this.S.house.seasons[s.id] = true;
      this.recalc(now);
      this.emit('season', s);
    }

    // ---------- house customization ----------
    cosmeticUnlocked(kind, id) {
      const c = D.CMAP[kind] && D.CMAP[kind][id];
      if (!c) return false;
      const u = c.unlock;
      if (!u) return true;
      if (u.lodgers) return this.lodgerCount() >= u.lodgers;
      if (u.exor) return this.S.exorcisms >= u.exor;
      if (u.ach) return Object.keys(this.S.ach).length >= u.ach;
      if (u.season) return !!this.S.house.seasons[u.season];
      return false;
    }
    setCosmetic(kind, id) {
      const H = this.S.house;
      if (!this.cosmeticUnlocked(kind, id)) return false;
      if (kind === 'decor') {
        const i = H.decor.indexOf(id);
        if (i >= 0) H.decor.splice(i, 1);
        else { if (H.decor.length >= D.MAX_DECOR) H.decor.shift(); H.decor.push(id); }
      } else if (H[kind] === id) return false;
      else H[kind] = id;
      this.S.stats.customized++;
      this.checkAchievements(Date.now());
      this.emit('house', {});
      return true;
    }

    // ---------- weekly rent race against rivals (simulated) ----------
    raceProgress(now) { const W = 7 * 864e5; return (now % W) / W; }
    rivalScore(r, i, ref, p) { return ref * r.strength * p * (1 + 0.1 * Math.sin(p * 9 + i * 2)); }
    raceBoard(now, final) {
      const W = this.S.week, p = final ? 1 : this.raceProgress(now);
      const rows = D.RIVALS.map((r, i) => ({ id: r.id, name: r.name, house: r.house, score: this.rivalScore(r, i, W.ref, p), you: false }));
      rows.push({ id: 'you', name: this.S.houseName, house: 'You', score: W.earned, you: true });
      rows.sort((a, b) => b.score - a.score);
      rows.forEach((r, i) => { r.rank = i + 1; });
      return rows;
    }
    weekCheck(now) {
      const S = this.S, cycle = Math.floor(now / (7 * 864e5)), W = S.week;
      if (W.cycle === cycle) return;
      if (W.cycle !== 0) {
        const rank = this.raceBoard(now, true).find((r) => r.you).rank;
        W.pending = { rank, earned: W.earned };
        if (rank === 1) S.stats.raceWins++;
        W.prev = W.earned;
        this.emit('week', W.pending);
      }
      W.cycle = cycle;
      W.earned = 0;
      W.ref = Math.max(D.RACE_MIN_REF, W.prev);
    }
    claimWeek() {
      const W = this.S.week, p = W.pending;
      if (!p) return null;
      W.pending = null;
      const tiers = { 1: [1.3, 7200, 'Landlord of the Week'], 2: [1.2, 3600, 'Runner-Up Landlord'], 3: [1.1, 3600, 'Third Place Landlord'] };
      const t = tiers[p.rank];
      let msg;
      if (t) { this.addBuff(t[2], t[0], 'all', t[1]); msg = `${t[2]}: rent x${t[0]} for ${t[1] / 3600}h.`; }
      else { const x = this.gain(Math.max(50, this.income(120))); msg = `Participation prize: ${this.fmt(x)} rent and a handshake.`; }
      this.checkAchievements(Date.now());
      return { rank: p.rank, msg };
    }

    // ---------- friend houses (share codes, no server) ----------
    houseSnapshot() {
      const S = this.S;
      return { n: S.houseName, th: S.house.theme, dr: S.house.door, dc: S.house.decor.slice(), pt: S.house.pet,
               rm: Object.keys(S.rooms), gh: Object.assign({}, S.ghosts), ex: S.exorcisms, tot: Math.floor(S.total),
               lg: this.lodgerCount(), ac: Object.keys(S.ach).length, sp: this.spookiest(), id: String(S.created) };
    }
    houseCode() { return 'HLH1:' + btoa(unescape(encodeURIComponent(JSON.stringify(this.houseSnapshot())))); }
    // Returns a sanitized snapshot or null. Never trust the contents: clamp everything.
    parseHouseCode(text) {
      try {
        const t = String(text).trim();
        if (!t.startsWith('HLH1:') || t.length > 6000) return null;
        const o = JSON.parse(decodeURIComponent(escape(atob(t.slice(5)))));
        if (!o || typeof o !== 'object') return null;
        return this.cleanSnapshot(o);
      } catch (e) { return null; }
    }
    cleanSnapshot(o) {
      const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
      const opt = (kind, v, def) => (D.CMAP[kind][v] ? v : def);
      const gh = {};
      for (const d of D.GHOSTS) if (o.gh && o.gh[d.id]) gh[d.id] = Math.floor(num(o.gh[d.id], 1e6));
      return {
        n: String(o.n || 'Unnamed House').slice(0, 40), th: opt('theme', o.th, 'classic'), dr: opt('door', o.dr, 'wood'),
        dc: (Array.isArray(o.dc) ? o.dc : []).filter((x) => D.CMAP.decor[x]).slice(0, D.MAX_DECOR), pt: opt('pet', o.pt, 'cat'),
        rm: (Array.isArray(o.rm) ? o.rm : []).filter((x) => D.RMAP[x]), gh, ex: Math.floor(num(o.ex, 1e6)), tot: num(o.tot, 1e300),
        lg: Math.floor(num(o.lg, 999)), ac: Math.floor(num(o.ac, 999)), sp: String(o.sp || 'Nobody').slice(0, 40), id: String(o.id || '').slice(0, 24),
      };
    }
    rivalHouse(r) {
      const gh = {}, order = ['gary', 'beatrix', 'dan', 'pete', 'accountant', 'karen', 'hoa'], share = [0.35, 0.2, 0.15, 0.1, 0.08, 0.07, 0.05];
      order.forEach((id, i) => { gh[id] = Math.max(1, Math.round(r.tenants * share[i])); });
      const rm = ['parlor', 'library', 'basement', 'attic', 'ballroom'].slice(0, 2 + Math.floor(r.strength * 2.5));
      return this.cleanSnapshot({ n: r.house, th: r.theme, dr: r.door, dc: r.decor, pt: r.pet, rm, gh, ex: Math.round(r.strength * 4),
        tot: r.strength * 4e9, lg: Math.round(r.strength * 12), ac: Math.round(r.strength * 7), sp: 'Lady Beatrix', id: 'rival-' + r.id });
    }
    // Pays a small guest tip once per house per day. Returns {own, tip}.
    visit(snap, now) {
      const S = this.S;
      if (snap.id === String(S.created)) return { own: true, tip: 0 };
      const today = dayKey(now);
      S.stats.visits++;
      let tip = 0;
      if (S.visits[snap.id] !== today) {
        S.visits[snap.id] = today;
        tip = this.gain(Math.max(100, this.income(240)));
      }
      this.checkAchievements(now);
      return { own: false, tip };
    }

    // ---------- saving ----------
    save() {
      if (!this.storage) return;
      try { this.storage.setItem(K.SAVE_KEY, JSON.stringify(this.S)); } catch (e) { /* storage full or blocked */ }
      this.syncShared();
    }
    // Share the discovered-ghost count with Simulator Mode and pick up its solved special guests.
    syncShared() {
      if (!SH || !this.storage) return;
      SH.write({ idle: { count: this.lodgerCount() } }, this.storage);
      const guests = SH.read(this.storage).guests;
      this.simGuests = guests;
      this.simBonus = SH.simRentBonus(guests);
    }
    // Pull in guests solved by Simulator Mode while this tab is open (storage event). Does not write.
    refreshShared() {
      if (!SH || !this.storage) return false;
      const guests = SH.read(this.storage).guests, bonus = SH.simRentBonus(guests);
      const changed = bonus !== this.simBonus;
      this.simGuests = guests; this.simBonus = bonus;
      return changed;
    }
    load() {
      if (!this.storage) return false;
      if (SH) { const guests = SH.read(this.storage).guests; this.simGuests = guests; this.simBonus = SH.simRentBonus(guests); }
      try {
        const raw = this.storage.getItem(K.SAVE_KEY);
        return raw ? this.adopt(JSON.parse(raw)) : false;
      } catch (e) { return false; }
    }
    adopt(o) {
      if (!o || typeof o !== 'object' || o.v !== 1) return false;
      const base = newState(Date.now());
      const S = Object.assign(base, o);
      S.daily = Object.assign(base.daily, o.daily);
      S.comm = Object.assign(base.comm, o.comm);
      S.settings = Object.assign(base.settings, o.settings);
      S.stats = Object.assign(base.stats, o.stats);
      S.codex = Object.assign(base.codex, o.codex);
      S.codex.lodgers = Object.assign({}, o.codex && o.codex.lodgers);
      S.house = Object.assign(base.house, o.house);
      S.house.decor = Array.isArray(S.house.decor) ? S.house.decor.filter((x) => D.CMAP.decor[x]) : [];
      S.house.seasons = Object.assign({}, o.house && o.house.seasons);
      for (const k of ['theme', 'door', 'pet']) if (!D.CMAP[k][S.house[k]]) S.house[k] = 'classic';
      if (!D.CMAP.door[S.house.door]) S.house.door = 'wood';
      if (!D.CMAP.pet[S.house.pet]) S.house.pet = 'cat';
      S.week = Object.assign(base.week, o.week);
      S.visits = Object.assign({}, o.visits);
      // Saves from before the tutorial existed: skip it for anyone who already played.
      S.tutorial = o.tutorial ? Object.assign(base.tutorial, o.tutorial) : { step: 0, done: !!(o.stats && o.stats.firstClick) };
      for (const k of ['ghosts', 'rooms', 'upgrades', 'eshop', 'ach', 'seen']) S[k] = Object.assign({}, o[k]);
      S.rooms.parlor = true;
      S.buffs = Array.isArray(o.buffs) ? o.buffs : [];
      this.S = S;
      this.recalc(Date.now());
      return true;
    }
    exportSave() {
      return 'HL1:' + btoa(unescape(encodeURIComponent(JSON.stringify(this.S))));
    }
    importSave(text) {
      try {
        const s = String(text).trim();
        if (!s.startsWith('HL1:')) return false;
        return this.adopt(JSON.parse(decodeURIComponent(escape(atob(s.slice(4))))));
      } catch (e) { return false; }
    }
    hardReset() {
      this.S = newState(Date.now());
      this.ev = null;
      this.chadMult = 1;
      this.curSeason = null;
      this.checkSeason(Date.now());
      this.recalc(Date.now());
      this.save();
    }
  }

  const api = { Game, newState, EVENTS, dayKey };
  root.HLEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
