# Haunted Landlord

Browser idle game (plan: `haunted_landlord_plan_v2.pdf`). The game is plain HTML/CSS/JS in `game/`;
`main.js` wraps it in an Electron window for desktop testing. For the web, deploy the `game/` folder as-is.

## Run
- Desktop test app: `npm start`
- Pacing simulation: `npm run sim` (prints how long a bot takes to reach Exorcism milestones)
- Browser: serve `game/` with any static server and open `index.html` (homepage; Idle game is `idle.html`) (add `?dev=1` for test tools)

## Layout
- `game/data.js`   content and tuning constants (ghosts, rooms, upgrades, achievements, ESS_DIV pacing knob)
- `game/engine.js` rules and saves, no DOM (also runs in Node)
- `game/ui.js`     rendering and input
- `game/audio.js`, `game/share.js`  synthesized sound, share-card canvas

## Test tools
Settings > Test tools (shown when `?dev=1`, always on in the desktop build): add rent, skip an hour away,
trigger incidents, spawn Midnight Mabel, unlock the cellar. `window.HL.g` is the game object in DevTools (Alt > View).

## Placeholders
- Community meter and "ghosts summoned worldwide" are simulated until a server exists.
- Share card link (`CONST.SHARE_URL` in data.js) is a placeholder.
