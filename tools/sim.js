// Pacing check: node tools/sim.js
// A simple bot clicks, then buys the cheapest affordable thing each second. It ignores
// incidents and never exorcises, so it shows roughly how long the first Exorcism takes.
const D = require('../game/data.js');
const { Game } = require('../game/engine.js');

const g = new Game(null);
g.onEmit = () => {};
const fmtTime = (s) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
let t = 0;
const now0 = Date.now();
const marks = [1, 3, 5, 10, 20, 40];
const hit = {};
let firstUpgrade = null;

const CLICKS_ACTIVE = Number(process.argv[2] || 2); // clicks per second while "active"
while (t < 6 * 3600) {
  const now = now0 + t * 1000;
  if (t < 1800) for (let i = 0; i < CLICKS_ACTIVE; i++) g.click(now);
  g.ev = null; g.evTimer = 999;
  g.tick(1, now);

  let best = null, bestCost = Infinity;
  const consider = (kind, id, cost) => { if (cost <= g.S.rent && cost < bestCost) { best = { kind, id }; bestCost = cost; } };
  for (const d of D.GHOSTS) if (g.available(d.id)) consider('g', d.id, g.unitCost(d.id));
  for (const u of D.UPGRADES) if (g.upgradeVisible(u)) consider('u', u.id, u.cost);
  for (const r of D.ROOMS) if (!g.S.rooms[r.id]) consider('r', r.id, r.cost);
  if (best) {
    if (best.kind === 'g') g.buyGhost(best.id, 1);
    else if (best.kind === 'u') { g.buyUpgrade(best.id); if (!firstUpgrade) firstUpgrade = t; }
    else g.buyRoom(best.id);
  }
  const p = g.pending();
  for (const m of marks) if (p >= m && !(m in hit)) hit[m] = t;
  t++;
}
console.log(`first upgrade bought at ${firstUpgrade}s (${CLICKS_ACTIVE} clicks/s)`);
for (const m of marks) console.log(`pending essence >= ${m}: ${m in hit ? fmtTime(hit[m]) : 'not reached in 6h'}`);
console.log(`after 6h: rent/s ${g.C.rps.toFixed(0)}, run ${g.S.run.toExponential(2)}, ghosts ${g.totalGhosts()}`);
