// Simulator Mode rendering and input. Rebuilds panels on each action (turn-based, no timers).
(function () {
  'use strict';
  const D = window.SimData;
  const K = D.CONST;
  const g = new window.SimEngine.Sim(window.localStorage);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Short form for the big header number so it fits on a phone in wide (monospace) themes.
  const compact = (n) => (Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.round(n).toLocaleString());
  const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();

  const TABS = [['desk', 'Desk'], ['upgrades', 'Upgrades'], ['staff', 'Staff'], ['properties', 'Properties'], ['group', 'Group'], ['books', 'Books'], ['stories', 'Stories'], ['settings', 'Settings']];
  let tab = 'desk';
  let flash = '';   // one-line message shown at top of the desk
  let lastResult = null;

  function header() {
    const S = g.S;
    $('hotelName').textContent = S.hotelName;
    $('cash').textContent = compact(S.cash);
    $('sub').textContent = S.debt ? 'Debt ' + money(S.debt) : 'No debt';
    $('dayChip').textContent = 'Day ' + S.day;
    $('stageChip').textContent = ['', 'Stage 1: Solo desk', 'Stage 2: Staffed hotel', 'Stage 3: Departments', 'Stage 4: Group', 'Stage 5: Hotel group', 'Stage 6: Empire', 'Stage 7: Afterlife Empire'][S.stage] + (S.legacy ? ', Legacy ' + S.legacy : '');
    $('repComfort').style.width = S.comfort + '%';
    $('repSpook').style.width = S.spook + '%';
  }

  function roomsPanel() {
    const S = g.S;
    const canAct = S.phase === 'plan';
    $('rooms').innerHTML = D.ROOMS.map((r) => {
      const rs = S.rooms[r.id];
      if (!rs.owned) {
        return `<div class="sroom locked"><h3>${esc(r.name)} <small>${D.TYPE_LABEL[r.type]}</small></h3><div class="empty">Locked. Earns about ${money(r.base)} a night.</div>` +
          `<button class="btn" data-buyroom="${r.id}" ${canAct && S.cash >= r.cost ? '' : 'disabled'}>Open for ${money(r.cost)}</button></div>`;
      }
      const gst = rs.guest;
      const body = gst
        ? `<div class="guest">${esc(D.GMAP[gst.type].name)}<br><small class="${gst.sat >= 60 ? 'good' : 'bad'}">Mood ${gst.sat}%</small> <small>, ${gst.left} night${gst.left === 1 ? '' : 's'} left</small></div>`
        : '<div class="empty">Vacant</div>';
      const cost = g.repairCost(r.id);
      const rep = canAct && cost > 0 ? `<button class="btn ghosty" data-repair="${r.id}" ${S.cash >= cost ? '' : 'disabled'}>Repair ${money(cost)}</button>` : '';
      const lvl = rs.lvl || 0, lc = g.levelCost(r.id);
      const ren = canAct && lc > 0 ? ` <button class="btn ghosty" data-renovate="${r.id}" ${!gst && S.cash >= lc ? '' : 'disabled'} title="${gst ? 'Room must be empty' : 'Raises rent, raises upkeep'}">Renovate ${money(lc)}</button>` : '';
      return `<div class="sroom"><h3>${esc(r.name)} <small>${D.TYPE_LABEL[r.type]}${lvl ? ' Lv' + lvl : ''}, ${money(Math.round(r.base * K.LEVEL_MULT[lvl]))}</small></h3>${body}` +
        `<div class="bar ${rs.cond < 50 ? 'lowbar' : ''}"><i style="width:${rs.cond}%"></i></div><small>Condition ${rs.cond}%</small> ${rep}${ren}</div>`;
    }).join('');
  }

  function deskPlan() {
    const S = g.S, free = g.freeRooms();
    let h = flash ? `<div class="banner">${esc(flash)}</div>` : '';
    if (S.review) h += `<div class="banner">Day ${K.REVIEW_DAY} review: grade ${S.review.grade}, score ${S.review.score}. Keep going, the hotel never closes.</div>`;
    h += `<p class="note">Day ${S.day}. Pick a rate, then place each arrival in a room. Anyone left in the lobby walks away.</p>`;
    h += '<div class="modes">' + K.RATES.map((r) => `<button class="chip ${S.rate === r.id ? 'on' : ''}" data-rate="${r.id}" title="${esc(r.note)}">${r.label}</button>`).join('') + '</div>';
    h += `<div class="sect">Arrivals (${S.arrivals.length})</div>`;
    h += `<div style="margin:0 0 8px"><button class="btn ghosty" data-act="ad" ${S.adDay !== S.day && S.cash >= K.AD_COST ? '' : 'disabled'}>${S.adDay === S.day ? 'Ad already running today' : 'Run an ad for 2 more guests, ' + money(K.AD_COST)}</button></div>`;
    if (!S.arrivals.length) h += '<p class="note">The lobby is empty.</p>';
    h += S.arrivals.map((a) => {
      const gt = D.GMAP[a.type], refuse = g.refuses(a.type);
      const btns = free.map((r) => {
        const m = g.match(a.type, r.id);
        return `<button class="btn ${m >= 0.5 ? '' : 'alt'}" data-assign="${a.id}:${r.id}" ${refuse ? 'disabled' : ''}>${esc(r.name)}<small>${g.matchLabel(m)}, ${money(g.roomIncome(r.id, { type: a.type }))}/night</small></button>`;
      }).join('');
      return `<div class="arr"><div class="nm">${esc(gt.name)}</div><div class="sub">${gt.home ? 'Regular from ' + esc(gt.tag) + '. ' : ''}${D.WANT_TEXT[gt.want]}. Staying ${a.nights} night${a.nights > 1 ? 's' : ''}.${refuse ? ' Will not pay premium rates.' : ''}</div>` +
        `<div class="rbtns">${btns || '<span class="note">No free rooms.</span>'}<button class="btn ghosty" data-away="${a.id}">Turn away</button></div></div>`;
    }).join('');
    const gm = g.gmActive();
    if (gm) h += '<p class="note">Your General Manager will run the day. You will only be called for special guests.</p>';
    h += `<div style="margin-top:12px"><button class="btn" data-act="open"><span class="bell-ic" aria-hidden="true"></span>${gm ? 'Let the GM run today' : 'Ring the bell, open the desk'}</button></div>`;
    return h;
  }

  function deskShift() {
    const S = g.S, card = g.currentCard();
    let h = `<p class="note">Day ${S.day}, the desk is open. ${g.shiftDone() ? 'No more guests at the desk.' : (S.cards.length - S.cardIdx) + ' to handle.'}</p>`;
    if (lastResult && lastResult.note) {
      h += `<div class="banner ${lastResult.ok ? 'good' : 'bad'}">${esc(lastResult.note)}${lastResult.ending ? '<br>' + esc(lastResult.ending) : ''}${lastResult.perk ? '<br><b>Perk: ' + esc(lastResult.perk) + '</b>' : ''}</div>`;
    }
    if (card && card.kind === 'complaint') {
      const def = D.CMAP[card.def], gst = S.rooms[card.room].guest;
      h += `<div class="scard"><h3>Complaint: ${gst ? esc(D.GMAP[gst.type].name) : 'Guest'}, ${esc(D.RMAP[card.room].name)}</h3><p>${esc(def.text)}</p><div class="opts">` +
        def.opts.map((o, i) => `<button class="btn ${i === 0 ? 'ghosty' : ''}" data-opt="${i}">${esc(o.t)}${o.cash ? ` <small>(${o.cash > 0 ? '+' : '-'}$${Math.abs(o.cash)})</small>` : ''}</button>`).join('') + '</div></div>';
    } else if (card && card.kind === 'event') {
      const def = D.EVENTS.find((x) => x.id === card.event), m = g.costMult();
      h += `<div class="scard"><h3>Today: ${esc(def.title)}</h3><p>${esc(def.text)}</p><div class="opts">` +
        def.opts.map((o, i) => { const c = Math.round(o.cash * m); return `<button class="btn ${i === 0 ? '' : 'ghosty'}" data-opt="${i}">${esc(o.t)}${c ? ` <small>(${c > 0 ? '+' : '-'}$${Math.abs(c)})</small>` : ''}</button>`; }).join('') + '</div></div>';
    } else if (card && card.kind === 'branch') {
      const def = D.BRANCH_EVENTS.find((x) => x.id === card.event), pd = g.propDef(card.prop), m = pd.rooms / 4;
      h += `<div class="scard"><h3>Escalation: ${esc(pd.name)}, ${esc(def.title)}</h3><p>${esc(def.text.replace('{p}', pd.name))}</p><div class="opts">` +
        def.opts.map((o, i) => { const c = Math.round(o.cash * m); return `<button class="btn ${i === 1 ? '' : 'ghosty'}" data-opt="${i}">${esc(o.t)}${c ? ` <small>(${c > 0 ? '+' : '-'}$${Math.abs(c)})</small>` : ''}</button>`; }).join('') + '</div></div>';
    } else if (card && card.kind === 'story') {
      const story = D.STORIES.find((x) => x.id === card.story), step = story.steps[card.step];
      h += `<div class="scard story"><h3>${esc(story.title)}, day ${card.step + 1} of ${story.steps.length}</h3><p>${esc(step.text)}</p><div class="opts">` +
        step.opts.map((o, i) => `<button class="btn ghosty" data-opt="${i}">${esc(o.t)}</button>`).join('') + '</div></div>';
    } else {
      h += '<div style="margin:10px 0"><button class="btn" data-act="close">Close the desk</button></div>';
    }
    if (S.log.length) h += '<div class="sect">Today</div>' + S.log.map((l) => `<div class="logl">${esc(l)}</div>`).join('');
    return h;
  }

  function deskSummary() {
    const L = g.S.last, S = g.S;
    let h = `<div class="sect">End of day ${L.day}</div><table class="tbl">` +
      `<tr><td>Room income</td><td class="good">${money(L.revenue)}</td></tr><tr><td>Upkeep</td><td>${money(-L.upkeep)}</td></tr>` +
      (L.wages ? `<tr><td>Wages</td><td>${money(-L.wages)}</td></tr>` : '') + (L.tax ? `<tr><td>Tax</td><td>${money(-L.tax)}</td></tr>` : '') +
      (L.interest ? `<tr><td>Loan interest</td><td>${money(-L.interest)}</td></tr>` : '') +
      `<tr><td><b>Profit</b></td><td class="${L.profit >= 0 ? 'good' : 'bad'}"><b>${money(L.profit)}</b></td></tr></table>`;
    if (L.bailout) h += `<div class="banner bad">Cash ran out. The bank lent you ${money(L.bailout)}. Repay it in Books.</div>`;
    if (L.branches && L.branches.length) {
      h += '<div class="sect">Other properties</div><table class="tbl"><tr><th>Property</th><th>Occupied</th><th>Profit</th></tr>' + L.branches.map((b) =>
        `<tr><td>${esc(b.name)}${b.nogm ? ' (no GM)' : ' (morale ' + b.morale + '%)'}</td><td>${b.occ}%</td><td class="${b.profit >= 0 ? 'good' : 'bad'}">${money(b.profit)}</td></tr>`).join('') +
        (L.regional ? `<tr><td>Regional manager</td><td></td><td>${money(-L.regional)}</td></tr>` : '') + '</table>';
    }
    if (L.referrals && L.referrals.length) h += '<div class="banner good">' + L.referrals.map(esc).join('<br>') + '</div>';
    if (L.quit && L.quit.length) h += `<div class="banner bad">${esc(L.quit.join(', '))} quit. Keep morale up with raises and staff parties.</div>`;
    if (L.stageUp === 7) h += '<div class="banner">Stage 7 unlocked: the Afterlife Empire. Franchises abroad and the World Brand are in the Group tab.</div>';
    else if (L.stageUp === 6) h += '<div class="banner">Stage 6 unlocked: landmarks and Legacy. See the Group tab.</div>';
    else if (L.stageUp === 5) h += '<div class="banner">Stage 5 unlocked: group marketing and hotels for sale. See the Group tab.</div>';
    else if (L.stageUp === 4) h += '<div class="banner">Stage 4 unlocked: you can buy more properties. See the Properties tab.</div>';
    else if (L.stageUp === 3) h += '<div class="banner">Stage 3 unlocked: departments and a General Manager. See the Staff tab.</div>';
    else if (L.stageUp) h += '<div class="banner">Stage 2 unlocked: you can hire staff now.</div>';
    if (L.week) h += `<div class="banner">Weekly report: income ${money(L.week.revenue)}, costs ${money(L.week.expenses)}, profit <b class="${L.week.profit >= 0 ? 'good' : 'bad'}">${money(L.week.profit)}</b>. Best day ${money(L.week.best)}, worst ${money(L.week.worst)}.</div>`;
    if (L.review) h += `<div class="banner">Day ${K.REVIEW_DAY} review: grade <b>${L.review.grade}</b> (score ${L.review.score}). The hotel stays open, keep growing.</div>`;
    if (L.checkouts.length) h += '<div class="sect">Check-outs</div>' + L.checkouts.map((c) => `<div class="logl">${esc(c.name)} left ${esc(c.room)}: <span class="${c.sat >= 60 ? 'good' : 'bad'}">${c.sat}% happy</span></div>`).join('');
    if (S.log.length) h += '<div class="sect">Log</div>' + S.log.map((l) => `<div class="logl">${esc(l)}</div>`).join('');
    h += '<div style="margin-top:12px"><button class="btn" data-act="next">Start day ' + (S.day + 1) + '</button></div>';
    return h;
  }

  function upgradesTab() {
    const S = g.S;
    return '<p class="note">One-time upgrades. Buy them during the planning phase.</p>' + D.UPGRADES.map((u) =>
      `<div class="row-item ${S.upgrades[u.id] ? 'owned' : ''}"><div class="nm">${esc(u.name)}</div><div class="sub">${esc(u.text)}</div>` +
      `<button class="btn" data-upg="${u.id}" ${S.upgrades[u.id] || S.phase !== 'plan' || S.cash < u.cost ? 'disabled' : ''}>${S.upgrades[u.id] ? 'Owned' : money(u.cost)}</button></div>`).join('');
  }

  function moraleLine(id) {
    const S = g.S;
    if (!S.staff[id] || S.morale[id] === undefined) return '';
    const m = Math.round(S.morale[id]), t = D.TRAITS.find((x) => x.id === S.traits[id]), r = S.raises[id] || 0;
    return `<br><small>Morale <b class="${m < D.MORALE.low ? 'bad' : m >= D.MORALE.high ? 'good' : ''}">${m}%</b>. ${t ? esc(t.name) + ': ' + esc(t.text) : ''} Raises ${r}/${D.MORALE.raiseMax}.</small> ` +
      `<button class="chip" data-raise="${id}" ${r < D.MORALE.raiseMax ? '' : 'disabled'}>Give raise (+10% wage)</button>`;
  }

  function staffTab() {
    const S = g.S;
    if (S.stage < 2) {
      const p = Math.min(100, Math.round(S.stats.revenue / K.STAGE2_REVENUE * 100));
      return `<p class="note">You are running the desk alone. Earn ${money(K.STAGE2_REVENUE)} in total room income to afford staff.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.stats.revenue)} of ${money(K.STAGE2_REVENUE)}</p>`;
    }
    const hired = Object.keys(S.morale).filter((id) => S.staff[id]).length;
    let h = '<p class="note">Staff are paid every night, whether or not the rooms are full. Morale drops a little each day. Below 40% they work worse, and at 10% they quit.</p>';
    if (hired) h += `<div class="row-item"><div class="nm">Staff party</div><div class="sub">+${D.MORALE.partyGain} morale for everyone. Once a day.</div><button class="btn" data-act="party" ${S.partyDay !== S.day && S.phase === 'plan' && S.cash >= g.partyCost() ? '' : 'disabled'}>${money(g.partyCost())}</button></div>`;
    h += D.STAFF.map((s) => {
      const locked = S.stage < s.stage;
      return `<div class="row-item ${locked ? 'owned' : ''}"><div class="nm">${esc(s.name)} <span class="tag Uncommon">${money(S.staff[s.id] ? g.wageOf(s.id) : s.wage)}/day</span></div><div class="sub">${esc(s.text)}${locked ? ' Unlocks at stage ' + s.stage + '.' : ''}${moraleLine(s.id)}</div>` +
        `<button class="btn ${S.staff[s.id] ? 'ghosty' : ''}" data-staff="${s.id}" ${locked ? 'disabled' : ''}>${S.staff[s.id] ? 'Let go' : 'Hire'}</button></div>`;
    }).join('');
    if (S.stage < 3) {
      const p = Math.min(100, Math.round(Math.min(S.stats.revenue / K.STAGE3_REVENUE, 1) * 100));
      h += `<div class="sect">Stage 3: departments</div><p class="note">Earn ${money(K.STAGE3_REVENUE)} in total income and open ${K.STAGE3_ROOMS} rooms to add a front desk lead, chef, maintenance crew and a General Manager.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.stats.revenue)} of ${money(K.STAGE3_REVENUE)}, ${g.ownedRooms().length} of ${K.STAGE3_ROOMS} rooms</p>`;
    } else {
      h += '<div class="sect">General manager</div>';
      if (!S.staff.gm) {
        h += `<div class="row-item"><div class="nm">General Manager <span class="tag Rare">${money(D.GM.wage[0])}/day</span></div><div class="sub">${esc(D.GM.text)} Needs a front desk lead first.</div>` +
          `<button class="btn" data-act="hiregm" ${S.staff.desk ? '' : 'disabled'}>Hire</button></div>`;
      } else {
        const lv = S.gmLvl, tc = D.GM.train[lv - 1];
        h += `<div class="row-item"><div class="nm">General Manager, level ${lv} <span class="tag Rare">${money(g.wageOf('gm'))}/day</span></div><div class="sub">${esc(D.GM.text)} Complaints soothe ${Math.round(D.GM.sat[lv - 1] * 100)}% as well as when you do it. ${S.gmOn ? 'On duty.' : 'Off duty.'}${moraleLine('gm')}</div>` +
          `<button class="btn ${S.gmOn ? 'ghosty' : ''}" data-act="togglegm">${S.gmOn ? 'Take over' : 'Put on duty'}</button></div>`;
        if (tc) h += `<div class="row-item"><div class="nm">Train the GM</div><div class="sub">Level ${lv + 1}: better complaint handling, higher wage (${money(D.GM.wage[lv])}/day).</div><button class="btn" data-act="traingm" ${S.cash >= tc && S.phase === 'plan' ? '' : 'disabled'}>${money(tc)}</button></div>`;
        h += '<button class="btn ghosty" data-staff="gm" style="margin-top:6px">Let the GM go</button>';
      }
    }
    if (D.LATER_STAGES.length) h += '<div class="sect">Later stages</div>' + D.LATER_STAGES.map((n) => `<div class="row-item owned"><div class="nm">${esc(n)}</div><div class="sub">Not built yet.</div></div>`).join('');
    return h;
  }

  function branchMorale(p) {
    if (!p.gm) return '';
    const m = Math.round(p.morale), t = D.TRAITS.find((x) => x.id === p.trait);
    return `<br><small>Manager morale <b class="${m < D.MORALE.low ? 'bad' : m >= D.MORALE.high ? 'good' : ''}">${m}%</b>. ${t ? esc(t.name) + ': ' + esc(t.text) : ''} Raises ${p.raises}/${D.MORALE.raiseMax}. At ${D.MORALE.quit}% they quit.</small>`;
  }

  function propertiesTab() {
    const S = g.S;
    if (S.stage < 4) {
      const p = Math.min(100, Math.round(Math.min(S.stats.revenue / K.STAGE4_REVENUE, 1) * 100));
      return `<p class="note">Once the main hotel runs smoothly you can buy more. Earn ${money(K.STAGE4_REVENUE)} in total income and train your General Manager to level 2.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.stats.revenue)} of ${money(K.STAGE4_REVENUE)}${S.staff.gm && S.gmLvl >= 2 ? '' : ', GM level 2 needed'}</p>`;
    }
    let h = '<p class="note">Each property has its own manager and books, and runs overnight. A property with no manager barely earns. Managers send you escalations unless you have a regional manager.</p>';
    const rm = S.staff.regional;
    h += `<div class="row-item"><div class="nm">Regional manager <span class="tag Rare">${money(D.REGIONAL.wage)}/day</span></div><div class="sub">${esc(D.REGIONAL.text)}${g.ownedProps().length ? '' : ' Buy a property first.'}</div>` +
      `<button class="btn ${rm ? 'ghosty' : ''}" data-act="${rm ? 'firereg' : 'hirereg'}" ${rm || g.ownedProps().length ? '' : 'disabled'}>${rm ? 'Let go' : 'Hire'}</button></div>`;
    D.PROPERTIES.concat(S.acq, S.stage >= 7 ? D.FRANCHISES : []).forEach((d) => {
      const p = g.prop(d.id);
      if (!p.owned) {
        h += `<div class="row-item"><div class="nm">${esc(d.name)} <span class="tag Uncommon">${d.rooms} rooms</span></div><div class="sub">${esc(d.text)}</div>` +
          `<button class="btn" data-buyprop="${d.id}" ${S.phase === 'plan' && S.cash >= d.cost ? '' : 'disabled'}>${money(d.cost)}</button></div>`;
        return;
      }
      const rc = g.propRenoCost(d.id), tc = D.GM.train[p.gmLvl - 1], last = p.last;
      h += `<div class="arr"><div class="nm">${esc(d.name)} <span class="tag Rare">Renovation ${p.lvl}/${K.RENO_COST.length}</span></div>` +
        `<div class="sub">${esc(d.text)}</div><div class="bar ${p.quality < 30 ? 'lowbar' : ''}"><i style="width:${Math.round(p.quality)}%"></i></div>` +
        `<div class="sub">Quality ${Math.round(p.quality)}%. ${last ? 'Last night: ' + last.occ + '% full, profit ' + money(last.profit) + '.' : 'No nights yet.'} ${p.gm ? 'Manager level ' + p.gmLvl + ' (' + money(g.bWage(p)) + '/day).' : 'No manager.'}${branchMorale(p)}</div><div class="rbtns">` +
        (p.gm ? `<button class="btn ghosty" data-pfire="${d.id}">Let manager go</button>` : `<button class="btn" data-pgm="${d.id}">Hire manager</button>`) +
        (p.gm && tc ? `<button class="btn" data-ptrain="${d.id}" ${S.cash >= tc && S.phase === 'plan' ? '' : 'disabled'}>Train ${money(tc)}</button>` : '') +
        (p.gm ? `<button class="chip" data-praise="${d.id}" ${p.raises < D.MORALE.raiseMax ? '' : 'disabled'}>Give raise (+10% wage)</button>` : '') +
        (rc ? `<button class="btn" data-preno="${d.id}" ${S.cash >= rc && S.phase === 'plan' ? '' : 'disabled'}>Renovate ${money(rc)}</button>` : '') + '</div></div>';
    });
    return h;
  }

  function stage7Block() {
    const S = g.S, can = S.phase === 'plan';
    let h = '<div class="sect">Afterlife Empire</div>';
    if (S.stage < 7) {
      const lm = D.LANDMARKS.filter((l) => S.landmarks[l.id]).length, p = Math.min(100, Math.round(Math.min(S.group.revenue / K.STAGE7_GROUP_REVENUE, 1) * 100));
      return h + `<p class="note">Franchises abroad, the World Brand and the Founder's story unlock once you have built all ${D.LANDMARKS.length} landmarks and your branches have earned ${money(K.STAGE7_GROUP_REVENUE)}.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.group.revenue)} of ${money(K.STAGE7_GROUP_REVENUE)}, ${lm} of ${D.LANDMARKS.length} landmarks</p>`;
    }
    const wc = g.worldCost();
    h += `<p class="note">Franchises are bought in the Properties tab. The World Brand adds income everywhere and has no ceiling you will hit soon.</p><div class="row-item"><div class="nm">World Brand, level ${S.world}/${D.WORLD.max}</div><div class="sub">${esc(D.WORLD.text)}</div>` +
      `<button class="btn" data-act="world" ${wc && can && S.cash >= wc ? '' : 'disabled'}>${wc ? money(wc) : 'Maxed'}</button></div>`;
    return h;
  }

  function groupTab() {
    const S = g.S;
    if (S.stage < 5) {
      const p = Math.min(100, Math.round(Math.min(S.group.revenue / K.STAGE5_GROUP_REVENUE, 1) * 100));
      return `<p class="note">Group marketing and acquisitions open once you own 2 properties and they have earned ${money(K.STAGE5_GROUP_REVENUE)} between them.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.group.revenue)} of ${money(K.STAGE5_GROUP_REVENUE)}, ${g.ownedProps().length} of 2 properties</p>`;
    }
    const can = S.phase === 'plan';
    let h = `<p class="note">Marketing lifts income at every property, including the main hotel. Current bonus: x${g.incomeMult().toFixed(2)}.</p><div class="sect">Brand</div>`;
    const bc = D.BRAND.cost[S.brand];
    h += `<div class="row-item"><div class="nm">Hotel group brand, level ${S.brand}/${D.BRAND.cost.length}</div><div class="sub">${esc(D.BRAND.text)}</div>` +
      `<button class="btn" data-act="brand" ${bc && can && S.cash >= bc ? '' : 'disabled'}>${bc ? money(bc) : 'Maxed'}</button></div>`;
    h += '<div class="sect">Campaigns</div>';
    if (S.campaign) h += `<div class="banner">${esc(S.campaign.name)} is running, ${S.campaign.left} day${S.campaign.left === 1 ? '' : 's'} left.</div>`;
    h += D.CAMPAIGNS.map((c) => `<div class="row-item"><div class="nm">${esc(c.name)}</div><div class="sub">${esc(c.text)}</div><button class="btn" data-camp="${c.id}" ${!S.campaign && can && S.cash >= c.cost ? '' : 'disabled'}>${money(c.cost)}</button></div>`).join('');
    h += `<div class="sect">Hotels for sale (${S.acq.length} of ${K.ACQ_MAX} bought)</div><p class="note">New offers every ${K.OFFER_DAYS} days. Rundown hotels start at 15% quality, so they need a manager and renovation before they earn well.</p>`;
    h += S.offers.length ? S.offers.map((o) => `<div class="row-item"><div class="nm">${esc(o.name)} <span class="tag Uncommon">${o.rooms} rooms</span></div><div class="sub">${esc(o.text)} About ${money(o.rate)} a night. Escalation risk ${Math.round(o.trouble * 100)}% a day.</div>` +
      `<button class="btn" data-acq="${o.id}" ${can && S.cash >= o.cost && S.acq.length < K.ACQ_MAX ? '' : 'disabled'}>${money(o.cost)}</button></div>`).join('') : '<p class="note">No offers right now.</p>';
    h += '<div class="sect">Empire</div>';
    if (S.stage < 6) {
      const p = Math.min(100, Math.round(Math.min(S.group.revenue / K.STAGE6_GROUP_REVENUE, 1) * 100));
      return h + `<p class="note">Landmarks and Legacy unlock at brand level ${D.BRAND.cost.length} and ${money(K.STAGE6_GROUP_REVENUE)} in branch income.</p><div class="bar"><i style="width:${p}%"></i></div><p class="note">${money(S.group.revenue)} of ${money(K.STAGE6_GROUP_REVENUE)}, brand ${S.brand} of ${D.BRAND.cost.length}</p>`;
    }
    h += '<p class="note">Landmarks are one-off wonders with group-wide perks.</p>' + D.LANDMARKS.map((l) =>
      `<div class="row-item ${S.landmarks[l.id] ? 'owned' : ''}"><div class="nm">${esc(l.name)}</div><div class="sub">${esc(l.text)}</div><button class="btn" data-land="${l.id}" ${S.landmarks[l.id] || !can || S.cash < l.cost ? 'disabled' : ''}>${S.landmarks[l.id] ? 'Built' : money(l.cost)}</button></div>`).join('');
    const pts = g.legacyPoints();
    h += stage7Block();
    h += `<div class="sect">Legacy</div><div class="row-item"><div class="nm">Retire and start again</div><div class="sub">Sell up and begin a new hotel with permanent Legacy: +${K.LEGACY_INCOME * 100}% income per point, and ${money(K.LEGACY_CASH)} starting cash per point. This run is worth <b>${pts}</b> point${pts === 1 ? '' : 's'}. You have ${S.legacy} (${S.runs} run${S.runs === 1 ? '' : 's'} retired). Everything else resets, but solved guests stay in the shared Codex.</div><button class="btn alt" data-act="retire" ${can && pts >= 1 ? '' : 'disabled'}>Retire</button></div>`;
    return h;
  }

  function booksTab() {
    const S = g.S, st = S.stats;
    let h = '<div class="kv"><span>Cash</span><b>' + money(S.cash) + '</b></div>' +
      '<div class="kv"><span>Debt</span><b>' + money(S.debt) + '</b></div>' +
      '<div class="kv"><span>Daily upkeep</span><b>' + money(g.upkeep()) + '</b></div>' +
      '<div class="kv"><span>Daily wages</span><b>' + money(g.wages()) + '</b></div>' +
      '<div class="kv"><span>Total income</span><b>' + money(st.revenue) + '</b></div>' +
      '<div class="kv"><span>Guests hosted</span><b>' + st.guests + '</b></div>' +
      '<div class="kv"><span>Complaints handled</span><b>' + st.complaints + '</b></div>';
    if (S.stage >= 4) {
      h += '<div class="sect">Group books</div><table class="tbl"><tr><th>Property</th><th>Income</th><th>Costs</th><th>Profit</th></tr>' +
        `<tr><td>Main hotel</td><td>${money(st.revenue)}</td><td>${money(st.expenses)}</td><td>${money(st.revenue - st.expenses)}</td></tr>` +
        g.ownedProps().map((d) => { const p = g.prop(d.id); return `<tr><td>${esc(d.name)}</td><td>${money(p.rev)}</td><td>${money(p.exp)}</td><td>${money(p.rev - p.exp)}</td></tr>`; }).join('') +
        `<tr><td>Group total</td><td>${money(st.revenue + S.group.revenue)}</td><td>${money(st.expenses + S.group.expenses)}</td><td><b>${money(st.revenue + S.group.revenue - st.expenses - S.group.expenses)}</b></td></tr></table>`;
    }
    if (S.debt > 0) h += `<div style="margin:10px 0"><button class="btn alt" data-act="repay" ${S.cash > 0 && S.phase === 'plan' ? '' : 'disabled'}>Repay debt</button></div>`;
    h += '<div class="sect">Recent days</div>';
    h += S.ledger.length ? '<table class="tbl"><tr><th>Day</th><th>Income</th><th>Costs</th><th>Profit</th><th>Cash</th></tr>' + S.ledger.slice(-10).reverse().map((l) =>
      `<tr><td>${l.day}</td><td>${money(l.revenue)}</td><td>${money(l.expenses)}</td><td class="${l.profit >= 0 ? 'good' : 'bad'}">${money(l.profit)}</td><td>${money(l.cash)}</td></tr>`).join('') + '</table>' : '<p class="note">No days closed yet.</p>';
    h += '<div style="margin-top:16px"><button class="btn ghosty" data-act="reset">Reset Simulator save</button></div>';
    return h;
  }

  function storiesTab() {
    const S = g.S;
    const H = window.HLShared, idleB = H ? H.idleIncomeBonus(g.idleCount) : 0;
    return '<p class="note">Special guests arrive with problems of their own. Solving all three days earns a lasting perk. Solved guests also join your Idle Codex for bonus rent' +
      (idleB ? `, and your ${g.idleCount} Idle ghosts add +${(idleB * 100).toFixed(1)}% income here.` : '.') + '</p>' + D.STORIES.map((s) => {
      const p = S.stories[s.id];
      const where = s.stage7 ? 'Reach stage 7' : s.prop ? 'Buy ' + g.propDef(s.prop).name : s.acq ? 'Buy ' + s.acq + ' rundown hotel' + (s.acq > 1 ? 's' : '') : 'Arrives around day ' + s.unlockDay;
      const status = p && p.done ? (p.good === 3 ? 'Solved' : p.good === 2 ? 'Mostly solved' : 'Unresolved') : p ? 'In progress, day ' + (p.step + 1) : g.storyOpen(s) ? 'Arriving soon' : where;
      const perk = S.perks[s.perk] ? `<br><span class="good">Perk: ${esc(s.perkText)}</span>` : '';
      return `<div class="row-item ${p && p.done ? 'owned' : ''}"><div class="nm">${esc(s.title)}</div><div class="sub">${esc(s.guest)}. ${status}.${perk}</div></div>`;
    }).join('');
  }

  function settingsTab() {
    return `<div class="row-item"><div><span class="nm">Theme</span></div><div class="sub">Pick a hotel look. Shared with the homepage and Idle.</div><span>${window.HLTheme.selectHtml()}</span></div>` +
      '<div class="row-item"><div><span class="nm">Tutorial</span></div><div class="sub">Replay the short intro tips.</div><button class="btn ghosty" data-act="tutorial">Replay</button></div>' +
      '<div style="margin-top:16px"><button class="btn ghosty" data-act="reset">Reset Simulator save</button></div>';
  }

  function body() {
    const S = g.S;
    if (tab === 'desk') return S.phase === 'plan' ? deskPlan() : S.phase === 'shift' ? deskShift() : deskSummary();
    return { upgrades: upgradesTab, staff: staffTab, properties: propertiesTab, group: groupTab, books: booksTab, stories: storiesTab, settings: settingsTab }[tab]();
  }

  // First-play tutorial coach: one tip at a time, advances as the player acts, skippable, replay in Settings.
  function renderCoach() {
    const bar = $('coach'), T = g.S.tutorial, step = g.tutorialSync();
    if (step < 0) { bar.hidden = true; return; }
    const st = D.TUTORIAL[step];
    bar.hidden = false;
    bar.innerHTML = `<div class="dots">${D.TUTORIAL.map((_, i) => `<i class="${i <= T.step ? 'on' : ''}"></i>`).join('')}</div><div class="txt">${esc(st.text)}</div>` +
      (st.until === 'manual' ? `<button class="btn" data-co="next">${esc(st.button)}</button>` : '') + '<button class="skip" data-co="skip">Skip tutorial</button>';
  }

  function render() {
    renderCoach(); header(); roomsPanel();
    $('tabs').innerHTML = TABS.map((t) => `<button class="${tab === t[0] ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('');
    $('tabBody').innerHTML = body();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.co === 'skip') g.tutorialSkip();
    else if (d.co === 'next') g.tutorialNext();
    else if (d.act === 'tutorial') { g.tutorialReplay(); tab = 'desk'; }
    else if (d.tab) { tab = d.tab; }
    else if (d.rate) { g.setRate(Number(d.rate)); }
    else if (d.assign) { const [a, r] = d.assign.split(':'); const res = g.assign(Number(a), r); flash = res.ok ? '' : res.msg; }
    else if (d.away) g.turnAway(Number(d.away));
    else if (d.buyroom) g.buyRoom(d.buyroom);
    else if (d.repair) g.repair(d.repair);
    else if (d.renovate) g.upgradeRoom(d.renovate);
    else if (d.act === 'ad') g.runAd();
    else if (d.upg) g.buyUpgrade(d.upg);
    else if (d.staff) { g.S.staff[d.staff] ? g.fire(d.staff) : g.hire(d.staff); }
    else if (d.opt !== undefined) lastResult = g.resolveCard(Number(d.opt));
    else if (d.act === 'open') { flash = ''; lastResult = null; g.openDesk(); }
    else if (d.act === 'close') { g.closeDesk(); lastResult = null; }
    else if (d.act === 'next') { g.nextDay(); flash = ''; tab = 'desk'; }
    else if (d.act === 'repay') g.repay();
    else if (d.raise) g.raise(d.raise);
    else if (d.act === 'party') g.party();
    else if (d.land) g.buyLandmark(d.land);
    else if (d.act === 'retire') {
      const pts = g.legacyPoints();
      if (window.confirm('Retire for ' + pts + ' Legacy point' + (pts === 1 ? '' : 's') + '? Your hotels, staff and cash reset.')) { g.retire(); flash = ''; lastResult = null; tab = 'desk'; }
    }
    else if (d.act === 'brand') g.buyBrand();
    else if (d.act === 'world') g.buyWorld();
    else if (d.praise) g.raiseBranch(d.praise);
    else if (d.camp) g.startCampaign(d.camp);
    else if (d.acq) g.buyAcq(d.acq);
    else if (d.buyprop) g.buyProp(d.buyprop);
    else if (d.pgm) g.hireBranchGM(d.pgm);
    else if (d.pfire) g.fireBranchGM(d.pfire);
    else if (d.ptrain) g.trainBranchGM(d.ptrain);
    else if (d.preno) g.renovateProp(d.preno);
    else if (d.act === 'hirereg') g.hireRegional();
    else if (d.act === 'firereg') g.fireRegional();
    else if (d.act === 'hiregm') g.hire('gm');
    else if (d.act === 'traingm') g.trainGM();
    else if (d.act === 'togglegm') g.toggleGM();
    else if (d.act === 'reset') { if (window.confirm('Reset your Simulator save? Idle mode is not affected.')) { g.reset(); flash = ''; lastResult = null; tab = 'desk'; } }
    g.save();
    render();
  });

  const dev = /[?&]dev=1/.test(location.search);
  if (dev) { $('devCash').hidden = false; $('devCash').addEventListener('click', () => { g.devCash(1000); render(); }); }
  if (location.search) $('homeLink').href = 'index.html' + location.search;
  // Live link: pick up Idle ghosts found in another tab without a reload.
  if (window.HLShared) window.HLShared.subscribe(() => { if (g.refreshShared()) render(); });
  window.SIM = { g };
  render();
})();
