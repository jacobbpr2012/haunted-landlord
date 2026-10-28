// Codex content: lodger ghosts, families, seasons, cosmetics and rival landlords. Extends HLData. No DOM.
(function (root) {
  'use strict';
  const D = root.HLData || require('./data.js');

  // ---------- families ----------
  D.FAMILIES = [
    { id: 'victorian', name: 'Parlour Peers', hue: 270, set: 0.03, blurb: 'Lace, tea and unresolved grudges.' },
    { id: 'retro', name: 'Retro Rejects', hue: 320, set: 0.03, blurb: 'Stuck somewhere between 1978 and 1994.' },
    { id: 'office', name: 'Office Haunts', hue: 215, set: 0.03, blurb: 'Circling back from beyond the grave.' },
    { id: 'sea', name: 'Seafarers', hue: 180, set: 0.03, blurb: 'Smell of salt. No sea in sight.' },
    { id: 'west', name: 'Wild West Wraiths', hue: 28, set: 0.03, blurb: 'Dusty, dramatic and quick on the draw.' },
    { id: 'kids', name: 'Little Terrors', hue: 52, set: 0.03, blurb: 'Small, giggly and deeply unsettling.' },
    { id: 'beasts', name: 'Beasts & Critters', hue: 120, set: 0.03, blurb: 'Not all tenants walk on two legs.' },
    { id: 'cosmic', name: 'Cosmic Oddities', hue: 240, set: 0.03, blurb: 'Not strictly ghosts. Pay on time anyway.' },
    { id: 'holiday', name: 'Holiday Haunts', hue: 10, set: 0.05, blurb: 'Only summoned during their season.' },
  ];

  // C=Common U=Uncommon R=Rare L=Legendary. Order in each family: 2C, 2U, R, L.
  const RAW = {
    victorian: [
      ['Duchess Dithering', 'C', 'Has been choosing a teacup since 1891.'],
      ['The Butler Did It', 'C', 'Did what? He will not say. He is, however, very polite about it.'],
      ['Reverend Mumbles', 'U', 'Sermons run 40 minutes. Nobody has left. Nobody can.'],
      ['Governess Grimsby', 'U', 'Corrects your grammar from beyond the grave.'],
      ['Lord Fogwick', 'R', 'Owns a fog. Charges it rent.'],
      ['Madame Seance', 'L', 'Hosts seances for the living. Booked solid until 2090.'],
    ],
    retro: [
      ['Mullet Mike', 'C', 'Business in the front. Party in the afterlife.'],
      ['Arcade Annie', 'C', 'Stuck on level 3 since 1986. Refuses a continue.'],
      ['Roller Rita', 'U', 'Skates the hallway at 2 AM. Wheels are very audible.'],
      ['VHS Vince', 'U', 'Be kind, rewind. He has been rewinding for decades.'],
      ['Synthwave Sal', 'R', 'Glows neon. The power bill is unchanged, somehow.'],
      ['Count Boombox', 'L', 'Plays one cassette. It is the greatest hit of the underworld.'],
    ],
    office: [
      ['Intern Ian', 'C', 'Died on his first day. Still unpaid.'],
      ['Cubicle Carl', 'C', 'Believes the hallway is his cubicle. Decorated it with a small plant.'],
      ['Printer Priscilla', 'U', 'Jams. Even in death. Especially in death.'],
      ['HR Harold', 'U', 'Mandatory fun. Mandatory haunting.'],
      ['Middle Manager Maureen', 'R', 'Circles back. Circles back. Circles back.'],
      ['The CEO of Nothing', 'L', 'Synergizes the void. Quarterly results: void.'],
    ],
    sea: [
      ['Cabin Boy Colin', 'C', 'Swabs a deck that does not exist. Swabs it anyway.'],
      ['Barnacle Bob', 'C', 'Smells of the sea. The sea is 300 miles away.'],
      ['Captain Cutlass', 'U', 'Demands you walk the plank. It is a hallway.'],
      ['Mermaid Marge', 'U', 'Haunts the bathtub. Reviews the water pressure.'],
      ['Admiral Anchorbottom', 'R', 'Commands a fleet of rubber ducks. They are loyal.'],
      ['Davy Jones, Locker Landlord', 'L', 'Owns the locker. Rents it. Obviously.'],
    ],
    west: [
      ['Dusty Dave', 'C', 'His only friend is a tumbleweed. It is also dead.'],
      ['Saloon Sally', 'C', 'Pours drinks nobody can drink. Tips remain strong.'],
      ['Sheriff Shadowbrook', 'U', 'There is a new sheriff in town. He has been dead 140 years.'],
      ['Prospector Pru', 'U', 'Struck gold. It was a doorknob.'],
      ['Outlaw Ollie', 'R', 'Wanted: dead or alive. Both, technically.'],
      ['The Phantom Gunslinger', 'L', 'Draws faster than his own shadow. The shadow is annoyed.'],
    ],
    kids: [
      ['Tiny Timmy', 'C', 'Asks "why" a lot. Nobody has an answer.'],
      ['Boo-Bear', 'C', 'A teddy bear. Haunted. Cute. Deeply unsettling.'],
      ['Giggles the Clown', 'U', 'The jokes are old. So is he.'],
      ['Nanny Nightlight', 'U', 'Checks under the bed. Is under the bed.'],
      ['Hopscotch Hattie', 'R', 'Always skips one square. Never lands. Ever.'],
      ['The Imaginary Friend', 'L', 'Nobody can see him. Not even the other ghosts. He is thriving.'],
    ],
    beasts: [
      ['Poltergeist Poodle', 'C', 'Barks at nothing. Nothing barks back.'],
      ['Spectral Squirrel', 'C', 'Hoards acorns that do not exist.'],
      ['Bat Bernard', 'U', 'Lives in the belfry. Pays in guano.'],
      ['Raven Reginald', 'U', 'Quoth: "Pay up."'],
      ['Wraith Wolf', 'R', 'Howls at the moon. The moon has stopped replying.'],
      ['Sir Purrcival the Eternal', 'L', 'Nine lives, all used. Back for a tenth.'],
    ],
    cosmic: [
      ['Static Steve', 'C', 'Only appears on channels you do not get.'],
      ['Lava Lampy', 'C', 'Mostly blobs. Occasionally wisdom.'],
      ['Abductee Al', 'U', 'Was returned. Was incorrectly returned.'],
      ['Moon Mover Moe', 'U', 'Rearranges the stars for a living. Union job.'],
      ['Comet Carol', 'R', 'Visits every 76 years. Overstays.'],
      ['The Void Itself', 'L', 'Not a ghost. Not not a ghost. Pays on time.'],
    ],
    holiday: [
      ['Sir Gourdon Ghoulash', 'R', 'Carved wrong. Haunts the carver.', 'halloween'],
      ['Pumpkin King Pip', 'L', 'Rules the patch. Taxes the seeds.', 'halloween'],
      ['Snowman Sven', 'R', 'Melted in 1994. Back every December.', 'winter'],
      ['Father Frostbite', 'L', 'Brings coal. Collects rent. Same energy.', 'winter'],
      ['Lovelorn Lenora', 'R', 'Writes letters to the living. Nobody replies.', 'valentine'],
      ['Heartbreak Harvey', 'L', 'Breaks hearts and the occasional window.', 'valentine'],
      ['Daffodil Dottie', 'R', 'Spring-cleans the ghosts. Does not ask first.', 'spring'],
      ['The Bone Bunny', 'L', 'Hides chocolate skulls. Finds them again in July.', 'spring'],
      ['Sunburnt Sam', 'R', 'A ghost with a tan. Impossible. Here he is.', 'summer'],
      ['Lifeguard Lou', 'L', 'Watches the bathtub. Nobody has drowned. Everyone is already dead.', 'summer'],
    ],
  };
  const RAR = { C: 'Common', U: 'Uncommon', R: 'Rare', L: 'Legendary' };
  D.LODGER_BONUS = { Common: 0.0025, Uncommon: 0.005, Rare: 0.01, Legendary: 0.015 }; // permanent rent per ghost found
  D.SEANCE_WEIGHT = { Common: 50, Uncommon: 30, Rare: 15, Legendary: 5 };
  D.SEANCE_BASE = 500;
  D.SEANCE_GROWTH = 1.22;

  D.LODGERS = [];
  D.FAMILIES.forEach((f) => {
    (RAW[f.id] || []).forEach((r, i) => {
      D.LODGERS.push({
        id: r[0].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        name: r[0], fam: f.id, rarity: RAR[r[1]], quirk: r[2], season: r[3] || null,
        color: `hsl(${(f.hue + i * 9) % 360}, 72%, ${74 - (r[1] === 'L' ? 6 : 0)}%)`,
      });
    });
  });
  D.LMAP = {};
  D.LODGERS.forEach((l) => { D.LMAP[l.id] = l; });
  D.FMAP = {};
  D.FAMILIES.forEach((f) => { f.members = D.LODGERS.filter((l) => l.fam === f.id).map((l) => l.id); D.FMAP[f.id] = f; });

  // ---------- seasons ----------
  // start/end are [month, day]; a range may wrap the new year. mult applies to all rent while the season is on.
  D.SEASONS = [
    { id: 'winter', name: 'Frostbitten Holidays', start: [12, 15], end: [1, 2], mult: 1.1,
      blurb: 'Snow on the roof, frost on the ghosts.', visitTitle: 'Carol Singers',
      visitText: 'A group of ghostly carol singers is on your porch. They only know one verse, but they know it loudly.',
      yes: 'Offer cocoa', no: 'Pretend nobody is home' },
    { id: 'valentine', name: 'Lovelorn Haunts', start: [2, 7], end: [2, 21], mult: 1.1,
      blurb: 'Hearts, flowers and unresolved ghost drama.', visitTitle: 'Secret Admirer',
      visitText: 'Somebody left a valentine in the mailbox. It is addressed to "Occupant". It is from Gary.',
      yes: 'Reply with a poem', no: 'Return to sender' },
    { id: 'spring', name: 'Spring Cleaning Spirits', start: [3, 20], end: [4, 5], mult: 1.1,
      blurb: 'Windows open. Cobwebs politely asked to leave.', visitTitle: 'Spring Cleaning',
      visitText: 'The tenants want a deep clean. A very deep clean. A "who moved the furniture in 1920" clean.',
      yes: 'Break out the mops', no: 'Close the windows' },
    { id: 'summer', name: 'Beach Bash Banshees', start: [7, 1], end: [7, 15], mult: 1.1,
      blurb: 'The basement pool is a puddle. The ghosts are thrilled.', visitTitle: 'Pool Party',
      visitText: 'Someone filled the bathtub and called it a pool. The guest list is entirely ghosts.',
      yes: 'Bring snacks', no: 'Charge admission' },
    { id: 'halloween', name: 'Halloween Hauntfest', start: [10, 15], end: [11, 2], mult: 1.15,
      blurb: 'The busiest season in the dead-housing market.', visitTitle: 'Trick-or-Treaters',
      visitText: 'A crowd of tiny costumed visitors at the door. At least four are real. Probably.',
      yes: 'Hand out candy', no: 'Turn off the porch light' },
  ];
  D.SMAP = {};
  D.SEASONS.forEach((s) => { D.SMAP[s.id] = s; });
  D.seasonAt = function (now, forceId) {
    if (forceId && D.SMAP[forceId]) return D.SMAP[forceId];
    const d = new Date(now), v = (d.getMonth() + 1) * 100 + d.getDate();
    for (const s of D.SEASONS) {
      const a = s.start[0] * 100 + s.start[1], b = s.end[0] * 100 + s.end[1];
      if (a <= b ? (v >= a && v <= b) : (v >= a || v <= b)) return s;
    }
    return null;
  };

  // ---------- cosmetics ----------
  // unlock: free | {lodgers:n} | {exor:n} | {ach:n} | {season:id}
  D.COSMETICS = {
    theme: [
      { id: 'classic', name: 'Classic Gloom', sky: ['#1b1140', '#3a2466'], roof: ['#2c1e45', '#4a3478'], unlock: null },
      { id: 'midnight', name: 'Midnight Blue', sky: ['#07122e', '#12306a'], roof: ['#14284f', '#2f5aa8'], unlock: null },
      { id: 'blood', name: 'Blood Moon', sky: ['#2a0610', '#6a1424'], roof: ['#3a0e18', '#8a2a3c'], unlock: { lodgers: 5 } },
      { id: 'candy', name: 'Candy Coffin', sky: ['#4a2a6a', '#e08ac0'], roof: ['#7a3a8a', '#ffb0dd'], unlock: { exor: 1 } },
      { id: 'swamp', name: 'Swamp Chic', sky: ['#0b2418', '#1f5a3a'], roof: ['#1a3a28', '#4a9a64'], unlock: { lodgers: 15 } },
      { id: 'gilded', name: 'Gilded Tomb', sky: ['#241a08', '#6a5018'], roof: ['#3a2c0e', '#e0b83a'], unlock: { exor: 3 } },
      { id: 'pumpkin', name: 'Hauntfest Orange', sky: ['#2a1204', '#a8480e'], roof: ['#3a1c08', '#ff8a2a'], unlock: { season: 'halloween' } },
      { id: 'frost', name: 'Frostbite', sky: ['#0e2440', '#7ab0d8'], roof: ['#9ac0dc', '#e8f6ff'], unlock: { season: 'winter' } },
      { id: 'sweet', name: 'Sweetheart', sky: ['#3a0e2a', '#c04a8a'], roof: ['#6a1e4a', '#ff8ac8'], unlock: { season: 'valentine' } },
      { id: 'bloom', name: 'Bloom', sky: ['#1a3a3a', '#8ad8b0'], roof: ['#3a6a52', '#c8f0d8'], unlock: { season: 'spring' } },
      { id: 'sunny', name: 'Sunset Shore', sky: ['#3a1a5a', '#ff9a4a'], roof: ['#6a3a4a', '#ffd070'], unlock: { season: 'summer' } },
    ],
    door: [
      { id: 'wood', name: 'Old Oak', c: ['#5a3a2a', '#3d2519'], b: '#8a5d3b', unlock: null },
      { id: 'crimson', name: 'Crimson', c: ['#7a1e2a', '#4a0e18'], b: '#c04a5a', unlock: null },
      { id: 'emerald', name: 'Emerald', c: ['#1e6a4a', '#0e3a28'], b: '#4ac08a', unlock: { lodgers: 10 } },
      { id: 'iron', name: 'Wrought Iron', c: ['#3a3a4a', '#1e1e2a'], b: '#8a8aa8', unlock: { ach: 5 } },
      { id: 'gold', name: 'Gold Leaf', c: ['#8a6a1e', '#5a420e'], b: '#ffd24a', unlock: { exor: 2 } },
    ],
    decor: [
      { id: 'cobwebs', name: 'Cobwebs', unlock: null },
      { id: 'bats', name: 'Bats', unlock: null },
      { id: 'tombs', name: 'Tombstones', unlock: { exor: 1 } },
      { id: 'lights', name: 'Fairy Lights', unlock: { lodgers: 8 } },
      { id: 'gnome', name: 'Lawn Gnome', unlock: { ach: 3 } },
      { id: 'lantern', name: 'Lantern', unlock: { ach: 8 } },
      { id: 'pumpkins', name: 'Pumpkins', unlock: { season: 'halloween' } },
      { id: 'wreath', name: 'Wreath', unlock: { season: 'winter' } },
      { id: 'hearts', name: 'Hearts', unlock: { season: 'valentine' } },
      { id: 'flowers', name: 'Flower Beds', unlock: { season: 'spring' } },
      { id: 'beach', name: 'Beach Ball', unlock: { season: 'summer' } },
    ],
    pet: [
      { id: 'cat', name: 'Cat', unlock: null },
      { id: 'raven', name: 'Raven', unlock: { lodgers: 12 } },
      { id: 'toad', name: 'Toad', unlock: { ach: 6 } },
      { id: 'none', name: 'No pet', unlock: null },
    ],
  };
  D.MAX_DECOR = 4;
  D.CMAP = {};
  for (const k in D.COSMETICS) { D.CMAP[k] = {}; D.COSMETICS[k].forEach((c) => { D.CMAP[k][c.id] = c; }); }

  // ---------- rival landlords ----------
  // strength is a fraction of "last week's earnings" the rival will reach by the end of the week.
  D.RIVALS = [
    { id: 'mortgage', name: 'Madame Mortgage', house: 'Gilded Gables', strength: 0.7, theme: 'gilded', door: 'gold', decor: ['lights'], pet: 'raven', tenants: 14,
      bio: 'Charges ghosts for the view. The view is a wall.',
      ahead: 'Madame Mortgage sniffs: "Darling, amateur hour is over."', behind: 'Madame Mortgage is checking her ledger. And her pulse.' },
    { id: 'sid', name: 'Slumlord Sid', house: "Sid's Moldering Motel", strength: 0.95, theme: 'swamp', door: 'iron', decor: ['cobwebs', 'gnome'], pet: 'toad', tenants: 22,
      bio: 'Fixes nothing. Collects everything.', ahead: 'Sid shrugs: "Not my problem, pal."', behind: 'Sid is nervous. He has started fixing a faucet.' },
    { id: 'baron', name: 'Baron von Bylaw', house: 'Castle Compliance', strength: 1.2, theme: 'midnight', door: 'crimson', decor: ['tombs', 'lantern'], pet: 'cat', tenants: 31,
      bio: 'Has a bylaw for everything. Including bylaws.', ahead: 'The Baron cites you for "excessive confidence".', behind: 'The Baron is drafting a new bylaw. It is about you.' },
    { id: 'lavinia', name: 'Lady Lavinia', house: "Lavinia's Lofts", strength: 1.5, theme: 'blood', door: 'emerald', decor: ['bats', 'cobwebs', 'lights'], pet: 'raven', tenants: 44,
      bio: 'Owns six haunted towers. Is working on a seventh.', ahead: 'Lavinia smiles. It is not a nice smile.', behind: 'Lavinia is calling her lawyers. They are all vampires.' },
  ];
  D.RACE_MIN_REF = 20000;
  D.CHAD_MULTS = [0.25, 0.5, 0.8, 1.2, 1.6, 2.5];
  D.CHAD_LINES = {
    up: ['Chad: "Number go up. Number go UP."', 'Chad: "Told you. I told everyone."'],
    down: ['Chad: "This is fine. This is a dip. This is a buying opportunity."', 'Chad: "Bro, I am not even stressed."'],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
