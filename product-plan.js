/* Product-style unified Plan page.
 * Merges the old Plan + Lock concepts, remembers the last open view,
 * and keeps day-stop codes consistent across the app.
 */
(function () {
  const VIEW_KEY = 'bj-last-view-v1';
  let openDecisionId = null;

  const DECISIONS = [
    {
      id: 'hotel26',
      when: 'Before hotels are booked',
      title: 'Sep 26 hotel',
      detail: 'Stay in Cochrane unless a Canmore / Dead Man’s Flats 2-Queen room is within about C$100 total.',
      options: [
        ['budget-rule', 'Use the C$100 rule'],
        ['mountain', 'Use mountain-area hotel'],
        ['pending', 'Still comparing']
      ]
    },
    {
      id: 'shuttle',
      when: 'Sep 25 • 8:00 AM MT',
      title: 'Moraine + Lake Louise shuttle',
      detail: 'Book Moraine first. This is the one reservation that can break Sep 27 if left unresolved.',
      options: [
        ['pending', 'Waiting to book'],
        ['booked', 'Parks Canada booked'],
        ['backup', 'Licensed backup booked']
      ]
    },
    {
      id: 'lakeLouise',
      when: 'Sep 27',
      title: 'Lake Louise depth',
      detail: 'Keep the lake visit compatible with the Icefields Parkway day.',
      options: [
        ['shoreline', 'Lakeshore only'],
        ['quick', 'Quick lake look'],
        ['agnes', 'Lake Agnes hike']
      ]
    },
    {
      id: 'maligne',
      when: 'Sep 28',
      title: 'Maligne Lake Cruise',
      detail: 'This is the paid attraction you chose to protect.',
      options: [
        ['book', 'Book Classic Cruise'],
        ['hold', 'Hold for price/time'],
        ['skip', 'Shoreline only']
      ]
    },
    {
      id: 'gondola',
      when: '1–2 days before Sep 26',
      title: 'Banff Gondola',
      detail: 'Only do it if weather is clear or a later Pursuit decision changes the value.',
      options: [
        ['weather', 'Decide from weather'],
        ['yes', 'Buy if clear'],
        ['pass', 'Use with Pursuit Pass'],
        ['no', 'Skip']
      ]
    },
    {
      id: 'icefield',
      when: 'Sep 29',
      title: 'Icefield Adventure',
      detail: 'Free glacier viewing stays in the core plan. The paid Explorer + Skywalk remains optional.',
      options: [
        ['nice-no-pass', 'Nice, mostly skip'],
        ['buy', 'Buy à la carte'],
        ['pass', 'Use with Pursuit Pass'],
        ['skip', 'Free glacier only']
      ]
    },
    {
      id: 'sep29bonus',
      when: 'Sep 29 morning',
      title: 'Choose the big bonus',
      detail: 'Pick one based on weather, fatigue and what you completed northbound.',
      options: [
        ['pending', 'Decide on the trip'],
        ['valley', 'Valley of Five Lakes'],
        ['icefield', 'Icefield Adventure'],
        ['yoho', 'Emerald Lake + Natural Bridge'],
        ['core', 'No big bonus']
      ]
    }
  ];

  const BOOKING_GROUPS = [
    { id: 'flights-out', label: 'Outbound flight', ids: ['outbound'] },
    { id: 'flights-back', label: 'Return flight', ids: ['return'] },
    { id: 'rental', label: 'Rental car', ids: ['rental'] },
    { id: 'cochrane2', label: 'Cochrane • Sep 25–26', ids: ['h25','h26'] },
    { id: 'hinton2', label: 'Hinton • Sep 27–28', ids: ['h27','h28'] },
    { id: 'cochrane29', label: 'Cochrane • Sep 29', ids: ['h29'] },
    { id: 'park', label: 'Parks Canada admission', ids: ['park'] },
    { id: 'shuttle', label: 'Moraine / Lake Louise shuttle', ids: ['shuttle'] }
  ];

  const FINAL_CHECKS = [
    ['offline_maps', 'Offline maps downloaded'],
    ['tickets_saved', 'Tickets + confirmations saved on every phone'],
    ['layers_ready', 'Warm layers / rain shell in the car'],
    ['snacks_ready', 'Water + road snacks packed'],
    ['road_check', '511 Alberta + Parks conditions checked']
  ];

  function booking(id) {
    return S.bookings.find(function (b) { return b.id === id; });
  }

  function bookingDone(b) {
    return !!b && ['Booked','Paid','Done'].includes(b.status);
  }

  function groupDone(group) {
    return group.ids.every(function (id) { return bookingDone(booking(id)); });
  }

  function groupPrimaryBooking(group) {
    return booking(group.ids[0]);
  }

  function setGroupDone(groupId, done) {
    const group = BOOKING_GROUPS.find(function (g) { return g.id === groupId; });
    if (!group) return;
    group.ids.forEach(function (id) {
      const b = booking(id);
      if (!b) return;
      if (done) {
        if (!bookingDone(b)) b.status = 'Booked';
      } else {
        if (id === 'shuttle') b.status = 'Waiting window';
        else if (id === 'outbound') b.status = 'Decide';
        else b.status = 'Ready to book';
      }
    });
    save();
  }

  function decisionValue(id) {
    return (S.decisions && S.decisions[id]) || '';
  }

  function decisionLabel(q) {
    const value = decisionValue(q.id);
    const opt = q.options.find(function (o) { return o[0] === value; });
    return opt ? opt[1] : 'Not decided';
  }

  function decisionState(q) {
    const v = decisionValue(q.id);
    if (!v || v === 'pending') return 'needs';
    if (q.id === 'gondola' && v === 'weather') return 'later';
    if (q.id === 'icefield' && v === 'nice-no-pass') return 'later';
    if (q.id === 'maligne' && v === 'hold') return 'later';
    return 'done';
  }

  function setDecision(id, value) {
    openDecisionId = null;
    if (typeof window.setVerifiedDecision === 'function') {
      window.setVerifiedDecision(id, value);
    } else {
      S.decisions = S.decisions || {};
      S.decisions[id] = value;
      save();
    }
  }

  function toggleDecision(id) {
    openDecisionId = openDecisionId === id ? null : id;
    renderProductPlan();
  }

  function activePlanStops(day) {
    const tl = computeDayTimeline(day);
    return tl.items.filter(function (it) {
      return !it.isCut && !it.isOptionPending;
    });
  }

  function renderChecklist() {
    const completed = BOOKING_GROUPS.filter(groupDone).length;
    const rows = BOOKING_GROUPS.map(function (g) {
      const done = groupDone(g);
      const b = groupPrimaryBooking(g);
      const state = done ? 'Done' : (b ? b.status : 'Not started');
      const href = b && b.link ? b.link : '#';
      return '<div class="pp-check-row ' + (done ? 'done' : '') + '">' +
        '<label class="pp-check-main"><input type="checkbox" ' + (done ? 'checked' : '') + ' onchange="setProductBookingDone(\'' + g.id + '\',this.checked)"><span class="pp-check-box"></span><span><b>' + escapeHtml(g.label) + '</b><small>' + escapeHtml(state) + '</small></span></label>' +
        (href !== '#' ? '<a href="' + href + '" target="_blank">Open</a>' : '') +
      '</div>';
    }).join('');

    const finalRows = FINAL_CHECKS.map(function (x) {
      const done = checked(x[0]);
      return '<label class="pp-check-row compact ' + (done ? 'done' : '') + '"><span class="pp-check-main"><input type="checkbox" ' + (done ? 'checked' : '') + ' onchange="toggleCheck(\'' + x[0] + '\')"><span class="pp-check-box"></span><span><b>' + escapeHtml(x[1]) + '</b></span></span></label>';
    }).join('');

    return '<section class="pp-section" id="planChecklist">' +
      '<div class="pp-section-head"><div><h2>Before you go</h2><p>' + completed + ' of ' + BOOKING_GROUPS.length + ' core bookings done</p></div><button onclick="setView(\'bookings\')">Open booking details</button></div>' +
      '<div class="pp-progress"><span style="width:' + Math.round(completed / BOOKING_GROUPS.length * 100) + '%"></span></div>' +
      '<div class="pp-check-list">' + rows + '</div>' +
      '<details class="pp-final-checks"><summary>Departure-day checklist</summary><div class="pp-check-list">' + finalRows + '</div></details>' +
    '</section>';
  }

  function renderDecisions() {
    const unresolved = DECISIONS.filter(function (q) { return decisionState(q) !== 'done'; }).length;
    const rows = DECISIONS.map(function (q) {
      const state = decisionState(q);
      const expanded = openDecisionId === q.id;
      const choices = expanded
        ? '<div class="pp-decision-options">' + q.options.map(function (o) {
            const selected = decisionValue(q.id) === o[0];
            return '<button class="' + (selected ? 'selected' : '') + '" onclick="setProductDecision(\'' + q.id + '\',\'' + o[0] + '\')">' + escapeHtml(o[1]) + '</button>';
          }).join('') + '</div>'
        : '';
      return '<div class="pp-decision-row ' + state + '">' +
        '<div class="pp-decision-when">' + escapeHtml(q.when) + '</div>' +
        '<div class="pp-decision-copy"><b>' + escapeHtml(q.title) + '</b><p>' + escapeHtml(q.detail) + '</p>' + choices + '</div>' +
        '<div class="pp-decision-current"><span>' + escapeHtml(decisionLabel(q)) + '</span><button onclick="toggleProductDecision(\'' + q.id + '\')">' + (expanded ? 'Close' : 'Change') + '</button></div>' +
      '</div>';
    }).join('');

    return '<section class="pp-section" id="planDecisions">' +
      '<div class="pp-section-head"><div><h2>Decisions</h2><p>' + (unresolved ? unresolved + ' still flexible or unresolved' : 'Everything important is decided') + '</p></div></div>' +
      '<div class="pp-decision-list">' + rows + '</div>' +
    '</section>';
  }

  function renderDay(day, dayIndex) {
    const tl = computeDayTimeline(day);
    const active = activePlanStops(day);
    const cut = day.stops.filter(function (s) { return s.priority === 'cut'; });
    const stops = active.map(function (it) {
      const code = tripStopCode(day, it.stop);
      return '<button class="pp-stop" onclick="openSpotModal(\'' + day.date + '\',\'' + escapeAttr(it.stop.id) + '\')">' +
        '<span class="pp-stop-code">' + escapeHtml(code) + '</span>' +
        '<span class="pp-stop-time">' + escapeHtml(it.arrTime.display) + '</span>' +
        '<span class="pp-stop-name">' + escapeHtml(getSpotInfo(it.stop).title || it.stop.name) + '</span>' +
        '<span class="pp-stop-stay">' + (it.stayMin ? escapeHtml(formatDuration(it.stayMin)) : '—') + '</span>' +
      '</button>';
    }).join('');

    const cutText = cut.length
      ? '<div class="pp-cut-line"><b>Cut first:</b> ' + cut.map(function (s) { return tripStopCode(day, s) + ' ' + (getSpotInfo(s).title || s.name); }).map(escapeHtml).join(' • ') + '</div>'
      : '';

    return '<article class="pp-day">' +
      '<div class="pp-day-head">' +
        '<div class="pp-day-index">D' + (dayIndex + 1) + '</div>' +
        '<div class="pp-day-title"><small>' + escapeHtml(day.date) + '</small><b>' + escapeHtml(day.label) + '</b><span>' + escapeHtml(day.start) + ' → ~' + escapeHtml(tl.finishTime.display) + ' • ' + escapeHtml(tl.totalDistKm) + ' km • ' + escapeHtml(formatDuration(tl.totalDriveMin)) + ' driving</span></div>' +
        '<div class="pp-day-actions"><button onclick="openDayGuide(\'' + day.date + '\')">Day details</button><button onclick="chooseDay(\'' + day.date + '\')">Edit route</button></div>' +
      '</div>' +
      '<div class="pp-stop-list">' + stops + '</div>' +
      cutText +
    '</article>';
  }

  function renderItinerary() {
    return '<section class="pp-section" id="planItinerary">' +
      '<div class="pp-section-head"><div><h2>Itinerary</h2><p>The stop code is always Day-Stop: D2-4 means Day 2, fourth stop.</p></div><button onclick="setView(\'mapview\')">Open map</button></div>' +
      '<div class="pp-days">' + S.days.map(renderDay).join('') + '</div>' +
    '</section>';
  }

  function renderProductPlan() {
    const root = document.getElementById('planRoot');
    if (!root) return;
    const booked = BOOKING_GROUPS.filter(groupDone).length;
    const unresolved = DECISIONS.filter(function (q) { return decisionState(q) !== 'done'; }).length;
    const totalNow = total();
    const pp = totalNow / Math.max(1, S.settings.travellers || 1);

    root.innerHTML =
      '<div class="product-plan">' +
        '<header class="pp-header">' +
          '<div><small>Sep 25–30, 2026 • ' + S.settings.travellers + ' adults</small><h1>Banff → Jasper trip plan</h1><p>One place for bookings, decisions and the day-by-day route.</p></div>' +
          '<div class="pp-header-summary"><div><span>Budget</span><b>' + money(totalNow) + '</b><small>' + money(pp) + ' / person</small></div><div><span>Bookings</span><b>' + booked + '/' + BOOKING_GROUPS.length + '</b><small>' + unresolved + ' flexible decisions</small></div></div>' +
        '</header>' +
        '<nav class="pp-subnav"><button onclick="scrollProductPlanTo(\'planChecklist\')">Checklist</button><button onclick="scrollProductPlanTo(\'planDecisions\')">Decisions</button><button onclick="scrollProductPlanTo(\'planItinerary\')">Itinerary</button></nav>' +
        renderChecklist() +
        renderDecisions() +
        renderItinerary() +
      '</div>';
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function polishNavigation() {
    const brand = document.querySelector('.brand-text b');
    if (brand) brand.textContent = 'Rockies Planner';
    const logo = document.querySelector('.logo');
    if (logo) logo.textContent = 'RP';

    const labels = {
      planview: 'Plan',
      mapview: 'Map',
      overview: 'Days',
      bookings: 'Bookings',
      hotels: 'Hotels',
      attractions: 'Attractions',
      packview: 'Pack',
      fieldview: 'Road',
      budget: 'Budget',
      settings: 'Data',
      finalize: 'Export'
    };
    document.querySelectorAll('#tabs [data-view]').forEach(function (b) {
      if (labels[b.dataset.view]) b.textContent = labels[b.dataset.view];
    });

    document.querySelectorAll('[data-view="lockview"]').forEach(function (b) { b.remove(); });
    const lock = document.getElementById('lockview');
    if (lock) lock.remove();

    const mobileLock = document.querySelector('#mobileBottomNav [data-mobile-view="lockview"]');
    if (mobileLock) {
      mobileLock.dataset.mobileView = 'planview';
      mobileLock.setAttribute('onclick', "goMobilePlanner('planview')");
      const icon = mobileLock.querySelector('span');
      const label = mobileLock.querySelector('b');
      if (icon) icon.textContent = '✓';
      if (label) label.textContent = 'Plan';
    }

    document.querySelectorAll('.mobile-more-grid button').forEach(function (b) {
      if (b.textContent.trim() === 'Full plan') b.textContent = 'Plan';
    });
  }

  function decorateModalCode(date, id) {
    const found = findStop(date, id);
    if (!found || !found.stop) return;
    const code = tripStopCode(found.day, found.stop);
    const label = document.getElementById('modalDayLabel');
    if (label) label.textContent = code + ' • ' + found.day.date + ' • stop ' + (found.index + 1) + ' of ' + found.day.stops.length;
    const prev = found.day.stops[found.index - 1];
    const next = found.day.stops[found.index + 1];
    const pb = document.getElementById('modalPrevBtn');
    const nb = document.getElementById('modalNextBtn');
    if (pb && prev) pb.textContent = '← ' + tripStopCode(found.day, prev) + ' ' + (getSpotInfo(prev).title || prev.name);
    if (nb && next) nb.textContent = tripStopCode(found.day, next) + ' ' + (getSpotInfo(next).title || next.name) + ' →';
  }

  function decorateRouteClock() {
    if (S.selectedDay === 'all') return;
    const day = getDay();
    const items = computeDayTimeline(day).items.filter(function (it) {
      return !it.isCut && !it.isOptionPending && it.arrMin != null;
    });
    document.querySelectorAll('#adaptiveRouteClock .route-clock-row').forEach(function (row, i) {
      const badge = row.querySelector('.route-clock-number');
      if (badge && items[i]) badge.textContent = tripStopCode(day, items[i].stop);
    });
  }

  function polishMobileQuick() {
    document.querySelectorAll('#mobileQuickRoot button').forEach(function (b) {
      if (b.textContent.trim() === 'Lock choices' || b.textContent.trim() === 'Lock') b.textContent = 'Plan';
    });
  }

  function injectCss() {
    if (document.getElementById('productPlanCss')) return;
    const st = document.createElement('style');
    st.id = 'productPlanCss';
    st.textContent = `
      #planview .plan-hero{display:none!important}
      .top-stats{display:none!important}
      .topin{gap:18px}
      .brand{min-width:180px}
      .logo{font-family:Inter,sans-serif;font-size:11px!important;font-weight:900;letter-spacing:.04em;background:#e7f0f4!important;color:#112531!important;box-shadow:none!important}
      .brand-text b{font-size:13px}
      .tabs{gap:1px}
      .tabs button{border-radius:7px;padding:7px 9px}
      .tabs button.on{background:#173447;border-color:#31566e}
      .product-plan{max-width:1180px;margin:0 auto;padding:4px 0 36px;color:var(--text)}
      .pp-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-end;padding:22px 2px 18px;border-bottom:1px solid var(--line)}
      .pp-header small{color:var(--muted);font-size:11px}
      .pp-header h1{font-size:28px;letter-spacing:-.035em;margin:3px 0 5px}
      .pp-header p{margin:0;color:var(--muted);font-size:12px}
      .pp-header-summary{display:flex;gap:28px}
      .pp-header-summary>div{min-width:120px}
      .pp-header-summary span,.pp-header-summary small{display:block;color:var(--muted);font-size:9px;text-transform:none}
      .pp-header-summary b{display:block;font-size:18px;margin:2px 0}
      .pp-subnav{display:flex;gap:18px;position:sticky;top:0;z-index:15;background:var(--bg);padding:10px 0;border-bottom:1px solid var(--line)}
      .pp-subnav button,.pp-section-head button,.pp-day-actions button,.pp-decision-current button{
        border:0;background:transparent;color:#b9d1df;padding:3px 0;cursor:pointer;font:inherit;font-size:11px
      }
      .pp-subnav button:hover,.pp-section-head button:hover,.pp-day-actions button:hover,.pp-decision-current button:hover{color:#fff;text-decoration:underline}
      .pp-section{padding:26px 0;border-bottom:1px solid var(--line)}
      .pp-section:last-child{border-bottom:0}
      .pp-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:12px}
      .pp-section-head h2{font-size:18px;margin:0 0 2px}
      .pp-section-head p{margin:0;color:var(--muted);font-size:11px}
      .pp-progress{height:4px;background:#122937;border-radius:999px;overflow:hidden;margin:0 0 12px}
      .pp-progress span{display:block;height:100%;background:#69b88c}
      .pp-check-list{border-top:1px solid var(--line)}
      .pp-check-row{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:52px;border-bottom:1px solid var(--line)}
      .pp-check-row>a{font-size:10px;color:#a9c9da;text-decoration:none}
      .pp-check-row>a:hover{text-decoration:underline;color:#fff}
      .pp-check-main{display:flex;align-items:center;gap:10px;flex:1;cursor:pointer}
      .pp-check-main input{position:absolute;opacity:0;pointer-events:none}
      .pp-check-box{width:18px;height:18px;border:1px solid #547184;border-radius:5px;display:grid;place-items:center;flex:0 0 auto}
      .pp-check-row.done .pp-check-box{background:#5da27b;border-color:#5da27b}
      .pp-check-row.done .pp-check-box:after{content:'✓';color:#061610;font-size:11px;font-weight:900}
      .pp-check-main b{display:block;font-size:12px}
      .pp-check-main small{display:block;color:var(--muted);font-size:9px;margin-top:2px}
      .pp-final-checks{margin-top:12px}
      .pp-final-checks summary{cursor:pointer;color:#b8cfdd;font-size:11px}
      .pp-check-row.compact{min-height:42px}
      .pp-decision-list{border-top:1px solid var(--line)}
      .pp-decision-row{display:grid;grid-template-columns:150px minmax(0,1fr) 210px;gap:18px;align-items:start;padding:14px 0;border-bottom:1px solid var(--line)}
      .pp-decision-when{font-size:9px;color:#7fa0b2;text-transform:none;padding-top:2px}
      .pp-decision-copy>b{font-size:12px}
      .pp-decision-copy p{font-size:10px;color:var(--muted);margin:3px 0 0;line-height:1.45}
      .pp-decision-current{text-align:right}
      .pp-decision-current span{display:block;font-size:11px;color:#dce9ef}
      .pp-decision-current button{font-size:9px;color:#7faec7;margin-top:4px}
      .pp-decision-row.needs .pp-decision-current span{color:#f0c36a}
      .pp-decision-row.done .pp-decision-current span{color:#8fd0aa}
      .pp-decision-options{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .pp-decision-options button{border:1px solid var(--line);background:#0a1d29;color:#bdd0dc;border-radius:7px;padding:6px 8px;font-size:9px;cursor:pointer}
      .pp-decision-options button.selected{border-color:#6e9a82;background:#122a22;color:#d8efe1}
      .pp-days{display:flex;flex-direction:column;gap:12px}
      .pp-day{border:1px solid var(--line);border-radius:11px;background:#091b27;overflow:hidden}
      .pp-day-head{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line);background:#0c202e}
      .pp-day-index{width:38px;height:38px;border:1px solid #456477;border-radius:9px;display:grid;place-items:center;font-size:11px;font-weight:850;color:#d7e6ee}
      .pp-day-title small{display:block;color:#82a1b3;font-size:9px}
      .pp-day-title b{display:block;font-size:13px;margin:1px 0}
      .pp-day-title span{display:block;color:var(--muted);font-size:9px}
      .pp-day-actions{display:flex;gap:12px}
      .pp-stop-list{padding:4px 14px 8px}
      .pp-stop{width:100%;display:grid;grid-template-columns:52px 72px minmax(0,1fr) 70px;gap:8px;align-items:center;border:0;border-bottom:1px solid rgba(255,255,255,.055);background:transparent;color:inherit;text-align:left;padding:8px 0;cursor:pointer}
      .pp-stop:last-child{border-bottom:0}
      .pp-stop:hover .pp-stop-name{color:#fff}
      .pp-stop-code{font-size:9px;color:#93b7ca;font-weight:800}
      .pp-stop-time{font-size:10px;color:#dce9ef}
      .pp-stop-name{font-size:11px;color:#c7d8e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pp-stop-stay{text-align:right;font-size:9px;color:#839caa}
      .pp-cut-line{padding:8px 14px;background:#0a1821;color:#a79470;font-size:9px;border-top:1px solid rgba(255,255,255,.05)}
      #stopList .stoprow-top{grid-template-columns:16px 46px minmax(0,1fr) 76px 24px 24px 24px!important}
      #stopList .stop-num-badge{width:auto!important;min-width:42px!important;height:22px!important;border-radius:7px!important;padding:0 5px!important;font-size:9px!important}
      #stopList .stop-num-badge:hover{transform:none!important}

      /* Whole-trip map sidebar: compact route index, not the single-day editor. */
      #mapview .sidebar.all-days-mode .dayeditor,
      #mapview .sidebar.all-days-mode #dayNote,
      #mapview .sidebar.all-days-mode .addbox,
      #mapview .sidebar.all-days-mode #attBanner{display:none!important}
      #mapview .sidebar.all-days-mode .sidebody{padding-top:8px}
      #mapview .sidebar.all-days-mode #daySummary{
        display:flex;justify-content:space-between;gap:8px;align-items:center;
        padding:7px 8px;margin-bottom:8px;border:1px solid var(--line);border-radius:8px;
        background:#081a27;font-size:9px;color:#93aab8
      }
      #mapview .sidebar.all-days-mode #daySummary span:last-child{text-align:right}
      .alltrip-day{margin:0 0 9px;border:1px solid var(--line);border-left:3px solid var(--day-color);border-radius:9px;overflow:hidden;background:#091b27}
      .alltrip-day-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;align-items:stretch;background:#0c2230;border-bottom:1px solid var(--line)}
      .alltrip-day-main{display:grid;grid-template-columns:34px minmax(0,1fr);gap:7px;align-items:center;min-width:0;border:0;background:transparent;color:inherit;text-align:left;padding:7px;cursor:pointer}
      .alltrip-day-code{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;background:#14394d;color:#e2eef4;font-size:9px;font-weight:850}
      .alltrip-day-copy{min-width:0}
      .alltrip-day-copy b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .alltrip-day-copy small{display:block;margin-top:2px;color:#819aa9;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .alltrip-open{border:0;border-left:1px solid var(--line);background:#102736;color:#9eb9c8;padding:0 8px;font-size:8.5px;cursor:pointer}
      .alltrip-open:hover{background:#173549;color:#fff}
      .alltrip-stops{padding:3px 6px 5px}
      .alltrip-stop{display:grid;grid-template-columns:minmax(0,1fr) 25px;gap:4px;align-items:center;border-bottom:1px solid rgba(255,255,255,.045)}
      .alltrip-stop:last-child{border-bottom:0}
      .alltrip-stop-main{display:grid;grid-template-columns:44px minmax(0,1fr) 38px 42px;gap:5px;align-items:center;min-width:0;border:0;background:transparent;color:inherit;text-align:left;padding:5px 2px;cursor:pointer}
      .alltrip-stop-main:hover .alltrip-stop-name{color:#fff}
      .alltrip-stop-code{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:21px;padding:0 4px;border-radius:6px;background:#163c50;color:#d6e8f1;font-size:8px;font-weight:850}
      .alltrip-stop-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#c7d8e1;font-size:9.5px}
      .alltrip-stop-meta{text-align:right;color:#7e96a5;font-size:8px;white-space:nowrap}
      .alltrip-stop-state{justify-self:end;min-width:38px;text-align:center;border:1px solid var(--line);border-radius:999px;padding:2px 3px;font-size:6.8px;font-weight:850}
      .alltrip-stop-state.must{border-color:#3e765e;color:#9dd5b4}
      .alltrip-stop-state.nice{border-color:#3b6179;color:#8fc9e8}
      .alltrip-stop-state.cut{border-color:#705c33;color:#d9bd7a}
      .alltrip-stop-state.hotel{border-color:#74558c;color:#cbb0df}
      .alltrip-stop.is-cut{opacity:.56}
      .alltrip-info{width:23px;height:23px;border-radius:6px;border:1px solid var(--line);background:#0c2230;color:#86a2b2;font-size:9px;cursor:pointer}
      .alltrip-info:hover{color:#fff;border-color:#456d84}

      @media(max-width:768px){
        .product-plan{padding:0 2px 86px}
        .pp-header{display:block;padding:14px 2px 12px}
        .pp-header h1{font-size:22px}
        .pp-header-summary{margin-top:12px;gap:20px}
        .pp-header-summary>div{min-width:0;flex:1}
        .pp-subnav{top:0;padding:9px 2px;gap:14px;overflow-x:auto}
        .pp-section{padding:20px 0}
        .pp-decision-row{grid-template-columns:1fr;gap:5px;padding:12px 0}
        .pp-decision-current{text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .pp-decision-options{display:grid;grid-template-columns:1fr 1fr}
        .pp-decision-options button{text-align:left;min-height:38px}
        .pp-day-head{grid-template-columns:36px 1fr;padding:10px}
        .pp-day-index{width:32px;height:32px}
        .pp-day-actions{grid-column:2;justify-content:flex-start;margin-top:3px}
        .pp-stop-list{padding:3px 10px 7px}
        .pp-stop{grid-template-columns:46px 62px minmax(0,1fr);gap:6px}
        .pp-stop-stay{display:none}
        .pp-stop-name{font-size:10.5px}
        .pp-check-row{min-height:50px}
        #stopList .stoprow-top{grid-template-columns:16px 44px minmax(0,1fr) 70px 24px 24px 24px!important}
      }
    `;
    document.head.appendChild(st);
  }

  function patchFunctions() {
    renderPlan = renderProductPlan;

    const oldSetView = setView;
    setView = function (id) {
      if (id === 'lockview') id = 'planview';
      oldSetView(id);
      localStorage.setItem(VIEW_KEY, id);
      try { history.replaceState(null, '', '#' + id); } catch (_) {}
      if (id === 'planview') renderProductPlan();
    };

    const oldOpenSpotModal = openSpotModal;
    openSpotModal = function (date, id) {
      oldOpenSpotModal(date, id);
      decorateModalCode(date, id);
    };

    const oldRenderAll = renderAll;
    renderAll = function () {
      oldRenderAll();
      decorateRouteClock();
      polishMobileQuick();
    };

    if (typeof window.renderAdaptiveRouteClock === 'function') {
      const oldRouteClock = window.renderAdaptiveRouteClock;
      window.renderAdaptiveRouteClock = function () {
        oldRouteClock();
        decorateRouteClock();
      };
    }
  }

  function restoreView() {
    let requested = location.hash ? location.hash.slice(1) : localStorage.getItem(VIEW_KEY);
    if (requested === 'lockview') requested = 'planview';
    if (requested === 'mobilequick' && !window.matchMedia('(max-width: 768px)').matches) requested = 'planview';
    const valid = new Set(['planview','mapview','overview','bookings','hotels','attractions','packview','fieldview','budget','settings','finalize','mobilequick']);
    if (!requested || !valid.has(requested) || !document.getElementById(requested)) return;
    setView(requested);
  }

  injectCss();
  polishNavigation();
  patchFunctions();

  window.setProductBookingDone = setGroupDone;
  window.setProductDecision = setDecision;
  window.toggleProductDecision = toggleDecision;
  window.scrollProductPlanTo = scrollToSection;
  window.renderProductPlan = renderProductPlan;

  renderProductPlan();
  decorateRouteClock();
  polishMobileQuick();
  setTimeout(restoreView, 0);
})();