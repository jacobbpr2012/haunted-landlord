// Simulator Mode content and tuning. No DOM access.
(function (root) {
  'use strict';
  const D = {};

  D.CONST = {
    SAVE_KEY: 'haunted_landlord_sim_save', START_CASH: 400, UPKEEP: 8, INTEREST: 0.03, TAX: 0.05,
    REPAIR_COST: 0.6, STAGE2_REVENUE: 1500, REVIEW_DAY: 14, MAX_ARRIVALS: 8, MAX_CARDS: 4,
    // Room renovation levels: cost is room base rent x LEVEL_COST[lvl]; income x LEVEL_MULT[lvl]; upkeep +50% per level.
    LEVEL_COST: [6, 14, 30], LEVEL_MULT: [1, 1.25, 1.5, 1.8], UPKEEP_LEVEL: 0.5,
    STAGE7_GROUP_REVENUE: 8000000, REFERRAL_SAT: 60, REFERRAL_Q: 3, STAGE6_GROUP_REVENUE: 1000000, LEGACY_DIV: 50000, LEGACY_INCOME: 0.05, LEGACY_CASH: 300,
    STAGE5_GROUP_REVENUE: 60000, ACQ_MAX: 6, OFFER_DAYS: 10, ACQ_PRICE: 40,
    STAGE4_REVENUE: 50000, BRANCH_UPKEEP: 15, BRANCH_TAX: 0.05, RENO_COST: [0.12, 0.25, 0.5],
    STAGE3_REVENUE: 15000, STAGE3_ROOMS: 5, CHEF_MULT: 1.08, MAINT_DECAY: 0.6,
    AD_COST: 100, EVENT_CHANCE: 0.3, REP_DRIFT: 0.03, GIFT_PER_GUEST: 12, LOUNGE_MULT: 1.12,
    RATES: [{ id: 0.8, label: 'Budget', note: 'x0.8 rent, more arrivals' }, { id: 1, label: 'Standard', note: 'x1 rent' }, { id: 1.3, label: 'Premium', note: 'x1.3 rent, fewer arrivals' }],
  };

  D.HOTEL_NAMES = ['The Last Vacancy', 'The Creaky Arms', 'Hotel Eternal Rest', 'The Dead End Inn', 'Casa Cobweb', 'The Fading Lantern'];

  D.ROOMS = [
    { id: 'r1', name: 'Room 1', type: 'standard', base: 60, start: true },
    { id: 'r2', name: 'Room 2', type: 'standard', base: 60, start: true },
    { id: 'r3', name: 'Room 3', type: 'standard', base: 60, cost: 250 },
    { id: 'r4', name: 'Honeymoon Suite', type: 'suite', base: 130, cost: 700 },
    { id: 'r13', name: 'Room 13', type: 'haunted', base: 90, cost: 500 },
    { id: 'cellar', name: 'Cellar Nook', type: 'cellar', base: 45, cost: 350 },
    { id: 'attic', name: 'Attic Room', type: 'haunted', base: 110, cost: 1200 },
    { id: 'penthouse', name: 'Penthouse Suite', type: 'suite', base: 220, cost: 1800 },
  ];
  D.RMAP = {}; D.ROOMS.forEach((r) => { D.RMAP[r.id] = r; });
  D.TYPE_LABEL = { standard: 'Standard', suite: 'Suite', haunted: 'Haunted', cellar: 'Cellar' };

  // How well a room type suits what a guest wants (0..1).
  D.MATCH = {
    spooky: { haunted: 1, cellar: 0.8, standard: 0.3, suite: 0.4 },
    quiet: { suite: 1, standard: 0.7, cellar: 0.5, haunted: 0.1 },
    cheap: { standard: 1, cellar: 0.8, suite: 0.4, haunted: 0.5 },
    luxury: { suite: 1, standard: 0.4, haunted: 0.5, cellar: 0.2 },
  };
  D.WANT_TEXT = { spooky: 'Wants a good scare', quiet: 'Wants peace and quiet', cheap: 'Counting every coin', luxury: 'Wants the good stuff' };

  // gate: min reputation to show up. pay: rent multiplier. cheap: refuses premium rates.
  D.GUESTS = [
    { id: 'weary', name: 'Weary Traveller', want: 'quiet', nights: [1, 3], weight: 3, pay: 1 },
    { id: 'tourist', name: 'Ghost Tourist', want: 'spooky', nights: [1, 3], weight: 3, pay: 1 },
    { id: 'salesman', name: 'Salesman Spectre', want: 'cheap', nights: [1, 2], weight: 3, pay: 1, cheap: true },
    { id: 'skeleton', name: 'Skeleton Backpacker', want: 'cheap', nights: [2, 4], weight: 2, pay: 1, cheap: true },
    { id: 'pensioner', name: 'Poltergeist Pensioner', want: 'quiet', nights: [2, 4], weight: 2, pay: 1 },
    { id: 'vampire', name: 'Vampire on a Budget', want: 'cheap', nights: [1, 2], weight: 2, pay: 1, cheap: true },
    { id: 'mummies', name: 'Mummy Tour Group', want: 'cheap', nights: [1, 2], weight: 1, pay: 1.2, cheap: true, gate: { comfort: 10 } },
    { id: 'hunter', name: 'Ghost Hunter', want: 'spooky', nights: [1, 3], weight: 2, pay: 1.1, gate: { spook: 15 } },
    { id: 'banshees', name: 'Honeymoon Banshees', want: 'luxury', nights: [2, 3], weight: 2, pay: 1.3, gate: { comfort: 25 } },
    { id: 'influencer', name: 'Influencer Wraith', want: 'luxury', nights: [1, 2], weight: 1, pay: 1.2, gate: { comfort: 20, spook: 30 }, spookBonus: 1.5 },
  ];
  // Branch guests: they only show up once you own their home property ('acq' means any rundown hotel). A happy stay (referral)
  // lifts that property's quality. Franchise guests need stage 7 franchises.
  D.GUESTS.push(
    { id: 'sailor', name: 'Captain\'s Crew', want: 'spooky', nights: [2, 4], weight: 2, pay: 1.25, home: 'seaside', tag: 'Seaside Inn' },
    { id: 'gentry', name: 'Cursed Gentry', want: 'luxury', nights: [2, 3], weight: 2, pay: 1.4, home: 'manor', tag: 'Cursed Manor' },
    { id: 'skibunny', name: 'Ski Bunny Spectre', want: 'quiet', nights: [1, 3], weight: 2, pay: 1.3, home: 'lodge', tag: 'Frostbite Lodge' },
    { id: 'regular', name: 'Rundown Regular', want: 'cheap', nights: [1, 3], weight: 2, pay: 1.1, cheap: true, home: 'acq', tag: 'your rundown hotels' },
    { id: 'gondolier', name: 'Gondolier Ghost', want: 'luxury', nights: [2, 3], weight: 1, pay: 1.6, home: 'venice', tag: 'Palazzo Fantasma' },
    { id: 'count', name: 'Visiting Count', want: 'spooky', nights: [2, 4], weight: 1, pay: 1.7, home: 'carpathia', tag: 'Castle Carpathia' },
    { id: 'salaryman', name: 'Salaryman Yurei', want: 'cheap', nights: [1, 2], weight: 1, pay: 1.5, cheap: true, home: 'tokyo', tag: 'Yurei Capsule Tower' },
    { id: 'buccaneer', name: 'Triangle Buccaneer', want: 'quiet', nights: [2, 4], weight: 1, pay: 1.8, home: 'triangle', tag: 'Triangle Resort' },
  );
  D.GMAP = {}; D.GUESTS.forEach((g) => { D.GMAP[g.id] = g; });

  // Complaint cards. Options: [label, cash, satisfaction, comfort rep, spook rep]. Option 1 is the "sensible fix" staff use.
  const c = (id, text, ...opts) => ({ id, text, opts: opts.map((o) => ({ t: o[0], cash: o[1], sat: o[2], comfort: o[3], spook: o[4] })) });
  D.COMPLAINTS = [
    c('bed', '"The mattress feels like a pile of old coat hangers."', ['Call it character', 0, -8, -1, 0], ['Swap the mattress', -30, 12, 1, 0], ['Comp the night', -70, 20, 1, 0]),
    c('noise', '"Someone is rattling chains above me. All night."', ['Knock on the ceiling', 0, -4, 0, 0], ['Politely ask the chain rattler to stop', -10, 10, 1, 0], ['Offer earplugs and a free breakfast', -40, 16, 1, 0]),
    c('cold', '"It is freezing. I can see my own breath, and I do not breathe."', ['Suggest a jumper', 0, -6, -1, 0], ['Send up a heater', -25, 12, 1, 0], ['Move them to a warmer room', -50, 18, 1, 0]),
    c('living', '"There is a living person in the corridor. Is that allowed?"', ['Charge him rent', 40, -10, -2, 0], ['Escort him out kindly', 0, 8, 1, 0], ['Give him a free drink for the trouble', -15, 14, 1, 1]),
    c('wifi', '"The wifi password does not work. It just says BOO."', ['Tell them that is the password', 0, -5, -1, 1], ['Write down a better one', 0, 9, 1, 0], ['Send a technician, who is also a ghost', -35, 15, 1, 1]),
    c('mirror', '"My mirror has no reflection. Is it broken?"', ['Remind them of their situation', 0, -10, -2, 0], ['Replace it with a mirror that works on ghosts', -30, 14, 1, 1], ['Hang a nicer portrait instead', -15, 10, 1, 0]),
    c('towels', '"These towels are damp and smell of the swamp."', ['Say the swamp is a feature', 0, -8, -1, 1], ['Fresh towels', -12, 11, 1, 0], ['Fresh towels and a luxury soap', -35, 17, 2, 0]),
    c('scare', '"Nothing scared me. I paid for a haunted stay."', ['Shrug', 0, -9, -1, -1], ['Have the cellar ghost knock once', -10, 12, 0, 2], ['Full haunting package', -45, 20, 0, 3]),
    c('scare2', '"Something scared me. I paid for a quiet stay."', ['Tell them to relax', 0, -8, -2, 0], ['Apologise and move the ghost along', -10, 11, 1, 0], ['Free spa voucher', -40, 18, 2, -1]),
    c('bill', '"The bill is higher than quoted."', ['Point to the fine print', 20, -12, -2, 0], ['Check the books and fix any error', -20, 10, 1, 0], ['Waive the extra charge', -45, 17, 1, 0]),
    c('breakfast', '"Breakfast was cold and the eggs looked at me."', ['Say they are free range', 0, -7, -1, 1], ['Replace the eggs', -15, 11, 1, 0], ['Free dinner as an apology', -40, 18, 1, 0]),
    c('door', '"My door will not stay shut. It keeps swinging open."', ['Wedge it with a book', 0, 2, 0, 0], ['Oil the hinges', -15, 11, 1, 0], ['Replace the door', -50, 16, 1, 0]),
    c('crying', '"There is crying in the wall. I cannot sleep."', ['Turn up the radio', 0, -3, 0, 0], ['Have a word with the wall', -5, 9, 1, 1], ['Bring in a professional comforter', -40, 16, 1, 2]),
    c('smell', '"My room smells like old pennies and regret."', ['Light a candle', -2, 4, 0, 0], ['Air the room and spray', -20, 12, 1, 0], ['Deep clean overnight', -45, 17, 2, 0]),
    c('tv', '"The television only shows static, and the static is whispering."', ['Switch it off', 0, -2, 0, 1], ['Swap in a new set', -30, 12, 1, 0], ['Leave it, they love it', 0, 6, 0, 2]),
    c('key', '"I locked my key inside. I walk through walls. I just wanted to be asked."', ['Roll your eyes', 0, -6, -1, 0], ['Apologise and offer a nicer key', -5, 8, 1, 0], ['Free drink at the bar', -15, 14, 1, 0]),
    c('view', '"The view from my window is a brick wall."', ['It is a historic wall', 0, -6, -1, 0], ['Offer a room change tomorrow', -10, 9, 1, 0], ['Paint a lovely mural on it', -35, 15, 2, 0]),
    c('pest', '"There is a spider in my room, and it is wearing a tiny hat."', ['Leave the spider, it pays rent too', 0, 3, 0, 1], ['Relocate it gently', -5, 10, 1, 0], ['Call the exterminator, who is also a spider', -40, 12, 0, 1]),
    c('late', '"Check-in took forever. I died waiting. Again."', ['Sigh and move on', 0, -9, -2, 0], ['Offer a quick apology and a drink', -12, 11, 1, 0], ['Comp part of the stay', -50, 18, 1, 0]),
    c('pet', '"My room has been scratched up. Did the last guest have a pet?"', ['Charge a cleaning fee', 25, -10, -2, 0], ['Patch up and say sorry', -18, 10, 1, 0], ['Upgrade them to a better room', -55, 18, 1, 0]),
    c('music', '"The ghost band next door will not stop practicing."', ['Tell them to deal with it', 0, -6, -1, 0], ['Set quiet hours for the band', -8, 11, 1, 1], ['Give both sides free earplugs and cake', -35, 16, 1, 1]),
    c('dust', '"There is dust everywhere. I am literally part dust."', ['Say that is relatable', 0, -4, -1, 0], ['Run the vacuum', -10, 10, 1, 0], ['Full room turn-down', -30, 15, 1, 0]),
  ];
  D.CMAP = {}; D.COMPLAINTS.forEach((x) => { D.CMAP[x.id] = x; });

  // Special guests: each is a 3-day story. Step options: ok = the right call.
  const st = (text, ...o) => ({ text, opts: o.map((x) => ({ t: x[0], ok: !!x[1], note: x[2] })) });
  D.STORIES = [
    {
      id: 'harlow', title: 'The man in Room 4B', guest: 'Mr. Harlow', unlockDay: 3,
      perk: 'harlow', perkText: 'Mr. Harlow tells his friends: one extra arrival most days.',
      steps: [
        st('A pale man in a 1920s suit insists he has a room booked: 4B. There is no 4B. He keeps checking a stopped pocket watch.',
          ['Tell him there is no 4B', 0, 'He gets upset and flickers.'], ['Ask what he remembers about that night', 1, 'He mentions a dance hall and a woman named Edith.'], ['Hand him any key', 0, 'He stares at it blankly.']),
        st('Mr. Harlow returns. The watch reads 9:40. He says he is late, and keeps glancing at an old invitation: "Ballroom Dance, 9:45 sharp."',
          ['Tell him it is very late', 0, 'He sighs and says Edith will be so cross.'], ['Remind him the dance is at 9:45 and the watch has stopped', 1, 'He looks at the watch for a long time.'], ['Offer a room for the night', 0, 'He does not want a room.']),
        st('He is ready to leave but does not know how. The old dance hall closed years ago. A cab driver waits outside, a ghost too.',
          ['Call an exorcist', 0, 'He vanishes in a puff of offence.'], ['Send him off in the cab to the dance hall', 1, 'The cab drives into the fog. Somewhere, music.'], ['Charge him a late checkout fee', 0, 'He pays, but not happily.']),
      ],
      endings: { good: 'Mr. Harlow found Edith. A thank-you note slides under the door, and word spreads.', ok: 'Mr. Harlow drifted off, still half lost. He left a small tip.', bad: 'Mr. Harlow faded out confused. Nobody learned what he wanted.' },
    },
    {
      id: 'bride', title: 'The silent bride', guest: 'Beatrice', unlockDay: 7,
      perk: 'bride', perkText: 'Beatrice blesses the Honeymoon Suite: suite income +15%.',
      steps: [
        st('Guests keep reporting a crying woman in a wedding dress pacing the corridor. She never speaks. She always walks toward the Honeymoon Suite.',
          ['Ask the guests to ignore her', 0, 'The complaints keep coming.'], ['Follow her quietly and see where she stops', 1, 'She stops at the fireplace, touching the same brick.'], ['Lock the corridor at night', 0, 'She walks through the door.']),
        st('You stand beside the fireplace. One brick looks loose and slightly warm. Beatrice presses her hands to her face.',
          ['Tell her the fireplace is under renovation', 0, 'She wails softly.'], ['Carefully pull out the loose brick', 1, 'Behind it: a small velvet box.'], ['Seal the fireplace', 0, 'The weeping gets louder.']),
        st('Inside the box is a ring, engraved "B and T, forever". Beatrice looks at it, then at you.',
          ['Keep it, it is hotel property', 0, 'The temperature drops sharply.'], ['Place the ring in her hand', 1, 'She smiles for the first time. The corridor warms up.'], ['Sell it to a collector', 0, 'The chandelier swings angrily.']),
      ],
      endings: { good: 'Beatrice is at peace. A lingering warmth blesses the Honeymoon Suite.', ok: 'Beatrice quietens, mostly. The corridor is calmer, though never fully.', bad: 'Beatrice keeps pacing. The suite gains a reputation, the wrong kind.' },
    },
    {
      id: 'auditor', title: "The auditor's ledger", guest: 'Mr. Pennywhistle', unlockDay: 11,
      perk: 'auditor', perkText: 'Mr. Pennywhistle tidies the books: upkeep and interest -10%.',
      steps: [
        st('A grey man with a grey briefcase arrives. "I am here to audit the books. Something is off by 40 coins." He opens his ledger and starts reading lines aloud.',
          ['Hide the books', 0, 'He frowns and writes something down.'], ['Ask him which night the numbers stop adding up', 1, '"The night of the lumpy mattress complaint," he says.'], ['Offer him a bribe', 0, 'He is deeply insulted.']),
        st('He points at a line: "Mattress, minus 30". The matching receipt says 70. "One of these is wrong," he says.',
          ['Say the receipt is wrong', 0, 'He checks. It is not wrong.'], ['Explain: 70 was the comped night, 30 was the new mattress. Show both lines', 1, 'He nods slowly. The 40 is accounted for.'], ['Say it is ghost maths', 0, 'He is not amused.']),
        st('The books balance. He asks you to sign off on the audit, and mentions that your comp tracking could be tidier.',
          ['Refuse to sign', 0, 'He stays one more night out of principle.'], ['Sign, and ask for his advice on tracking comps', 1, 'He scribbles a tidy template and slides it over.'], ['Sign without reading', 0, 'The template he left is never used.']),
      ],
      endings: { good: 'Mr. Pennywhistle leaves a ledger template. Costs fall, books look healthy.', ok: 'The audit passes, barely. A small refund arrives.', bad: 'The audit fails. Fees follow, and fines.' },
    },
  ];

  // Property stories: unlock when you own the property (prop) or enough rundown hotels (acq).
  D.STORIES.push(
    {
      id: 'barnacle', title: 'The captain of the lobby', guest: 'Captain Barnacle', prop: 'seaside',
      perk: 'barnacle', perkText: 'Captain Barnacle charts a course for guests: Shipwreck Seaside Inn income +15%.',
      steps: [
        st('A salt-soaked captain paces the lobby of the Seaside Inn at 3am, muttering about a lost heading. Guests say the floor sways.',
          ['Tell him this is a hotel, not a ship', 0, 'He glares and the floor lurches.'], ['Ask which heading he lost, and where', 1, '"North-by-northwest, from Gull Point," he growls.'], ['Offer him a drink', 0, 'The glass slides off the desk.']),
        st('Behind the front desk you find an old brass compass with a spinning needle. The captain stares at it hungrily.',
          ['Hand it over as it is', 0, 'The needle spins faster, and he cannot read it.'], ['Set the needle to north-by-northwest, then hand it over', 1, 'The needle settles. His eyes go wet.'], ['Lock it in the safe', 0, 'The lobby creaks angrily.']),
        st('With the compass steady, the captain stares at the dark sea. A lighthouse beam sweeps across the lobby.',
          ['Tell him to wait for morning', 0, 'He shakes his head, unconvinced.'], ['Point him to the lighthouse at Gull Point', 1, 'He salutes and walks out into the fog.'], ['Close the curtains', 0, 'He stays, miserable.']),
      ],
      endings: { good: 'Captain Barnacle sails on. The inn has never felt so steady.', ok: 'Captain Barnacle drifts off, mostly content, and leaves a small tip.', bad: 'The captain keeps pacing. The inn gets a reputation for seasickness.' },
    },
    {
      id: 'ravenscroft', title: 'The portraits turn to the wall', guest: 'Lady Ravenscroft', prop: 'manor',
      perk: 'ravenscroft', perkText: 'Lady Ravenscroft calms the house: Cursed Manor sends half as many escalations.',
      steps: [
        st('A pale lady in the Manor ballroom keeps turning the portraits to face the wall. Every night, the youngest child first.',
          ['Turn them all back', 0, 'They are turned again by morning.'], ['Ask why she turns that portrait away', 1, '"The child is not in the picture. She is in the nursery," she whispers.'], ['Lock the ballroom', 0, 'She walks through the doors.']),
        st('In the nursery stands a locked toy chest. A small key hangs on a ribbon around the portrait frame.',
          ['Force the chest open', 0, 'The lid will not budge, and the room turns icy.'], ['Use the ribbon key on the chest', 1, 'The lock clicks softly.'], ['Throw the chest out', 0, 'It is back in the nursery by dawn.']),
        st('Inside is a child drawing: a family under a tree, and a note: "Mama, come home." Lady Ravenscroft weeps.',
          ['Burn it, it is upsetting', 0, 'The ash rises into a scream.'], ['Hang the drawing beside her portrait', 1, 'The portraits quietly turn back to face the room.'], ['Sell it as folk art', 0, 'The chandeliers swing.']),
      ],
      endings: { good: 'Lady Ravenscroft rests. The Manor has never been quieter.', ok: 'The portraits mostly stay put. The Manor stays restless.', bad: 'All the portraits face the wall. The Manor gets worse.' },
    },
    {
      id: 'gunnar', title: 'The last run', guest: 'Gunnar the Skier', prop: 'lodge',
      perk: 'gunnar', perkText: 'Gunnar clears the slopes: Frostbite Lodge never dips in its off-season.',
      steps: [
        st('A skier in neon 1980s gear keeps arriving at the Lodge slope door, soaked, asking if the lift is still running. He has no pass.',
          ['Say the lift is closed', 0, 'He nods sadly and comes back an hour later.'], ['Ask which run he was on', 1, '"Black Diamond Six. The last run of the day," he says.'], ['Sell him a new pass', 0, 'He cannot hold it.']),
        st('A faded trail map shows Black Diamond Six with a red flag halfway down. A single old ski is wedged against the pole.',
          ['Leave the ski where it is', 0, 'He stares at it, helpless.'], ['Retrieve the ski and bring it to him', 1, 'He clutches it like an old friend.'], ['Mount the ski on the bar wall', 0, 'He lingers beneath it, miserable.']),
        st('With his ski back, Gunnar looks at the mountain. The lift hums, though it has been dead for decades.',
          ['Switch the lift off', 0, 'He freezes in place.'], ['Ride the lift up with him and wave him off', 1, 'He whoops all the way down into the white.'], ['Say the weather is too rough', 0, 'He waits at the door, forlorn.']),
      ],
      endings: { good: 'Gunnar finally finishes his run. The Lodge is warm in every season.', ok: 'Gunnar fades out on the slope. The Lodge stays seasonal.', bad: 'Gunnar is still asking about the lift. The Lodge gets colder.' },
    },
    {
      id: 'porter', title: 'The night porter and the book', guest: 'The Night Porter', acq: 1,
      perk: 'porter', perkText: 'The Night Porter vouches for you: rundown hotels gain 5 occupancy points.',
      steps: [
        st('At your first rundown hotel, the ghostly night porter will not let anyone in until they sign the Book. The Book is blank.',
          ['Sign it for them', 0, 'The pen turns to ice.'], ['Ask what the Book is for', 1, '"To record who holds the last room," he says.'], ['Take the Book away', 0, 'He stands stiff until you return it.']),
        st('The last page has a faded entry: "Room 9, one night, paid in advance, never collected."',
          ['Strike it out', 0, 'The ink returns.'], ['Open room nine', 1, 'Dust, a bed and a small suitcase.'], ['Ignore it', 0, 'The porter sighs.']),
        st('The suitcase holds a letter addressed to the porter himself. His hands tremble.',
          ['Read it aloud', 0, 'He recoils.'], ['Give it to him unopened and leave him alone', 1, 'He reads for a long time, then nods at you.'], ['Lock the room again', 0, 'The porter vanishes sulking.']),
      ],
      endings: { good: 'The porter hands over the Book. Guests arrive smoothly at every rundown hotel.', ok: 'The porter relaxes a little. A small tip is left in the Book.', bad: 'The porter turns people away for weeks.' },
    },
    {
      id: 'zelda', title: 'The crystal ball', guest: 'Madame Zelda', acq: 3,
      perk: 'zelda', perkText: 'Madame Zelda reads the market: marketing campaigns last 5 days longer.',
      steps: [
        st('Madame Zelda, a fortune teller in one of your hotels, is furious: her crystal ball only shows the day before yesterday.',
          ['Offer her a new ball', 0, 'She throws the old ball at the wall.'], ['Ask what the ball showed the day before yesterday', 1, '"A guest who never checked out," she says.'], ['Tell her she is a fraud', 0, 'The lights go out.']),
        st('The guest from her vision left a hat in lost property. There is a name inside the band.',
          ['Throw the hat out', 0, 'It comes back in the morning.'], ['Read the name and check the register', 1, 'The name is there, in faded pencil.'], ['Try the hat on', 0, 'It is very cold.']),
        st('The register says that guest is still checked in, in the cellar. Zelda\'s ball clears.',
          ['Seal the cellar', 0, 'The ball goes dark again.'], ['Visit the cellar and check on them politely', 1, 'A very old man asks for his bill. You waive it.'], ['Ignore the register', 0, 'Zelda sulks for days.']),
      ],
      endings: { good: 'Madame Zelda reads the market for you. Your ads go further.', ok: 'Zelda is satisfied, mostly, and leaves a small tip.', bad: 'Zelda predicts something unpleasant about your finances.' },
    },
    {
      id: 'lastguest', title: 'The last guest', guest: 'The Last Guest', acq: 5,
      perk: 'lastguest', perkText: 'The Last Guest tips well: +3% income at every property.',
      steps: [
        st('A guest checks in with no name, no face and no luggage. The register just says "Last Guest". The lights dim when they walk by.',
          ['Ask them to leave', 0, 'They stay, patiently.'], ['Ask what they are waiting for', 1, '"A key," they say. "Room 0."'], ['Give them any room', 0, 'They stand at the door, unmoving.']),
        st('There is no Room 0 on any plan. The Last Guest holds out their palm, waiting.',
          ['Say there is no Room 0', 0, 'They keep waiting.'], ['Hand over the spare key from your drawer, labelled 0', 1, 'They close their fingers around it.'], ['Swap it for Room 1', 0, 'The key goes cold.']),
        st('Room 0 is a small door under the stairs. The Last Guest pauses in front of it.',
          ['Lock it behind them', 0, 'It does not hold.'], ['Hold the door and wish them a good night', 1, 'They thank you softly, and the door closes.'], ['Follow them in', 0, 'You are back in the lobby.']),
      ],
      endings: { good: 'The Last Guest settles in. A very generous tip appears on every bill.', ok: 'The Last Guest is quiet. A small tip arrives.', bad: 'The Last Guest keeps asking for a key.' },
    },
  );

  // Stage 7: the final story, unlocked once you reach the Afterlife Empire.
  D.STORIES.push({
    id: 'founder', title: 'The founder of the first hotel', guest: 'The Founder', stage7: true,
    perk: 'founder', perkText: 'The Founder blesses the empire: +8% income at every property and franchise.',
    steps: [
      st('An old man in a faded doorman uniform stands in the lobby at dawn, looking up at the chandelier. "I built the first hotel," he says. "Where did all this come from?"',
        ['Give him the tour and brag', 0, 'He nods politely, but his eyes keep drifting to a corner of the lobby.'], ['Ask what his first hotel looked like', 1, '"Eight rooms and a cracked bell," he says, smiling.'], ['Ask for his autograph', 0, 'He signs it, then looks lonelier.']),
      st('He walks to the front desk and rests a hand on the old bell, the one on your counter. It rings by itself.',
        ['Take the bell away to protect it', 0, 'He flinches. It was his.'], ['Let him ring it, once, for the first guest', 1, 'The bell rings. Somewhere, a very faint cheer.'], ['Tell him to stop touching the furniture', 0, 'The lights go dim.']),
      st('"One more thing," he says. "I never got to close the doors on a good day. Every night I left one open." He nods toward the front door.',
        ['Lock up for him', 0, 'The key will not turn.'], ['Hand him the keys and let him close the doors himself', 1, 'He locks up, nods, and fades into the dawn.'], ['Tell him the hotel never closes', 0, 'He sighs. He knew that already.']),
    ],
    endings: { good: 'The Founder is at rest. Every hotel in the empire feels a little more like home.', ok: 'The Founder fades, content enough, and leaves a tip on the desk.', bad: 'The Founder wanders the lobby. Nobody learned what he was missing.' },
  });

  // Stage 7: franchises abroad (big purchases, run like branches) and the World Brand money sink.
  D.FRANCHISES = [
    { id: 'venice', stage: 7, name: 'Palazzo Fantasma, Venice', cost: 1500000, rooms: 12, rate: 700, trouble: 0.25, text: 'A canal hotel with gondolas that sail themselves. High rates, constant damp.' },
    { id: 'carpathia', stage: 7, name: 'Castle Carpathia, Transylvania', cost: 4000000, rooms: 16, rate: 900, trouble: 0.4, text: 'A vampire resort in the mountains. Rich guests, restless staff.' },
    { id: 'tokyo', stage: 7, name: 'Yurei Capsule Tower, Tokyo', cost: 10000000, rooms: 24, rate: 600, trouble: 0.2, text: 'A capsule tower for ghosts on a schedule. Tiny rooms, enormous throughput.' },
    { id: 'triangle', stage: 7, name: 'Bermuda Triangle Resort', cost: 25000000, rooms: 20, rate: 2200, trouble: 0.5, swing: 20, text: 'Guests vanish and reappear on a 20-day cycle. The rates are scandalous.' },
  ];
  D.WORLD = { cost: 1500000, growth: 1.7, max: 12, income: 0.03, text: 'A world-famous name. Each level adds 3% income at every property and franchise. The price keeps climbing.' };

  // First-play tutorial tips. `until` names the game state that completes a tip (see Sim.tutorialSync); 'manual' tips show a button.
  D.TUTORIAL = [
    { until: 'placed', text: 'Welcome to the front desk. Guests wait in the lobby under Arrivals. Pick one and tap a room to give it to them. Tip: each guest says what they want, and a room that suits them earns a "Great fit".' },
    { until: 'shift', text: 'Nice. Place anyone else you like (anyone left in the lobby walks away at night). Empty rooms earn nothing, so fill as many as you can. When you are ready, ring the bell to open the desk.' },
    { until: 'summary', text: 'Now guests can complain. Each card has options: the middle one is usually the sensible fix, the cheap one is risky, the pricey one is generous. Handle them all, then close the desk.' },
    { until: 'day2', text: 'That is a day: room income minus upkeep, wages and tax is your profit. Read the summary, then start the next day.' },
    { until: 'manual', button: 'Got it, open for business', text: 'Spend profit on the key rack (more rooms and renovations), Upgrades and, later, staff. Special guests bring story days with lasting perks, and the Stories tab tracks them. Keep comfort and spook reputation up and the hotel will grow.' },
  ];

  D.UPGRADES = [
    { id: 'lobby', name: 'Lobby refurb', cost: 600, text: 'Nicer entrance: +1 arrival per day and comfort reputation grows faster.' },
    { id: 'spook', name: 'Spook budget', cost: 500, text: 'Fog machine and flickering lights: haunted and cellar rooms please spooky guests more, and spook reputation grows faster.' },
    { id: 'minibar', name: 'Minibar', cost: 400, text: '+10% income from every room night.' },
    { id: 'soundproof', name: 'Soundproofing', cost: 1000, text: 'Guests complain about 25% less often.' },
    { id: 'gift', name: 'Gift shop', cost: 900, text: 'Every guest who checks out spends $12 on souvenirs.' },
    { id: 'lounge', name: 'Bar and lounge', cost: 1500, text: '+12% income from every room night, and new guests start a little happier.' },
  ];

  // Random daily events. Options: [label, cash, comfort rep, spook rep, room condition change]. Money scales with hotel size.
  const ev = (id, title, text, ...opts) => ({ id, title, text, opts: opts.map((o) => ({ t: o[0], cash: o[1], comfort: o[2], spook: o[3], cond: o[4] })) });
  D.EVENTS = [
    ev('inspector', 'Health inspector', 'A health inspector with a clipboard and no visible pulse is checking your rooms.', ['Distract with free tea', -40, 0, 0, 0], ['Show them around honestly', -20, 2, 0, 0], ['Offer an envelope', -100, -3, 0, 0]),
    ev('critic', 'Food critic', 'A food critic checks in under a false name. You know because the name is "Definitely Not A Critic".', ['Serve the special breakfast', -60, 4, 0, 0], ['Serve the usual breakfast', 0, 0, 0, 0], ['Hide in the cellar', 0, -2, 1, 0]),
    ev('convention', 'Ghost convention', 'The Annual Ghost Convention is in town and the other hotels are full.', ['Raise the rates for a day', 120, -2, 1, 0], ['Hand out welcome drinks', -50, 3, 2, 0], ['Do nothing special', 30, 0, 1, 0]),
    ev('pipes', 'Pipe burst', 'A pipe bursts in the wall. It was already a ghost pipe, so this is complicated.', ['Patch it yourself', -20, -1, 0, -15], ['Call a plumber, who is also a ghost', -80, 0, 0, -3], ['Ignore it', 0, -3, 0, -25]),
    ev('wedding', 'Wedding party', 'A wedding party wants the whole lobby for an hour and promises to be "only slightly haunted".', ['Say yes, with a fee', 90, 1, 1, -5], ['Say yes, for free', 0, 4, 2, -5], ['Say no', 0, -1, 0, 0]),
    ev('storm', 'Thunderstorm', 'A thunderstorm rolls in. The lights flicker, and a few guests clap.', ['Light candles and play along', -20, 1, 3, 0], ['Run the generator', -45, 2, 0, 0], ['Let it be', 0, -1, 1, -6]),
    ev('tourbus', 'Tour bus', 'A tour bus of living tourists pulls up, hoping for photos with a real ghost.', ['Let the Ghost Tourist pose', 70, 0, 3, 0], ['Charge for entry', 110, -2, 1, 0], ['Politely decline', 0, 1, -1, 0]),
    ev('rats', 'Rodent report', 'Several mice have formed a union and are demanding better crumbs.', ['Negotiate', -25, 1, 0, 0], ['Call an exterminator', -70, 0, 0, 0], ['Offer them the cellar', 0, 0, 1, -4]),
  ];
  D.STAFF = [
    { id: 'housekeeper', name: 'Housekeeper', wage: 35, stage: 2, text: 'Restores rooms below 70% condition each night and takes 2 complaints a day.' },
    { id: 'bellhop', name: 'Bellhop', wage: 30, stage: 2, text: 'Takes 2 complaints a day using the sensible fix, at half the cost.' },
    { id: 'desk', name: 'Front desk lead', wage: 60, stage: 3, text: 'Places leftover arrivals in the best-fit free rooms when the desk opens.' },
    { id: 'chef', name: 'Chef', wage: 70, stage: 3, text: 'Dining room: +8% income and new guests start 6% happier.' },
    { id: 'maint', name: 'Maintenance crew', wage: 55, stage: 3, text: 'Fixes rooms below 60% for free and slows wear by 40%.' },
  ];
  // General manager: runs the day for you. Level sets wage, training cost and how well complaints are soothed.
  D.GM = { wage: [150, 200, 260], train: [1500, 3500], sat: [0.8, 0.9, 1], text: 'Opens the desk, places guests, and handles all complaints and daily events with the sensible fix. Special guest stories still need you.' };
  D.LATER_STAGES = [];

  // Staff morale (main hotel staff only). Below LOW staff work worse, below QUIT they leave.
  D.MORALE = { start: 70, decay: 1.5, low: 40, high: 80, quit: 10, partyCost: 120, partyGain: 18, raiseGain: 25, raiseMax: 3, raiseStep: 0.1, branchDecay: 1.2 };
  D.TRAITS = [
    { id: 'cheerful', name: 'Cheerful', text: 'Morale falls 25% slower.' },
    { id: 'driven', name: 'Driven', text: 'Works 10% harder, but morale falls 25% faster.' },
    { id: 'frugal', name: 'Frugal', text: 'Accepts 10% lower wages.' },
  ];

  // Stage 6: landmarks (group-wide perks) and Legacy (retire and restart with a permanent bonus).
  D.LANDMARKS = [
    { id: 'palace', name: 'Grand Ghost Palace', cost: 400000, text: '+10% income at every property.' },
    { id: 'tower', name: 'Haunted Skyscraper', cost: 1000000, text: 'Upkeep and wages are 15% lower everywhere.' },
    { id: 'spire', name: 'The Floating Spire', cost: 2500000, text: 'Branch quality never decays, and +5 occupancy points at branches.' },
  ];

  // Stage 5: group marketing (brand levels and timed campaigns) and acquiring rundown hotels.
  D.BRAND = { cost: [25000, 50000, 100000, 200000, 400000], income: 0.04, occ: 0.03, text: 'Each level adds 4% income at every property and 3 points of occupancy at your branches.' };
  D.CAMPAIGNS = [
    { id: 'tv', name: 'Ghost TV ad', cost: 8000, days: 14, mult: 1.15, text: '+15% income everywhere for 14 days.' },
    { id: 'influencers', name: 'Influencer week', cost: 5000, days: 7, mult: 1.25, text: '+25% income everywhere for 7 days.' },
    { id: 'billboards', name: 'Billboards on every haunted road', cost: 20000, days: 30, mult: 1.12, text: '+12% income everywhere for 30 days.' },
  ];
  D.RUNDOWN = {
    names: ['The Rusty', 'Sunset', 'Old Mill', 'Grimsby', 'Lantern', 'Dusty Gables', 'Moth-Eaten', 'Crooked Chimney'],
    kinds: ['Motel', 'Guesthouse', 'Lodge', 'Hostel', 'Inn'],
    flavor: ['Leaky roof, loyal ghosts.', 'The last owner fled and left a very full guestbook.', 'Great bones, terrible wallpaper.', 'Half the rooms have never been seen by the living.', 'It has a bar, and the bar has a ghost.', 'Cheap for a reason, and the reason is haunting.'],
  };

  // Stage 4: extra properties. Each has its own GM and books, and runs on its own overnight.
  // trouble: daily chance a GM-run branch sends you an escalation (divided by GM level). swing: seasonal period in days.
  D.PROPERTIES = [
    { id: 'seaside', name: 'Shipwreck Seaside Inn', cost: 15000, rooms: 6, rate: 160, trouble: 0.25, upkeepMult: 1.2, text: 'Beachfront, but everything is damp and seagulls are a menace. Upkeep +20%.' },
    { id: 'manor', name: 'Cursed Manor', cost: 40000, rooms: 8, rate: 220, trouble: 0.45, text: 'Grand and restless: the ghosts here cause more escalations than anywhere else.' },
    { id: 'lodge', name: 'Frostbite Lodge', cost: 80000, rooms: 10, rate: 300, trouble: 0.2, swing: 14, text: 'A ski lodge for ghosts. Packed in winter, near empty in summer, on a 14-day cycle.' },
  ];
  D.REGIONAL = { wage: 250, text: 'Resolves every branch escalation with the sensible fix and lifts branch occupancy by 5 points. Group-level wage.' };
  // Branch escalations. Options: [label, cash, branch quality, comfort rep]. Option 1 is the sensible fix the regional manager uses. {p} = property name.
  const be = (id, title, text, ...opts) => ({ id, title, text, opts: opts.map((o) => ({ t: o[0], cash: o[1], q: o[2], comfort: o[3] })) });
  D.BRANCH_EVENTS = [
    be('boiler', 'Boiler failure', 'The boiler at {p} has died, and the guests are cold, even by ghost standards.', ['Patch it and hope', -60, -6, -1], ['Replace the boiler', -240, 6, 1], ['Full heating overhaul', -520, 12, 1]),
    be('reviews', 'Review bomb', 'A grumpy guest has posted one star reviews about {p}, mostly in all capitals.', ['Ignore it', 0, -8, -2], ['Reply politely and offer a refund', -80, 4, 1], ['Run a special offer week', -220, 8, 2]),
    be('staff', 'Staff dispute', 'Staff at {p} are arguing about who deals with the haunted laundry.', ['Tell them to sort it out', 0, -6, 0], ['Hold a meeting and set a rota', -40, 5, 0], ['Give everyone a bonus', -200, 10, 1]),
    be('inspect', 'Surprise inspection', 'An inspector has turned up at {p} unannounced and is counting the fire exits.', ['Wing it', -30, -4, -1], ['Tidy up fast', -90, 3, 1], ['Hire a consultant', -260, 8, 1]),
    be('party', 'Rowdy ghost party', 'A ghost party at {p} has gone on for three nights and the chandeliers are swinging.', ['Let it run', 40, -5, 0], ['Move it to the ballroom', -60, 4, 1], ['Charge a corkage fee and a cleaning deposit', 160, -1, -1]),
    be('power', 'Power cut', 'The power at {p} is out. The ghosts do not mind, but the living guests do.', ['Hand out candles', -30, -2, 0], ['Run the generator', -150, 4, 1], ['Rent a bigger generator and comp the night', -380, 9, 2]),
  ];

  root.SimData = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
