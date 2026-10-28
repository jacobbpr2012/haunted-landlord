// First-purchase times per tenant for a bot that never exorcises: node tools/tiers.js [clicksPerSec] [hours]
const D = require('../game/data.js');
const { Game } = require('../game/engine.js');
const g = new Game(null); g.onEmit = () => {};
const CPS = Number(process.argv[2] || 2), HOURS = Number(process.argv[3] || 12);
const now0 = Date.now(), first = {};
for (let t = 0; t < HOURS * 3600; t++) {
  const now = now0 + t * 1000;
  if (t < 1800) for (let i = 0; i < CPS; i++) g.click(now);
  g.ev = null; g.evTimer = 999; g.tick(1, now);
  let best = null, bc = Infinity;
  const c = (k, id, cost) => { if (cost <= g.S.rent && cost < bc) { best = { k, id }; bc = cost; } };
  for (const d of D.GHOSTS) if (g.available(d.id)) c('g', d.id, g.unitCost(d.id));
  for (const u of D.UPGRADES) if (g.upgradeVisible(u)) c('u', u.id, u.cost);
  for (const r of D.ROOMS) if (!g.S.rooms[r.id]) c('r', r.id, r.cost);
  if (best) { if (best.k === 'g') { g.buyGhost(best.id, 1); if (!(best.id in first)) first[best.id] = t; } else if (best.k === 'u') g.buyUpgrade(best.id); else g.buyRoom(best.id); }
  if (t > 0 && t % 3600 === 0) console.log(`${t / 3600}h rps ${g.C.rps.toExponential(2)} essence pending ${g.pending()}`);
}
for (const id in first) console.log(id.padEnd(11), (first[id] / 60).toFixed(1) + ' min');
