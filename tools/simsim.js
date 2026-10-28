// Simulator Mode smoke test and cash curve: node tools/simsim.js [days]
// A simple bot assigns best-fit rooms, picks the sensible complaint fix, and buys rooms/staff when affordable.
const D = require('../game/sim/data.js');
const { Sim } = require('../game/sim/engine.js');

const days = Number(process.argv[2] || 30);
const g = new Sim(null);
const S = g.S;
for (let d = 0; d < days; d++) {
  // buy things when rich enough
  for (const r of D.ROOMS) if (r.cost && !S.rooms[r.id].owned && S.cash > r.cost + 150) g.buyRoom(r.id);
  for (const u of D.UPGRADES) if (!S.upgrades[u.id] && S.cash > u.cost + 300) g.buyUpgrade(u.id);
  if (S.stage >= 2 && S.cash > 400) D.STAFF.forEach((s) => g.hire(s.id));
  if (S.stage >= 3 && S.cash > 1000) { g.hire('gm'); if (S.cash > D.GM.train[S.gmLvl - 1] + 800) g.trainGM(); }
  if (S.stage >= 4) {
    for (const p of g.allProps()) {
      if (!g.prop(p.id).owned && S.cash > p.cost + 3000) g.buyProp(p.id);
      if (g.prop(p.id).owned) {
        if (!g.prop(p.id).gm && S.cash > 500) g.hireBranchGM(p.id);
        if (S.cash > g.propRenoCost(p.id) + 2000) g.renovateProp(p.id);
        if (S.cash > 6000) g.trainBranchGM(p.id);
      }
    }
    if (g.ownedProps().length >= 2 && S.cash > 3000) g.hireRegional();
    if (S.stage >= 5) {
      if (S.cash > D.BRAND.cost[S.brand] + 5000) g.buyBrand();
      if (S.cash > 30000) g.startCampaign("billboards");
      if (S.stage >= 6) { D.LANDMARKS.forEach((l) => { if (S.cash > l.cost + 50000) g.buyLandmark(l.id); }); }
      if (S.stage >= 7 && g.worldCost() && S.cash > g.worldCost() + 200000) g.buyWorld();
      for (const o of S.offers.slice()) if (S.cash > o.cost + 15000) g.buyAcq(o.id);
    }
  }
  Object.keys(S.staff).forEach((id) => { if (id !== 'regional' && S.morale[id] < 45) g.raise(id); });
  g.gmProps().forEach((d) => { if (g.prop(d.id).morale < 45) g.raiseBranch(d.id); });
  if (S.cash > 2000 && (Object.values(S.morale).some((m) => m < 50) || g.gmProps().some((d) => g.prop(d.id).morale < 50))) g.party();
  g.ownedRooms().forEach((r) => { if (S.cash > g.levelCost(r.id) + 300) g.upgradeRoom(r.id); });
  g.ownedRooms().forEach((r) => { if (S.rooms[r.id].cond < 60) g.repair(r.id); });
  if (S.cash > 500 && g.freeRooms().length >= 3) g.runAd();
  for (const a of S.arrivals.slice()) {
    let best = null, bm = -1;
    for (const r of g.freeRooms()) { const m = g.match(a.type, r.id); if (m > bm) { bm = m; best = r; } }
    if (best && bm >= 0.4) g.assign(a.id, best.id);
  }
  g.openDesk();
  while (g.currentCard()) g.resolveCard(1);
  if (S.phase === 'shift') g.closeDesk();
  const L = S.last;
  if ((d + 1) % 5 === 0 || d === days - 1) {
    console.log(`day ${S.day}: cash ${S.cash} debt ${S.debt} rev ${L.revenue} exp ${L.expenses} comfort ${S.comfort.toFixed(0)} spook ${S.spook.toFixed(0)} rooms ${g.ownedRooms().length} lvls ${g.ownedRooms().reduce((a, r) => a + (S.rooms[r.id].lvl || 0), 0)} ups ${Object.keys(S.upgrades).length} stage ${S.stage} gm ${S.staff.gm ? S.gmLvl : 0} staff ${Object.keys(S.staff).length} props ${g.ownedProps().length} brand ${S.brand} acq ${S.acq.length} grpRev ${S.group.revenue} land ${Object.keys(S.landmarks).length} world ${S.world} gms ${g.gmProps().length} quit? ${Object.keys(S.morale).length} stories ${S.stats.stories}`);
  }
  g.nextDay();
}
console.log('review:', JSON.stringify(S.review), 'bailouts:', S.stats.bailouts);
