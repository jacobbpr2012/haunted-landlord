# Simulator Mode - design plan

Draft, based on the user's brief. Nothing here is built yet.

## Pitch
Same haunted world as Idle, but you run the hotel by hand, one day at a time. Start alone at the front desk, then grow into a staffed hotel, then a multi-property company. Tone stays funny-spooky, dry, never gory.

## Core loop (one day)
1. **Morning plan** - see arrivals, room status, cash, today's events. Assign guests to rooms, set the nightly rate, pick maintenance jobs.
2. **Shift** - guests check in and things happen: complaints, requests, special guests. Each is a small decision card you resolve yourself (solo stage) or delegate (staffed stages).
3. **Night summary** - income, expenses, reputation change, notable events, then a ledger line. Save happens here.

Pacing: discrete day turns, no real-time pressure. A day takes 1-3 minutes.

## Systems
- **Rooms and guests** - rooms have a type (standard, suite, haunted, cellar) and condition. Guests have preferences (quiet, spooky, cheap) that make a room a good or bad match. Matching drives satisfaction.
- **Complaints** - short cards with 2-3 responses (comp the room, fix it, blame the ghost). Each trades cash, satisfaction and reputation. Solo stage: you handle all of them.
- **Special guests (story/puzzle)** - rarer guests with their own multi-day arc. A puzzle is a clue chain: notice details in their requests and room, then choose the right fix. Solving unlocks Codex entries, cash, or a permanent hotel perk. Failing never ends the game, it just closes the story with a worse outcome.
- **Books** - ledger with revenue, wages, upkeep, supplies, taxes, loan interest. Profit and cash-on-hand are separate; running out of cash triggers a bail-out event rather than game over (a loan, with a cost).
- **Reputation** - affects who shows up and at what rate. Spooky reputation and comfort reputation are separate axes, so players can specialise.
- **Upgrades** - room renovations, lobby, kitchen, security, spook budget (paid hauntings guests enjoy).

## Growth ladder
| Stage | Unlock | New mechanic |
|---|---|---|
| 1. Solo desk | Start | You do everything: check-ins, complaints, cleaning choices. Day ends when you finish. |
| 2. First staff | Cash and rep target | Hire housekeeper and bellhop. Wages appear in the books. Staff auto-handle simple complaints, with a quality stat. |
| 3. Departments | More rooms | Front desk lead, kitchen, maintenance, security. Staff have traits, morale, and can quit or have their own events. |
| 4. General Manager | Hotel size target | GM handles routine days automatically; you only see escalations and the monthly report. GM skill affects results. |
| 5. Expansion | Profit target | Buy a second property (different theme and starting problems). Each property has its own GM and books. |
| 6. Group | Several properties | Regional manager, shared marketing, group-level ledger, acquisitions of rundown places. |

## Link to Idle
- Shared Codex: ghosts discovered in either mode show in both.
- Separate save, currency and progress, so neither economy breaks the other.
- Possible later bridge: small cosmetic or Essence-style gifts when you hit milestones in the other mode. Not part of v1.

## Build plan
1. **Engine** (`game/sim/engine.js`, no DOM, runs in Node like the Idle engine): state, day loop, rooms, guests, complaint cards, books, save/load under key `haunted_landlord_sim_save`.
2. **Content data** (`game/sim/data.js`): guest types, complaint cards, first 3 special-guest stories, room and upgrade lists.
3. **UI** (`game/sim.html`, `sim.css`, `sim.js`): morning plan screen, shift cards, night summary, ledger tab. Reuse the Idle theme variables (and the hotel front-desk look when picked).
4. **Vertical slice**: stage 1 and 2 only, one hotel, ~6 rooms, ~10 guest types, ~25 complaint cards, 3 stories, a 14-day run. Enable the homepage button.
5. **Balance bot** (`tools/simsim.js`): simulates days with a simple policy to check cash curve.
6. **Later stages**: departments, GM, second property, group layer, more stories.

## Open questions
- Hotel front-desk visual theme: which of the 10 options (applies to both modes or Simulator only)?
- Should stage 1 have a hard day limit (score run) or be open-ended from day one?
- How many special-guest stories before launch (3 suggested)?
