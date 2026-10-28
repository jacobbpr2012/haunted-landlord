// Static game content and tuning constants. No logic that touches the DOM lives here.
(function (root) {
  'use strict';
  const D = {};

  D.CONST = {
    SAVE_KEY: 'haunted_landlord_save',
    GROWTH: 1.15,                 // price growth per tenant owned
    ESS_DIV: 5e9,                 // Spectral Essence = floor(sqrt(run rent / ESS_DIV))
    ESS_MULT: 0.1,                // +10% rent per Essence earned (lifetime)
    BASE_OFFLINE_CAP: 8 * 3600,   // seconds of offline earnings, before bonuses
    OFFLINE_RATE: 0.6,            // fraction of normal income earned while away
    CLICK_RPS_SHARE: 0.05,        // clicks also pay 5% of rent/sec so they stay relevant
    SHARE_URL: 'jacobbpr2012.github.io/haunted-landlord', // GitHub Pages; swap for a custom domain later
  };

  D.RARITY_RANK = { Common: 0, Uncommon: 1, Rare: 2, Secret: 3, Legendary: 4 };

  D.ROOMS = [
    { id: 'parlor',   name: 'The Parlor',   cost: 0,     blurb: 'Where it all begins. Smells like regret.' },
    { id: 'library',  name: 'The Library',  cost: 400,   blurb: 'Quiet. Mostly. Rent +10%.' },
    { id: 'basement', name: 'The Basement', cost: 4000,  blurb: 'Damp, dark and zoned for parties. Rent +10%.' },
    { id: 'attic',    name: 'The Attic',    cost: 30000, blurb: 'Great views. Of the ceiling. Rent +10%.' },
    { id: 'ballroom', name: 'The Ballroom', cost: 3e8, blurb: 'Chandelier optional. Complaints mandatory. Rent +10%.' },
    { id: 'tower',    name: 'The Tower',    cost: 5e14,    blurb: 'Pointy, windy and zoned for brooding. Rent +10%.' },
    { id: 'penthouse', name: 'The Penthouse', cost: 1e24, blurb: 'The top floor. Even the ghosts need an elevator. Rent +10%.' },
  ];

  D.GHOSTS = [
    { id: 'gary', name: 'Gary', rarity: 'Common', room: 'parlor', cost: 10, base: 0.5, color: '#9fe3d6',
      quirk: 'Forgot he is dead. Pays rent in loose change.',
      bio: 'Gary came for a quick look at the property and never left. He keeps asking where the Wi-Fi is.' },
    { id: 'beatrix', name: 'Lady Beatrix', rarity: 'Uncommon', room: 'library', cost: 200, base: 4, color: '#d9b8ff',
      quirk: 'Victorian. Pays well, but loses 15% of her rent if Disco Dan lives here.',
      bio: 'Died in 1887 of "a chill". Still annoyed about the draught. Reads at a volume of exactly zero.' },
    { id: 'dan', name: 'Disco Dan', rarity: 'Uncommon', room: 'basement', cost: 1500, base: 22, color: '#ff9ed2',
      quirk: 'Every Dan boosts all other tenants by 2%. Annoys Victorians.',
      bio: 'Danced his way into the afterlife in 1978 and refuses to acknowledge that it is over.' },
    { id: 'pete', name: 'Poltergeist Pete', rarity: 'Rare', room: 'basement', cost: 9000, base: 120, color: '#ffc27a',
      quirk: 'Chaos. Every 15s: a big payout, or a broken lamp.',
      bio: 'Pete does not hate you. Pete simply hates lamps. And plates. And, on a bad day, doors.' },
    { id: 'accountant', name: 'The Accountant', rarity: 'Rare', room: 'attic', cost: 60000, base: 700, color: '#a9c8ff',
      quirk: 'Audits the books. Each one adds +10% to offline earnings.',
      bio: 'Died at his desk during tax season. Nobody noticed for three weeks. He considers that a personal best.' },
    { id: 'mabel', name: 'Midnight Mabel', rarity: 'Secret', room: 'parlor', cost: null, base: 400, color: '#ffe27a',
      quirk: 'Only appears between 12:00 and 1:00 AM, local time. Moves in for free.',
      bio: 'She keeps unusual hours. She also keeps a lot of rent. She will not say how.' },
    { id: 'karen', growth: 1.19, name: 'Karen the Unliving', rarity: 'Rare', room: 'ballroom', cost: 6e8, base: 2.4e6, color: '#ffb3a7',
      quirk: 'Demands to speak to the manager. Regularly. That is you.',
      bio: 'Her review of the afterlife was one star. She is still waiting for a response.' },
    { id: 'hoa', growth: 1.22, name: 'The HOA Spirit', rarity: 'Rare', room: 'ballroom', cost: 3e11, base: 1e9, color: '#c8d6a0',
      quirk: 'Each one boosts other tenants by 3% (compliance). Disco Dan pays 10% less (violations).',
      bio: 'Your lawn is 2 cm too tall. It has been since 1962. There will be a fine.' },
    { id: 'chad', growth: 1.25, name: 'Chad, Crypto Ghost', rarity: 'Rare', room: 'tower', cost: 2e15, base: 4e12, color: '#7af0c8',
      quirk: 'Rent swings wildly every 20s, from x0.25 to x2.5. Mostly vibes.',
      bio: 'Died holding. Still holding. Will not elaborate. Has a podcast nobody can hear.' },
    { id: 'dolores', growth: 1.28, name: 'Dead Landlord Dolores', rarity: 'Legendary', room: 'tower', cost: 1e20, base: 1e17, color: '#d6c0c0',
      quirk: 'Your predecessor. Takes a 10% cut from all other tenants, but pays handsomely.',
      bio: 'She ran this house for forty years and sees no reason to stop now. Please do not move the doilies.' },
    { id: 'landlord', growth: 1.32, name: "The Landlord's Landlord", rarity: 'Legendary', room: 'penthouse', cost: 1e25, base: 1e22, color: '#ffd98a',
      quirk: "Raises everyone's rent: every one multiplies ALL rent by x1.05.",
      bio: 'Nobody has seen their face. The invoices arrive anyway, perfectly formatted.' },
  ];

  // fx keys: click (click power x), all (rent x), g {ghostId: x}, offlineCap (+seconds), offline (+rate)
  D.UPGRADES = [
    { id: 'paint', name: 'Fresh Coat of Paint', cost: 15, fx: { click: 2 },
      flavor: 'Covers the stains. Not the screaming.' },
    { id: 'floor', name: 'Creaky Floorboards', cost: 100, fx: { all: 1.1 },
      flavor: 'Free ambiance. Tenants call it a safety hazard.' },
    { id: 'deposit', name: 'Security Deposit', cost: 250, req: { ghost: 'gary', n: 3 }, fx: { g: { gary: 2 } },
      flavor: 'Non-refundable, because they are not leaving.' },
    { id: 'knocker', name: 'Brass Door Knocker', cost: 600, fx: { click: 3 },
      flavor: 'Knocks back. Sometimes first.' },
    { id: 'lease', name: 'Lease Clause 14(b)', cost: 1500, req: { ghost: 'beatrix', n: 1 }, fx: { g: { beatrix: 2 } },
      flavor: 'Fine print, in very small, very old ink.' },
    { id: 'mirror', name: 'Cursed Mirror', cost: 3000, cursed: true, fx: { click: 0.5, all: 1.6 },
      flavor: 'Seven years of bad luck. Seven times the paperwork. Somehow net positive.' },
    { id: 'lighting', name: 'Mood Lighting', cost: 6000, req: { ghost: 'dan', n: 1 }, fx: { g: { dan: 2 } },
      flavor: 'Disco ball installed over the tenant\'s objections.' },
    { id: 'curtains', name: 'Noise-Dampening Curtains', cost: 9000, fx: { all: 1.15 },
      flavor: 'Complaints drop 40%. Screams, 12%.' },
    { id: 'plumbing', name: 'Haunted Plumbing', cost: 20000, req: { ghost: 'pete', n: 1 }, fx: { g: { pete: 2 } },
      flavor: 'It was already haunted. Now it is billable.' },
    { id: 'nightledger', name: 'Night Shift Ledger', cost: 25000, fx: { offlineCap: 4 * 3600 },
      flavor: 'Someone has to count the money at 3 AM.' },
    { id: 'backlog', name: 'Maintenance Request Backlog', cost: 40000, fx: { all: 1.2 },
      flavor: '4,000 open tickets. All filed by the same ghost.' },
    { id: 'loophole', name: 'Property Tax Loophole', cost: 70000, req: { ghost: 'accountant', n: 1 },
      fx: { g: { accountant: 2 }, offline: 0.2 }, flavor: 'Technically, the house is a church now.' },
    { id: 'hoa', name: 'HOA Newsletter', cost: 120000, fx: { all: 1.25 },
      flavor: 'Page 1: Reminder that the dead may not park on the lawn.' },
    { id: 'monkey', name: 'Monkey\'s Paw Mortgage', cost: 200000, cursed: true, fx: { g: { gary: 0.5 }, all: 2.2 },
      flavor: 'Gary pays less. Everyone else... pays a lot more. Read the terms.' },
    { id: 'seance', name: 'Seance Table', cost: 350000, fx: { all: 1.3 },
      flavor: 'Two-for-one: summoning and dinner.' },
    { id: 'gutters', name: 'Premium Ectoplasm Gutters', cost: 600000, fx: { all: 1.4 },
      flavor: 'Carries away rain, tears and the occasional tenant.' },
    { id: 'repeal', name: 'Rent Control Repeal', cost: 1.2e6, fx: { all: 1.5 },
      flavor: 'Vote passed 3-0. Two abstained. They are also ghosts.' },
    { id: 'drywall', name: 'Soundproof Drywall (Probably)', cost: 2.5e6, fx: { click: 5 },
      flavor: 'Rated for sound up to, but not including, screaming.' },
    { id: 'ledgerpro', name: 'Landlord\'s Ledger Pro', cost: 5e6, fx: { all: 1.5, offline: 0.2 },
      flavor: 'Now with a pie chart of everything you owe.' },
    { id: 'trust', name: 'Deed in a Trust', cost: 1e7, fx: { all: 2 },
      flavor: 'Nobody knows who owns the house. Including you.' },
  ];

  D.ESHOP = [
    { id: 'headstart', name: 'Head Start', cost: 2, desc: 'Every run starts with 5 Garys already moved in.' },
    { id: 'spookypaint', name: 'Spooky Paint', cost: 3, desc: 'Click power x2.' },
    { id: 'eternal', name: 'Eternal Lease', cost: 4, desc: '+4 hours of offline earnings cap.' },
    { id: 'autobuy', name: 'Auto-Buy', cost: 5, desc: 'Automatically moves in the cheapest affordable tenant every 2 seconds.' },
    { id: 'interest', name: 'Ectoplasmic Interest', cost: 8, desc: 'All rent x1.25.' },
    { id: 'haggle', name: 'Haggling Spirits', cost: 10, desc: 'Tenants cost 10% less.' },
  ];

  // Each achievement gives +1% rent permanently (secrets give +2%). tests get (state, game).
  D.ACHIEVEMENTS = [
    { id: 'knock', name: 'Door-to-Door', desc: 'Collect rent for the first time.', test: (s) => s.clicks >= 1 },
    { id: 'knock100', name: 'Knock Knock', desc: 'Collect rent 100 times by hand.', test: (s) => s.clicks >= 100 },
    { id: 'tenant', name: 'Tenant Zero', desc: 'Have a ghost move in.', test: (s, g) => g.totalGhosts() >= 1 },
    { id: 'full', name: 'Full Occupancy', desc: 'Have 25 ghosts living in the house.', test: (s, g) => g.totalGhosts() >= 25 },
    { id: 'pettycash', name: 'Petty Cash', desc: 'Earn 1,000 rent in total.', test: (s) => s.total >= 1e3 },
    { id: 'mortgage', name: 'Mortgage Holder', desc: 'Earn 1,000,000 rent in total.', test: (s) => s.total >= 1e6 },
    { id: 'handyman', name: 'Handyman', desc: 'Buy 10 upgrades in a single run.', test: (s) => Object.keys(s.upgrades).length >= 10 },
    { id: 'mogul', name: 'Property Mogul', desc: 'Unlock every room in the house.', test: (s) => D.ROOMS.every((r) => s.rooms[r.id]) },
    { id: 'seance1', name: 'Table for Many', desc: 'Hold your first Seance.', test: (s) => s.codex.seances >= 1 },
    { id: 'codex25', name: 'Ghost Collector', desc: 'Discover 25 ghosts in the Codex.', test: (s, g) => g.discovered() >= 25 },
    { id: 'codex60', name: 'Completionist', desc: 'Discover 60 ghosts in the Codex.', test: (s, g) => g.discovered() >= 60 },
    { id: 'family', name: 'Family Reunion', desc: 'Complete a ghost family in the Codex.', test: (s, g) => g.setsDone() >= 1 },
    { id: 'seasonal', name: 'Seasonal Spirit', desc: 'Summon a seasonal ghost.', test: (s, g) => g.seasonalFound() >= 1 },
    { id: 'decorator', name: 'Interior Haunter', desc: 'Change how your house looks.', test: (s) => s.stats.customized >= 1 },
    { id: 'neighbor', name: 'Nosy Neighbor', desc: "Visit another landlord's house.", test: (s) => s.stats.visits >= 1 },
    { id: 'raceWin', name: 'Landlord of the Week', desc: 'Finish a Weekly Rent Race in first place.', test: (s) => s.stats.raceWins >= 1 },
    { id: 'manager', name: 'Property Manager', desc: 'Deal with 5 tenant incidents.', test: (s) => s.stats.eventsDone >= 5 },
    { id: 'exorcist', name: 'Notice of Exorcism', desc: 'Perform your first Exorcism.', test: (s) => s.exorcisms >= 1 },
    { id: 'slept', name: 'Sleeping on the Job', desc: 'Come back after being away for an hour or more.', test: (s) => s.stats.longestAway >= 3600 },
    { id: 'chal1', name: 'Rule Breaker', desc: 'Complete a Haunting Challenge.', test: (s) => Object.keys(s.challenge.done).length >= 1 },
    { id: 'chalAll', name: 'Rules Lawyer', desc: 'Complete every Haunting Challenge.', test: (s) => D.CHALLENGES.every((c) => s.challenge.done[c.id]) },
    { id: 'hunterPerfect', name: 'Perfect Defense', desc: 'Hide every ghost from a ghost hunter.', test: (s) => s.stats.hunterPerfect >= 1 },
    { id: 'tree3', name: 'Skill Issue (Solved)', desc: 'Learn 3 skills in the Essence tree.', test: (s) => Object.keys(s.tree).length >= 3 },
    { id: 'treeAll', name: 'Doctor of Hauntology', desc: 'Learn every skill in the Essence tree.', test: (s) => D.TREE.every((n) => s.tree[n.id]) },
    { id: 'nightOwl', name: 'Night Owl', desc: 'Spend 10 minutes haunting at night.', test: (s) => s.stats.nightTime >= 600 },
    { id: 'diary', name: 'Dear Diary', desc: 'Read 10 Ghost Journal entries.', test: (s, g) => g.journalTotal() >= 10 },
    { id: 'cellar', name: 'Basement of the Basement', desc: 'Patience is a virtue of the dead.', secret: true, test: (s) => s.cellar },
    { id: 'nightshift', name: 'Night Shift', desc: 'Some tenants keep unusual hours.', secret: true, test: (s) => s.mabel },
  ];

  D.ANECDOTES = [
    'Disco Dan hosted a four-hour party. Nobody came. He counts it as a success.',
    'Gary filed a maintenance request about his own haunting.',
    'Lady Beatrix wrote a strongly worded letter to the thermostat.',
    'Poltergeist Pete rearranged the furniture. Then rearranged it back. Then fought it.',
    'The Accountant found a missing cent and has not stopped smiling since 1994.',
    'Two ghosts argued over the Wi-Fi password. Neither of them has Wi-Fi.',
    'A ghost hunter showed up, got lost in the hallway, and left a four-star review.',
    'Someone moved the cat. The cat moved back. The cat has the lease now.',
    'Tenants held a meeting about the noise. The meeting was also very noisy.',
    'The house creaked in a way that sounded suspiciously like "per our last email".',
  ];

  D.EGGS = {
    moon: ['The moon says: "Yes, I am full. Thank you for asking."', 'The moon is not included in the lease.', 'You tried to charge the moon rent. It is a very good lawyer.'],
    cat: ['The cat looks at you. You owe the cat money now.', 'The cat is not a ghost. The cat is merely unimpressed.', 'Purr. (Translation: "Rent is due.")'],
    chimney: ['A puff of smoke spells "HELP". Then "JK". Then "HELP".', 'Something in the chimney whispers: "Tell Dolores I said hi."', 'Soot everywhere. This was not in the budget.'],
    dev: ['Note from the ghost of the programmer: "It worked on my machine. Technically, I have no machine."', 'Note from the ghost of the programmer: "TODO: remove the ghost of the programmer."'],
  };

  D.HOUSE_PARTS = {
    adj: ['Dread', 'Moldering', 'Grim', 'Creaky', 'Spooky', 'Haunted', 'Wailing', 'Gloomy'],
    noun: ['Manor', 'Villa', 'Lodge', 'Arms', 'Gables', 'Estate', 'Court', 'Terrace'],
    owner: ['Gary', 'Sir Boo-Boo', 'Lady Beatrix', 'Count Spookula', 'Mabel', 'Dolores', 'Disco Dan', 'Pete'],
  };

  // ---------- Haunting Challenges: rule-twist runs. mult = rent x while active; goal = run earnings needed. ----------
  // rules: costMult (tenant prices x), noUpgrades, noSeance, only (allowed ghost ids), evFast (incidents arrive x faster)
  D.CHALLENGE_BONUS = 0.05; // permanent rent each, multiplicative
  D.CHALLENGES = [
    { id: 'pricey', name: 'Pricey Poltergeists', mult: 3, goal: 3e10, rules: { costMult: 2 },
      desc: 'Tenants cost double. Rent is tripled to make up for it. The ghosts have heard of inflation.', win: 'The ghosts paid double to live here. They call it "premium haunting".' },
    { id: 'silent', name: 'Silent Seances', mult: 2, goal: 2e10, rules: { noSeance: true },
      desc: 'No Seances and no Codex bonuses. The dead are on a quiet-hours policy. Rent x2.', win: 'The Codex grumbles but forgives you. It was never that chatty anyway.' },
    { id: 'skeleton', name: 'Skeleton Crew', mult: 4, goal: 3e10, rules: { only: ['gary', 'beatrix', 'dan', 'pete'] },
      desc: 'Only Gary, Beatrix, Dan and Pete are available. Rent x4. Budget cuts have reached the afterlife.', win: 'A skeleton crew, a full ledger. HR has questions about the word "crew".' },
    { id: 'noupg', name: 'No Upgrades', mult: 2, goal: 4e8, rules: { noUpgrades: true },
      desc: 'The renovation budget is frozen. Rent x2. The floorboards stay creaky out of sheer spite.', win: 'You fixed nothing and profited anyway. A true landlord move.' },
    { id: 'mabel', name: "Mabel's Night Shift", mult: 2.5, goal: 3e10, rules: { evFast: 3 },
      desc: 'Incidents arrive three times as often while Mabel runs the night shift. Rent x2.5. Bring snacks.', win: 'Mabel signs off: "Fourteen crises, zero refunds. Pleasure working with you."' },
  ];

  // ---------- Prestige skill tree (second Essence sink). req must be earlier in the list. ----------
  D.TREE_BRANCHES = [
    { id: 'rent', name: 'Rent' }, { id: 'haunt', name: 'Haunting' }, { id: 'lodge', name: 'Lodgers' },
  ];
  // fx: all (rent x), click (click x), evPay (incident reward x), evFreq (incident timer x), seanceCost (x), lodger (lodger bonus x), offlineCap (+sec)
  D.TREE = [
    { id: 'r1', br: 'rent', name: 'Better Bookkeeping', cost: 3, fx: { all: 1.08 }, desc: 'All rent +8%.' },
    { id: 'r2', br: 'rent', name: 'Compound Interest', cost: 6, req: 'r1', fx: { all: 1.12 }, desc: 'All rent +12%.' },
    { id: 'r3', br: 'rent', name: 'Landlord Legacy', cost: 12, req: 'r2', fx: { all: 1.2 }, desc: 'All rent +20%.' },
    { id: 'h1', br: 'haunt', name: 'Sturdy Doorbell', cost: 3, fx: { click: 1.5 }, desc: 'Click power x1.5.' },
    { id: 'h2', br: 'haunt', name: 'Hospitality Training', cost: 6, req: 'h1', fx: { evPay: 1.5 }, desc: 'Incident rewards and buffs +50%.' },
    { id: 'h3', br: 'haunt', name: 'Reputation for Chaos', cost: 12, req: 'h2', fx: { evFreq: 0.7, evPay: 1.25 }, desc: 'Incidents come 30% sooner and pay another 25%.' },
    { id: 'l1', br: 'lodge', name: 'Discount Candles', cost: 3, fx: { seanceCost: 0.75 }, desc: 'Seances cost 25% less.' },
    { id: 'l2', br: 'lodge', name: 'Spirit Whisperer', cost: 6, req: 'l1', fx: { lodger: 1.5 }, desc: 'Lodger rent bonuses +50%.' },
    { id: 'l3', br: 'lodge', name: 'Open House', cost: 12, req: 'l2', fx: { offlineCap: 6 * 3600, seanceCost: 0.8 }, desc: '+6h offline cap, Seances another 20% cheaper.' },
  ];

  // ---------- Tenant quirks: friends/feuds. Both owned = rent change on BOTH. ----------
  D.QUIRKS = [
    { a: 'gary', b: 'dan', pct: 0.05, line: 'Gary thinks Dan is "a great guy, really loud".' },
    { a: 'beatrix', b: 'accountant', pct: 0.05, line: 'Beatrix and the Accountant share a love of quiet, receipts and disapproval.' },
    { a: 'pete', b: 'accountant', pct: -0.05, line: "Pete keeps throwing the Accountant's stapler. The Accountant is itemizing it." },
    { a: 'karen', b: 'hoa', pct: -0.08, line: 'Karen and the HOA Spirit are in a Cold War over the shared lawn.' },
    { a: 'chad', b: 'dolores', pct: -0.06, line: 'Dolores asked Chad to "get a real job". He has a podcast. It did not help.' },
    { a: 'hoa', b: 'landlord', pct: 0.05, line: "The HOA Spirit adores the Landlord's Landlord. Finally, someone with paperwork." },
  ];

  // ---------- Ghost Journal: three entries per main ghost, unlocked by time lived (seconds, across Exorcisms). ----------
  D.JOURNAL_AT = [600, 3600, 18000];
  D.JOURNAL = {
    gary: ['Day 1. Asked where the Wi-Fi is. Was told "dead people do not need Wi-Fi". Rude.', 'Found out I am dead. Taking it well. Mostly asked about the Wi-Fi again.', 'Made a friend. It is a doorknob. We get along. It does not ask about rent.'],
    beatrix: ['Entry I. The draught persists. I have written to the Housing Authority of 1887.', 'Entry LVII. Another tenant owns a shiny hat and no shame. I remain composed.', 'Entry CCC. I have decided to haunt a chair in perfect silence. The landlord may take that as thanks.'],
    dan: ['Hosted a party. Guests: me. Vibe: immaculate.', 'The landlord says the "disco ball" is a "fire hazard". It is a lifestyle.', 'Night 400 of the Party. Still no guests. Staying optimistic. The floor is lava.'],
    pete: ['Broke a lamp. It was looking at me.', 'Broke the lamp again. Got a new lamp. Had a moment with the lamp. Broke it.', 'The landlord has stopped buying lamps. I now throw the pillows. Everyone is learning.'],
    accountant: ['Reconciled the cellar. Found 4 cents. Considering a victory dance.', 'Discovered the landlord pays "in vibes" on the 31st. Escalating to the Bureau of Ghosts.', 'Tax season again. I have never felt more alive. Technically not true. I cherish it anyway.'],
    mabel: ['Arrived at 12:03 AM. Nobody asked why. Good.', 'I have a key to every room. I have a key to rooms that do not exist. Do not ask.', 'The landlord thinks I pay rent. I think the landlord pays me, in worry. We are even.'],
    karen: ['Asked to see the manager. The manager is "also the maintenance guy". Unacceptable.', 'Left a review: "Would not haunt again." Immediately booked another stay.', 'The manager gave me a coupon. I am keeping it. Nobody will ever know how much I enjoy this.'],
    hoa: ['Measured the grass. It is 2 cm too long. This has been so since 1962.', 'Issued a violation for a violation. Cannot find a rule against it. Drafting one.', 'The landlord may have flowers if they are spooky in an approved shade of grey.'],
    chad: ['Day 1. Rent paid in coin. Landlord asked "what coin". Bro.', 'Down 90 percent. This is just a dip. Told Dolores. Dolores laughed.', 'My podcast has 0 listeners. The dead cannot hear it. I am calling that "exclusive".'],
    dolores: ['Rearranged the doilies. The landlord moved them back. We have a situation.', 'Forty years ago this house ran on a handshake and one lamp. Now there is a ledger. Progress.', 'You are doing well, young landlord. I will deny saying that in any court, living or dead.'],
    landlord: ['Sent an invoice. It was addressed to the house. The house paid it.', "Raised everyone's rent. Nobody noticed. Raised it again. Still nobody.", 'There is a landlord above me too. We do not talk about them. They send very polite letters.'],
  };

  // ---------- Ghost-hunter minigame: ghosts to tap before they vanish (seconds). ----------
  D.HUNT = { n: 8, gap: 0.9, life: 1.7, calmN: 6, calmGap: 1.4, calmLife: 3.6, winShare: 0.7 };

  // ---------- Day / night (local clock hours) ----------
  D.NIGHT = { from: 19, to: 6, rent: 1.1, click: 1.1 };

  D.GMAP = {};
  D.GHOSTS.forEach((g) => { D.GMAP[g.id] = g; });
  D.RMAP = {};
  D.ROOMS.forEach((r) => { D.RMAP[r.id] = r; });
  D.CHMAP = {};
  D.CHALLENGES.forEach((c) => { D.CHMAP[c.id] = c; });
  D.TMAP = {};
  D.TREE.forEach((n) => { D.TMAP[n.id] = n; });
  D.CHMAP = {};
  D.CHALLENGES.forEach((c) => { D.CHMAP[c.id] = c; });
  D.TMAP = {};
  D.TREE.forEach((n) => { D.TMAP[n.id] = n; });
  D.UMAP = {};
  D.UPGRADES.forEach((u) => { D.UMAP[u.id] = u; });

  root.HLData = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
