/* Jasper 2026 closure policy + authoritative booked-trip facts + operational timing safeguards. */
(function () {
  const CLOSED_2026 = [
    {
      key: 'maligne-canyon',
      title: 'Maligne Canyon',
      ids: ['malignecanyon', 'malignecanyonfree'],
      pattern: /\bmaligne\s+canyon\b/i,
      status: 'Closed for the 2026 season',
      detail: 'Access to Maligne Canyon trails and surrounding land is prohibited from First Bridge parking lot to the Fifth Bridge junction during wildfire recovery.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/canyon-maligne'
    },
    {
      key: 'cavell',
      title: 'Cavell Road / Mount Edith Cavell',
      ids: ['cavell', 'cavellroad', 'edithcavell', 'mountedithcavell', 'cavellmeadows', 'pathoftheglacier'],
      pattern: /\b(?:cavell\s+road|edith\s+cavell(?:\s+road|\s+area)?|mount\s+edith\s+cavell|cavell\s+meadows|path\s+of\s+the\s+glacier)\b/i,
      status: 'Closed for the 2026 season',
      detail: 'Edith Cavell Road and area are closed to all travel. Path of the Glacier and Cavell Meadows are also closed during wildfire recovery.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/cavell'
    }
  ];

  const BULLETIN = 'https://parks.canada.ca/voyage-travel/securite-safety/bulletins/76ecae58-8a63-480c-8304-dc903837eefd';
  const VERIFIED_TRIP_ACTUALS = { westJetFare: 966.63, checkedBaggage: 119.90, westJetTotal: 1086.53 };
  const VERIFIED_MALIGNE_CRUISE = {
    reservation: '4184612', date: 'Sep 28', dateIso: '2026-09-28', sailTime: '12:00 PM', cruiseMinutes: 90,
    travellers: 3, total: 321.42, balanceDue: 0, arriveLake: '10:45 AM', dockBy: '11:45 AM',
    product: 'Classic Cruise (1.5 hours)', link: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/'
  };
  const PARK_EXTENSION = 24.50;
  let enforcing = false;

  function assignChanged(target, values) {
    let changed = false;
    Object.keys(values).forEach(function (key) {
      if (target[key] !== values[key]) { target[key] = values[key]; changed = true; }
    });
    return changed;
  }

  function ensureTask(id, values) {
    let task = BOOK_TASKS.find(function (x) { return x.id === id; });
    if (!task) { task = { id: id }; BOOK_TASKS.push(task); }
    Object.assign(task, values);
    return task;
  }

  function stopFor(day, id) {
    return day && day.stops ? day.stops.find(function (s) { return s.id === id; }) : null;
  }

  function applyVerifiedTripActuals(state) {
    if (!state) return false;
    state.costs = state.costs || {};
    let changed = assignChanged(state.costs, {
      flight: 'booked-westjet', flightFareActual: VERIFIED_TRIP_ACTUALS.westJetFare,
      baggageActual: VERIFIED_TRIP_ACTUALS.checkedBaggage, flightActual: VERIFIED_TRIP_ACTUALS.westJetTotal,
      flightLocked: true
    });
    const outbound = (state.bookings || []).find(function (b) { return b.id === 'outbound'; });
    if (outbound) changed = assignChanged(outbound, {
      detail: 'Nonstop • 4h 19m • arrives Sat Sep 26 • 2 × 23 kg checked bags added • C$119.90 paid',
      flightFareActual: VERIFIED_TRIP_ACTUALS.westJetFare, baggageActual: VERIFIED_TRIP_ACTUALS.checkedBaggage
    }) || changed;
    return changed;
  }

  function applyVerifiedMaligneCruise(state) {
    if (!state) return false;
    let changed = false;
    state.costs = state.costs || {};
    changed = assignChanged(state.costs, { maligneCruiseActual: 321.42, maligneCruiseLocked: true }) || changed;

    state.attractions = state.attractions || [];
    const cruise = state.attractions.find(function (a) { return a.id === 'maligneCruise'; });
    if (cruise) changed = assignChanged(cruise, {
      name: 'Maligne Lake Classic Cruise / Spirit Island', day: 'Sep 28', cost: 321.42, time: 2.5, type: 'paid',
      rating: '9/10', rec: 'BOOKED • PAID • LOCKED', selected: true, booked: true, locked: true, actual: 321.42,
      confirmation: '4184612', desc: 'Classic 1.5-hour Spirit Island cruise booked for Sep 28 at 12:00 PM for 3 adults. C$321.42 paid in full.',
      skip: 'Locked booking — protect the 12:00 PM sailing and Maligne Road timing.', link: VERIFIED_MALIGNE_CRUISE.link
    }) || changed;
    const otherCruise = state.attractions.find(function (a) { return a.id === 'minnewankaCruise'; });
    if (otherCruise && otherCruise.selected) { otherCruise.selected = false; changed = true; }

    state.decisions = state.decisions || {};
    if (state.decisions.maligne !== 'book') { state.decisions.maligne = 'book'; changed = true; }

    const day = (state.days || []).find(function (d) { return d.date === 'Sep 28'; });
    if (day) {
      const stop = stopFor(day, 'maligne');
      if (stop) changed = assignChanged(stop, {
        name: 'Maligne Lake — Classic Cruise BOOKED 12:00 PM', priority: 'must', stayMin: 195, notBefore: '10:45', bookingLocked: true,
        note: 'Reservation 4184612 • 3 adults • C$321.42 paid • target lake arrival 10:45–11:00 AM • dock by 11:45 AM • sailing 12:00 PM • allow up to 15 min extra cruise time.'
      }) || changed;
    }

    state.bookings = state.bookings || [];
    let booking = state.bookings.find(function (b) { return b.id === 'maligneCruiseBooking'; });
    if (!booking) {
      booking = { id: 'maligneCruiseBooking' };
      const shuttleIndex = state.bookings.findIndex(function (b) { return b.id === 'shuttle'; });
      state.bookings.splice(shuttleIndex >= 0 ? shuttleIndex : state.bookings.length, 0, booking);
      changed = true;
    }
    changed = assignChanged(booking, {
      item: 'Maligne Lake Classic Cruise • Sep 28 • 12:00 PM • 3 adults', estimate: 321.42, status: 'Paid', actual: 321.42,
      confirm: 'Reservation 4184612', locked: true, bookingGroup: 'pursuit-maligne-cruise',
      detail: 'Classic Cruise • 1.5 hours • arrive at Maligne Lake ~10:45–11:00 AM • dock by 11:45 AM • C$321.42 paid • balance C$0.00',
      link: VERIFIED_MALIGNE_CRUISE.link
    }) || changed;
    return changed;
  }

  function applyOperationalPlan(state) {
    if (!state || !state.days) return false;
    let changed = false;
    const FINAL_PLAN_VERSION = 'verified-2026-09-25-v6';

    if (state !== BASE && state.presetVersion !== FINAL_PLAN_VERSION) {
      state.days = deepClone(BASE.days);
      state.decisions = deepClone(BASE.decisions || state.decisions || {});
      state.presetVersion = FINAL_PLAN_VERSION;
      changed = true;
    }

    state.settings = state.settings || {};
    if (state.settings.bufferMin !== 8) { state.settings.bufferMin = 8; changed = true; }

    const d26 = state.days.find(function (d) { return d.date === 'Sep 26'; });
    if (d26) {
      changed = assignChanged(d26, { start: '05:45', note: 'FINAL: booked 8:00–9:00 AM shuttle → Lake Louise → Moraine → Johnston Canyon → Bow Falls / Surprise Corner / Banff → Cochrane. Do not add Gondola, Minnewanka or Two Jack on Sep 26.' }) || changed;
      const johnston = stopFor(d26, 'johnston'); if (johnston) changed = assignChanged(johnston, { stayMin: 120, note: 'Target roughly 2:15–4:15 PM. Use Castle Junction for legal 2026 vehicle access; if the shuttle block runs very late, downgrade to Lower Falls before cutting the stop.' }) || changed;
      const bow = stopFor(d26, 'bowfalls'); if (bow) changed = assignChanged(bow, { priority: 'nice', stayMin: 20, enabled: true }) || changed;
      const surprise = stopFor(d26, 'surprise'); if (surprise) changed = assignChanged(surprise, { priority: 'nice', stayMin: 15, enabled: true }) || changed;
      const banff = stopFor(d26, 'banff'); if (banff) changed = assignChanged(banff, { priority: 'nice', stayMin: 45, enabled: true }) || changed;
    }

    const d27 = state.days.find(function (d) { return d.date === 'Sep 27'; });
    if (d27) {
      changed = assignChanged(d27, { start: '06:00', note: 'FINAL: Cochrane → Two Jack → Minnewanka → Bow Lake → Peyto → Mistaya optional → Saskatchewan Crossing → free Athabasca Glacier stop → Sunwapta → Hinton. If >30 min late, cut Mistaya first.' }) || changed;
      const mistaya = stopFor(d27, 'mistaya'); if (mistaya) changed = assignChanged(mistaya, { priority: 'nice', stayMin: 25, enabled: false, note: 'OPTIONAL / FIRST CUT if running more than ~30 min late.' }) || changed;
      const sask = stopFor(d27, 'saskcrossing'); if (sask) changed = assignChanged(sask, { stayMin: 30, priority: 'must', name: 'Saskatchewan Crossing (Fuel / Rest / Snack)' }) || changed;
      const sun = stopFor(d27, 'sunwapta'); if (sun) changed = assignChanged(sun, { priority: 'nice', stayMin: 30, enabled: false }) || changed;
      const ice = stopFor(d27, 'icefield'); if (ice) changed = assignChanged(ice, { priority: 'must', stayMin: 45, note: 'Free Athabasca Glacier / Columbia Icefield stop; paid Adventure is not part of the selected default plan.' }) || changed;
    }

    const d28 = state.days.find(function (d) { return d.date === 'Sep 28'; });
    if (d28) {
      changed = assignChanged(d28, { start: '07:00', note: 'FINAL fixed-booking day: 7:00 AM Hinton → Pyramid → Jasper fuel/breakfast → Medicine → Maligne Lake about 10:45 AM → booked 12:00 PM Classic Cruise → Hinton.' }) || changed;
      const dep = stopFor(d28, 'hinton28a'); if (dep) changed = assignChanged(dep, { name: 'Hinton Lodge (Depart 07:00)' }) || changed;
      const pyramid = stopFor(d28, 'pyramid'); if (pyramid) changed = assignChanged(pyramid, { stayMin: 40 }) || changed;
      const jasper = stopFor(d28, 'jasper'); if (jasper) changed = assignChanged(jasper, { name: 'Jasper Town — fuel / breakfast', stayMin: 20, priority: 'nice', enabled: true }) || changed;
      const medicine = stopFor(d28, 'medicine'); if (medicine) changed = assignChanged(medicine, { stayMin: 20 }) || changed;
      const annette = stopFor(d28, 'annette'); if (annette) changed = assignChanged(annette, { priority: 'cut', stayMin: 25, enabled: false }) || changed;
      const patricia = stopFor(d28, 'patricia'); if (patricia) changed = assignChanged(patricia, { priority: 'cut', stayMin: 15, enabled: false }) || changed;
    }

    const d29 = state.days.find(function (d) { return d.date === 'Sep 29'; });
    if (d29) {
      changed = assignChanged(d29, { start: '06:30', note: 'FINAL: Hinton → Jasper fuel → Athabasca Falls → Stutfield → Waterfowl → ONE weather choice only: clear summit = Banff Gondola; poor summit visibility = Natural Bridge + Emerald Lake → Calgary Airport hotel.' }) || changed;
      const jasper29 = stopFor(d29, 'jasper29'); if (jasper29) changed = assignChanged(jasper29, { priority: 'nice', stayMin: 20, enabled: true }) || changed;
      const ath = stopFor(d29, 'athfalls'); if (ath) changed = assignChanged(ath, { priority: 'must', stayMin: 40, note: 'Target roughly 8:20–9:00 AM.' }) || changed;
      const stut = stopFor(d29, 'stutfield'); if (stut) changed = assignChanged(stut, { priority: 'nice', stayMin: 15, enabled: true }) || changed;
      const water = stopFor(d29, 'waterfowl'); if (water) changed = assignChanged(water, { priority: 'nice', stayMin: 15, enabled: true }) || changed;
      const gondola = stopFor(d29, 'gondola'); if (gondola) changed = assignChanged(gondola, { priority: 'nice', stayMin: 135 }) || changed;
      const bridge = stopFor(d29, 'naturalbridge'); if (bridge) changed = assignChanged(bridge, { priority: 'nice', stayMin: 25 }) || changed;
      const emerald = stopFor(d29, 'emerald'); if (emerald) changed = assignChanged(emerald, { priority: 'nice', stayMin: 60 }) || changed;
      const valley = stopFor(d29, 'valley5'); if (valley) changed = assignChanged(valley, { priority: 'cut', enabled: false, stayMin: 110, note: 'Do not add by default; only reconsider if significantly ahead.' }) || changed;
      const ice = stopFor(d29, 'icefield29'); if (ice) changed = assignChanged(ice, { priority: 'cut', enabled: false, stayMin: 165, note: 'Not part of the selected default plan; deliberate substitution only.' }) || changed;
      const bow = stopFor(d29, 'bowlake29'); if (bow) changed = assignChanged(bow, { priority: 'cut', enabled: false, stayMin: 15, note: 'Repeat only if Sep 27 Bow Lake visibility was poor.' }) || changed;
      const bonus = state.decisions && state.decisions.sep29bonus;
      if (gondola) gondola.enabled = bonus === 'gondola';
      if (bridge) bridge.enabled = bonus === 'yoho';
      if (emerald) emerald.enabled = bonus === 'yoho';
    }

    const d30 = state.days.find(function (d) { return d.date === 'Sep 30'; });
    if (d30) {
      changed = assignChanged(d30, { start: '10:00', note: 'FINAL easy day: Calgary is flexible; protect the 4:45 PM rental-return target for the booked 7:10 PM WestJet flight.' }) || changed;
      const city = stopFor(d30, 'canmore'); if (city) changed = assignChanged(city, { priority: 'nice', enabled: true, stayMin: 150 }) || changed;
      const yyc = stopFor(d30, 'yyc30'); if (yyc) changed = assignChanged(yyc, { name: 'YYC — Rental Return 4:45 PM + WestJet 7:10 PM', notBefore: '16:45', stayMin: 145, note: 'Operational target is 4:45 PM. Voucher says 6:00 PM; confirm early-return procedure at pickup.' }) || changed;
    }

    state.costs = state.costs || {};
    if (state.costs.park !== 73.50) { state.costs.park = 73.50; changed = true; }
    if (state.costs.parkExtensionPlanned !== 0) { state.costs.parkExtensionPlanned = 0; changed = true; }
    if (state.bookings) {
      const before = state.bookings.length;
      state.bookings = state.bookings.filter(function (b) { return b.id !== 'parkExtension'; });
      if (state.bookings.length !== before) changed = true;
      state.bookings.forEach(function (b, index) { if (b.p !== index + 1) { b.p = index + 1; changed = true; } });
    }
    return changed;
  }

  function closureFor(stopOrName) {
    if (!stopOrName) return null;
    const id = typeof stopOrName === 'object' ? String(stopOrName.id || '').toLowerCase() : '';
    const name = typeof stopOrName === 'object' ? String(stopOrName.name || '') : String(stopOrName);
    return CLOSED_2026.find(function (rule) { return (id && rule.ids.includes(id)) || rule.pattern.test(name); }) || null;
  }
  function isHardClosed2026(stopOrName) { return !!closureFor(stopOrName); }

  function enforceStop(stop) {
    const rule = closureFor(stop); if (!rule) return false;
    let changed = false;
    if (stop.priority !== 'cut') { stop.priority = 'cut'; changed = true; }
    if (Number(stop.stayMin || 0) !== 0) { stop.stayMin = 0; changed = true; }
    if (!stop.hardClosed2026) { stop.hardClosed2026 = true; changed = true; }
    const note = 'HARD CLOSED 2026 — excluded from routing. ' + rule.detail;
    if (stop.note !== note) { stop.note = note; changed = true; }
    return changed;
  }

  function enforceState(state) {
    if (!state || !state.days) return false;
    let changed = false;
    state.days.forEach(function (day) { (day.stops || []).forEach(function (stop) { if (enforceStop(stop)) changed = true; }); });
    (state.attractions || []).forEach(function (a) {
      const rule = closureFor({ id: a.id, name: a.name }); if (!rule) return;
      if (a.selected) { a.selected = false; changed = true; }
      if (a.rec !== 'CLOSED 2026 — DO NOT ROUTE') { a.rec = 'CLOSED 2026 — DO NOT ROUTE'; changed = true; }
      if (a.time !== 0) { a.time = 0; changed = true; }
      const desc = rule.status + '. ' + rule.detail;
      if (a.desc !== desc) { a.desc = desc; changed = true; }
      if (a.link !== rule.official) { a.link = rule.official; changed = true; }
    });
    return changed;
  }

  function patchBaseData() {
    enforceState(BASE);
    applyVerifiedTripActuals(BASE);
    applyVerifiedMaligneCruise(BASE);
    applyOperationalPlan(BASE);

    const maligne = SPOT_INFO.maligne || (SPOT_INFO.maligne = {});
    Object.assign(maligne, {
      title: 'Maligne Lake & Spirit Island — BOOKED 12:00 PM', time: 'Booked block • ~2.5 hr including arrival buffer',
      parking: 'Main Maligne Lake visitor parking; no separate parking reservation required. Arrive early because wildlife/traffic and parking can consume the buffer.',
      parkingRating: 'No reservation • Arrive around 10:45–11:00 AM', bestWindow: 'Sep 28 • 12:00 PM sailing • BOOKED',
      desc: 'Classic 1.5-hour Maligne Lake cruise to the Spirit Island area is booked for 3 adults on Sep 28 at 12:00 PM. Total C$321.42 is paid in full.',
      todo: 'Reach the lake around 10:45–11:00 AM. Have tickets downloaded/printed and be at the boarding dock by 11:45 AM.',
      cut: 'Do not cut or move this stop without intentionally changing reservation 4184612.', official: VERIFIED_MALIGNE_CRUISE.link,
      tag: 'BOOKED • Sep 28 • 12:00 PM'
    });

    const gondola = SPOT_INFO.gondola || (SPOT_INFO.gondola = {});
    Object.assign(gondola, {
      parking: 'Sulphur Mountain general parking is paid (C$17.50 in 2026), very limited and not reservable. Prefer the included Downtown Banff / Roam Route 1 ride after pre-purchasing the Gondola ticket.',
      parkingRating: 'Paid • Limited • No reservation',
      todo: 'This is Sep 29 Option A only. Check summit visibility Sep 28 evening / Sep 29 morning; if clear, use the Gondola. If cloud/fog blocks the summit, use Natural Bridge + Emerald Lake instead.'
    });

    const johnston = SPOT_INFO.johnston || (SPOT_INFO.johnston = {});
    Object.assign(johnston, {
      parking: 'Johnston Canyon P1/P2 are first-come, first-served; no parking reservation. Roadside parking is prohibited. Use Castle Junction for legal vehicle access during the Sep 1–Oct 6 restriction.',
      parkingRating: 'First-come • Can fill • No reservation'
    });

    const parkride = SPOT_INFO.parkride || (SPOT_INFO.parkride = {});
    Object.assign(parkride, {
      parking: 'Free parking at Lake Louise Park & Ride (1 Whitehorn Rd) is included with a valid Parks Canada shuttle reservation. No separate parking reservation is needed.',
      parkingRating: 'FREE with shuttle reservation',
      todo: 'Use the BOOKED Sep 26 8:00–9:00 AM window. Check in at Park & Ride, go to Lake Louise FIRST, then use the Lake Connector to Moraine; carry screenshots because service is limited.'
    });

    const canyon = SPOT_INFO.malignecanyon || (SPOT_INFO.malignecanyon = {});
    Object.assign(canyon, {
      title: 'Maligne Canyon — CLOSED 2026', photoQuery: 'Maligne Canyon Jasper', time: 'Closed', rating: 'CLOSED', timingOptions: [],
      parking: 'Do not route to the canyon closure area.', parkingRating: 'CLOSED', bestWindow: 'No visitor access in 2026',
      restrooms: 'Do not plan canyon facilities', cell: 'Not relevant — closed area', effort: 'Access prohibited',
      desc: 'Parks Canada confirms Maligne Canyon remains closed for the 2026 season during wildfire recovery.',
      todo: 'Bypass Maligne Canyon. Continue on the legal/open Maligne Road itinerary toward Medicine Lake and Maligne Lake.',
      reviews: 'Rechecked Sep 1, 2026 against Parks Canada recovery information and the active 2026 closure status.',
      cut: 'Hard exclusion — this location never enters the active route or ETA chain.', official: CLOSED_2026[0].official,
      tag: 'CLOSED 2026 • Wildfire recovery'
    });

    SPOT_INFO.cavellroad = {
      title: 'Cavell Road / Mount Edith Cavell — CLOSED 2026', photoQuery: 'Mount Edith Cavell Jasper', time: 'Closed', rating: 'CLOSED', timingOptions: [],
      parking: 'Do not route onto Cavell Road or into the Edith Cavell area.', parkingRating: 'CLOSED', bestWindow: 'No visitor access in 2026',
      restrooms: 'Do not plan facilities in the closed area', cell: 'Not relevant — closed area', effort: 'Access prohibited',
      desc: 'Parks Canada confirms Cavell Road and the Mount Edith Cavell area remain closed for the 2026 season during wildfire recovery.',
      todo: 'Use other Jasper/Parkway sights. Path of the Glacier and Cavell Meadows are also closed.',
      reviews: 'Rechecked Sep 1, 2026 against Parks Canada recovery information and the active 2026 closure status.',
      cut: 'Hard exclusion — this location never enters the active route or ETA chain.', official: CLOSED_2026[1].official,
      tag: 'CLOSED 2026 • Wildfire recovery'
    };

    for (let i = CATALOG.length - 1; i >= 0; i--) if (isHardClosed2026(CATALOG[i])) CATALOG.splice(i, 1);

    ensureTask('shuttle-alarm', {
      title: 'Lake Louise + Moraine shuttle — BOOKED', due: '2026-09-26T08:00:00-06:00',
      detail: 'Sep 26 • 8:00–9:00 AM • 3 adults • paid. Check in at Park & Ride, go to Lake Louise FIRST, then use the Lake Connector to Moraine.',
      link: 'https://reservation.pc.gc.ca/', bookId: 'shuttle'
    });
    ensureTask('gondola-weather-book', {
      title: 'Sep 29 weather choice — book Gondola only if clear', due: '2026-09-28T20:00:00-06:00',
      detail: 'The Gondola moved off Sep 26. Check Sep 29 summit visibility; clear = Gondola, cloud/fog = Natural Bridge + Emerald Lake. Buy only after making that call.',
      link: 'https://www.banffjaspercollection.com/attractions/banff-gondola/', bookId: 'gondola'
    });
    ensureTask('park-extension', {
      title: 'Sep 29 park-pass contingency only', due: '2026-09-29T12:00:00-06:00',
      detail: 'The selected Sep 29 plan leaves Banff around 3:15 PM or Yoho around 2:30 PM. No extension is planned. Buy another day only if delays keep you inside the national parks after the printed pass expires.',
      link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes', bookId: 'park'
    });
    ensureTask('rental-early-return', {
      title: 'Confirm 4:45 PM early rental return', due: '2026-09-26T01:30:00-06:00',
      detail: 'Ascent voucher lists Sep 30 at 6:00 PM, but the selected plan targets 4:45 PM for the 7:10 PM WestJet flight. Confirm the early-return handoff procedure at pickup.',
      link: 'tel:+16044164600', bookId: 'rental'
    });
  }

  function showClosedToast(rule) { toast(rule.title + ' is closed for the 2026 season and cannot be added to the route.'); }
  function closureBannerHtml() {
    return '<aside class="closure-strip"><div><b>2026 wildfire-recovery closures</b><span>Maligne Canyon and Cavell Road / Mount Edith Cavell are hard-excluded. Maligne Lake and Valley of the Five Lakes remain usable.</span></div>' +
      '<div class="closure-links"><a href="' + CLOSED_2026[0].official + '" target="_blank">Maligne Canyon</a><a href="' + CLOSED_2026[1].official + '" target="_blank">Cavell</a><a href="' + BULLETIN + '" target="_blank">Parks bulletin</a></div></aside>';
  }
  function injectBanner(target) { if (target && !target.querySelector('.closure-strip')) target.insertAdjacentHTML('afterbegin', closureBannerHtml()); }
  function injectCss() {
    if (document.getElementById('closurePolicyCss')) return;
    const st = document.createElement('style'); st.id = 'closurePolicyCss';
    st.textContent = '.closure-strip{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 0 12px;margin-bottom:8px;border-bottom:1px solid #6a5035;color:#d9e4ea}.closure-strip b{display:block;font-size:11px;color:#e7c48c;margin-bottom:2px}.closure-strip span{display:block;font-size:9.5px;color:#9fb2bd;line-height:1.4}.closure-links{display:flex;gap:12px;flex:0 0 auto}.closure-links a{font-size:9px;color:#c7d9e4;text-decoration:none}.closure-links a:hover{text-decoration:underline;color:#fff}.closed-2026-pill{display:inline-flex;align-items:center;border:1px solid #7a5b39;color:#e7c48c;border-radius:6px;padding:2px 5px;font-size:8px;font-weight:800}@media(max-width:768px){.closure-strip{display:block;padding:8px 2px 10px}.closure-links{margin-top:7px;overflow-x:auto;white-space:nowrap}}';
    document.head.appendChild(st);
  }

  function patchRouting() {
    const oldCompute = computeDayTimeline;
    computeDayTimeline = function (day) {
      if (!day || !day.stops || !day.stops.some(isHardClosed2026)) return oldCompute(day);
      const clone = deepClone(day); clone.stops.forEach(enforceStop); return oldCompute(clone);
    };
    const oldGoogleRoute = googleRouteUrl;
    googleRouteUrl = function (stops) { return oldGoogleRoute((stops || []).filter(function (s) { return !isHardClosed2026(s); })); };
    const oldInsertStop = insertStop;
    insertStop = function (stop) { const rule = closureFor(stop); if (rule) { showClosedToast(rule); return false; } return oldInsertStop(stop); };
    const oldAddCatalogStop = addCatalogStop;
    addCatalogStop = function (id) { const item = CATALOG.find(function (x) { return x.id === id; }); const rule = closureFor(item || { id: id, name: id }); if (rule) { showClosedToast(rule); return; } return oldAddCatalogStop(id); };
    const oldAddSearchHit = addSearchHit;
    addSearchHit = function (i) { const hit = lastHits[i]; const rule = hit && closureFor(hit.name); if (rule) { showClosedToast(rule); return; } return oldAddSearchHit(i); };
    const oldAddNamed = addNamedCustomStop;
    addNamedCustomStop = function () { const input = document.getElementById('customStopName'); const rule = input && closureFor(input.value); if (rule) { showClosedToast(rule); return; } return oldAddNamed(); };
    const oldRename = renameStop;
    renameStop = function (i, value) { const rule = closureFor(value); if (rule) { showClosedToast(rule); renderDayEditor(); return; } return oldRename(i, value); };
    const oldPriority = setPriority;
    setPriority = function (i, value) {
      const day = getDay(); const stop = day && day.stops[i]; const rule = closureFor(stop);
      if (rule && value !== 'cut') { enforceStop(stop); persist(); renderAll(); showClosedToast(rule); return; }
      return oldPriority(i, value);
    };
  }

  function patchRendering() {
    const oldRenderPlan = renderPlan;
    renderPlan = function () { oldRenderPlan(); injectBanner(document.getElementById('planRoot')); };
    const oldRenderField = renderField;
    renderField = function () { oldRenderField(); injectBanner(document.getElementById('fieldRoot')); };
    const oldRenderAttractions = renderAttractions;
    renderAttractions = function () {
      oldRenderAttractions();
      Array.from(document.querySelectorAll('#attGrid .card.att')).forEach(function (card) {
        if (!/Maligne Lake Classic Cruise|Maligne Lake Cruise \/ Spirit Island/.test(card.textContent || '')) return;
        const input = card.querySelector('input[type="checkbox"]');
        if (input) { input.checked = true; input.disabled = true; input.setAttribute('aria-label', 'Booked Maligne Lake Cruise — locked'); }
      });
    };
    const oldRenderBookings = renderBookings;
    renderBookings = function () {
      oldRenderBookings();
      const row = Array.from(document.querySelectorAll('#bookingRows .bookrow')).find(function (item) { return /WestJet.*YYZ.*YYC/i.test(item.textContent || ''); });
      if (row) {
        const cells = row.children;
        if (cells[3]) cells[3].innerHTML = '<b>C$1,086.53 total</b><small style="display:block;color:var(--muted)">C$966.63 airfare + C$119.90 checked baggage</small>';
        if (cells[4]) cells[4].innerHTML = '<span class="date">fare + 2 checked bags</span>';
      }
    };
    const oldRenderBudget = renderBudget;
    renderBudget = function () {
      oldRenderBudget();
      const rows = Array.from(document.querySelectorAll('#budgetRows tr'));
      const flightRow = rows.find(function (row) { const cell = row.querySelector('td:first-child'); return cell && cell.textContent.trim() === 'Flights'; });
      if (flightRow && flightRow.cells[0]) flightRow.cells[0].textContent = 'Flights + checked baggage';
      const parkRow = rows.find(function (row) { const cell = row.querySelector('td:first-child'); return cell && cell.textContent.trim() === 'Park admission'; });
      if (parkRow && parkRow.cells[0]) parkRow.cells[0].textContent = 'Park admission (incl. Sep 29 extension)';
      const hint = document.getElementById('budgetHint');
      if (hint) {
        const notes = [
          ' WestJet actual includes C$119.90 paid for 2 outbound checked bags (23 kg each).',
          ' Maligne Lake Classic Cruise is locked at C$321.42 for 3 adults (reservation 4184612).',
          ' Park budget includes a planned C$24.50 Sep 29 Family/Group extension.'
        ];
        notes.forEach(function (note) { if (!hint.textContent.includes(note.trim())) hint.textContent += note; });
      }
    };
    const oldRenderMiniMap = renderModalMiniMap;
    renderModalMiniMap = function (stop) {
      const rule = closureFor(stop); if (!rule) return oldRenderMiniMap(stop);
      if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
      const el = document.getElementById('modalMiniMap'); if (!el) return;
      modalMiniMap = L.map(el, { scrollWheelZoom: false }).setView([stop.lat, stop.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(modalMiniMap);
      L.marker([stop.lat, stop.lng]).addTo(modalMiniMap).bindPopup('<b>' + escapeHtml(rule.title) + '</b><br><span style="color:#e7c48c">Closed for 2026 — do not route here.</span><br><a href="' + rule.official + '" target="_blank">Parks Canada closure</a>').openPopup();
    };
    const oldOpenSpotModal = openSpotModal;
    openSpotModal = function (date, id) {
      oldOpenSpotModal(date, id); const found = findStop(date, id); const rule = found && closureFor(found.stop); if (!rule) return;
      const actions = document.getElementById('modalTopActions'); if (actions) actions.innerHTML = '<a class="btn primary small" href="' + rule.official + '" target="_blank">Parks Canada closure</a><a class="btn small" href="' + BULLETIN + '" target="_blank">Closure bulletin</a>';
      const mapActions = document.getElementById('modalMapActions'); if (mapActions) mapActions.innerHTML = '<span class="closed-2026-pill">CLOSED — not routable</span>';
    };
    const oldRenderAll = renderAll;
    renderAll = function () {
      if (!enforcing) {
        enforcing = true;
        const closureChanged = enforceState(S);
        const actualsChanged = applyVerifiedTripActuals(S);
        const cruiseChanged = applyVerifiedMaligneCruise(S);
        const operationalChanged = applyOperationalPlan(S);
        enforcing = false;
        if (closureChanged || actualsChanged || cruiseChanged || operationalChanged) persist();
      }
      oldRenderAll();
      if (document.getElementById('planview') && document.getElementById('planview').classList.contains('on')) injectBanner(document.getElementById('planRoot'));
      if (document.getElementById('fieldview') && document.getElementById('fieldview').classList.contains('on')) injectBanner(document.getElementById('fieldRoot'));
    };
  }

  patchBaseData();
  enforceState(S);
  applyVerifiedTripActuals(S);
  applyVerifiedMaligneCruise(S);
  applyOperationalPlan(S);
  persist();
  injectCss();
  patchRouting();
  patchRendering();

  window.isHardClosed2026 = isHardClosed2026;
  window.jasperClosed2026 = CLOSED_2026;
  window.verifiedTripActuals = VERIFIED_TRIP_ACTUALS;
  window.verifiedMaligneCruise = VERIFIED_MALIGNE_CRUISE;
  window.applyOperationalPlan = applyOperationalPlan;

  renderAll();
})();
