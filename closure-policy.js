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
    travellers: 3, total: 321.42, balanceDue: 0, arriveLake: '11:00 AM', dockBy: '11:45 AM',
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
        name: 'Maligne Lake — Classic Cruise BOOKED 12:00 PM', priority: 'must', stayMin: 150, notBefore: '11:00', bookingLocked: true,
        note: 'Reservation 4184612 • 3 adults • C$321.42 paid • target lake arrival 11:00 AM • dock by 11:45 AM • sailing 12:00 PM • allow up to 15 min extra cruise time.'
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
      detail: 'Classic Cruise • 1.5 hours • arrive at Maligne Lake ~11:00 AM • dock by 11:45 AM • C$321.42 paid • balance C$0.00',
      link: VERIFIED_MALIGNE_CRUISE.link
    }) || changed;
    return changed;
  }

  function applyOperationalPlan(state) {
    if (!state || !state.days) return false;
    let changed = false;
    state.settings = state.settings || {};
    if (Number(state.settings.bufferMin || 0) < 10) { state.settings.bufferMin = 10; changed = true; }

    const d26 = state.days.find(function (d) { return d.date === 'Sep 26'; });
    if (d26) {
      changed = assignChanged(d26, {
        note: 'Arrival-night fatigue is the main risk. 5:45 AM is the target, not a hard requirement; if the group needs more rest, leave later and cut Bow Falls / Surprise Corner first. Protect Minnewanka, Two Jack, clear-weather Gondola, Johnston Canyon and the booked Cochrane hotel.'
      }) || changed;
      const gondola = stopFor(d26, 'gondola');
      if (gondola) changed = assignChanged(gondola, {
        stayMin: 165,
        note: 'Budget ~2h45 door-to-door for parking/transit, boarding queue, ride and summit. Parking at Sulphur Mountain is paid and very limited; no parking reservation. If booked, prefer the included downtown/Roam shuttle. Book the Gondola only after the 24–48h visibility check.'
      }) || changed;
      const johnston = stopFor(d26, 'johnston');
      if (johnston) changed = assignChanged(johnston, {
        stayMin: 120,
        note: 'Use Castle Junction for legal 2026 vehicle access. P1/P2 parking is first-come and can fill; roadside parking is prohibited. No parking reservation is available. If both lots are full, do not burn time circling.'
      }) || changed;
      ['bowfalls', 'surprise'].forEach(function (id) {
        const s = stopFor(d26, id);
        if (s && s.priority !== 'nice') { s.priority = 'nice'; changed = true; }
        if (s && !s.note) { s.note = 'CUT FIRST if the fatigue start, Banff parking, Gondola or Johnston Canyon runs late.'; changed = true; }
      });
    }

    const d27 = state.days.find(function (d) { return d.date === 'Sep 27'; });
    if (d27) {
      changed = assignChanged(d27, {
        start: '05:45',
        note: 'Most logistics-sensitive day. Target an 8:00–9:00 AM Parks Canada shuttle window with Moraine Lake FIRST. Free parking is included at the Lake Louise Park & Ride. Model 30–60 min shuttle waits. Protect Moraine + Louise + Peyto + Saskatchewan Crossing fuel + Columbia Icefield; move Bow Lake/Athabasca Falls to Sep 29 and cut Mistaya/Sunwapta if behind.'
      }) || changed;
      const dep = stopFor(d27, 'cochrane27');
      if (dep) changed = assignChanged(dep, { name: 'Super 8 Cochrane — Depart 05:45 for Lake Louise Park & Ride' }) || changed;
      const pr = stopFor(d27, 'parkride');
      if (pr) changed = assignChanged(pr, {
        name: 'Lake Louise Park & Ride — Check-in + Shuttle Queue', stayMin: 45, priority: 'must',
        note: 'SHUTTLE RESERVATION REQUIRED. Check in only within the booked one-hour window. Parking here is free with the shuttle reservation; no separate parking reservation is needed. Plan 30–60 min queue margin.'
      }) || changed;
      const moraine = stopFor(d27, 'moraine');
      if (moraine) changed = assignChanged(moraine, {
        name: 'Moraine Lake + Rockpile (includes connector queue)', stayMin: 105, priority: 'must',
        note: '75 min at Moraine + ~30 min allowance for the first-come Lake Connector queue. Personal vehicles are not permitted.'
      }) || changed;
      const louise = stopFor(d27, 'louise');
      if (louise) changed = assignChanged(louise, {
        name: 'Lake Louise Lakeshore (includes return-shuttle queue)', stayMin: 90, priority: 'must',
        note: '60 min lakeshore + ~30 min allowance for return shuttle queue. Do not drive to lakeshore parking; return to Park & Ride by shuttle.'
      }) || changed;
      if (!stopFor(d27, 'parkride_return')) {
        const louiseIndex = d27.stops.findIndex(function (s) { return s.id === 'louise'; });
        d27.stops.splice(louiseIndex + 1, 0, {
          id: 'parkride_return', name: 'Park & Ride — Back to Car / Gear Reset', lat: 51.4403, lng: -116.1626,
          priority: 'must', stayMin: 10, note: 'Return shuttle complete; load up, use washroom if needed, then start the Parkway.'
        });
        changed = true;
      }
      const bow = stopFor(d27, 'bowlake');
      if (bow) changed = assignChanged(bow, {
        priority: 'cut', stayMin: 15,
        note: 'Primary Bow Lake visit is shifted to Sep 29. Stop northbound only if at least ~30 min ahead of the protected schedule.'
      }) || changed;
      const peyto = stopFor(d27, 'peyto');
      if (peyto) changed = assignChanged(peyto, { priority: 'must', stayMin: 45 }) || changed;
      const mistaya = stopFor(d27, 'mistaya');
      if (mistaya) changed = assignChanged(mistaya, { priority: 'cut', note: 'Optional only if shuttle timing was unusually fast.' }) || changed;
      const sask = stopFor(d27, 'saskcrossing');
      if (sask) changed = assignChanged(sask, {
        stayMin: 20, priority: 'must', name: 'Saskatchewan Crossing — Fuel + Rest + Snack',
        note: 'Operational fuel stop. Do not skip if tank is not comfortably sufficient for Jasper/Hinton.'
      }) || changed;
      const icefield = stopFor(d27, 'icefield');
      if (icefield) changed = assignChanged(icefield, {
        priority: 'must', stayMin: 45,
        note: 'Free viewpoint/Discovery Centre stop only. Paid Icefield Adventure remains unbooked and is not required for this itinerary.'
      }) || changed;
      const sunwapta = stopFor(d27, 'sunwapta');
      if (sunwapta) changed = assignChanged(sunwapta, { priority: 'nice', stayMin: 25, note: 'Cut if daylight or hotel arrival buffer is slipping.' }) || changed;
      const ath = stopFor(d27, 'athfalls');
      if (ath) changed = assignChanged(ath, { priority: 'cut', note: 'Primary Athabasca Falls visit is protected on Sep 29 southbound.' }) || changed;
    }

    const d28 = state.days.find(function (d) { return d.date === 'Sep 28'; });
    if (d28) {
      changed = assignChanged(d28, {
        start: '06:45',
        note: 'Fixed-booking day. Leave Hinton at 6:45 AM. Pyramid is the main pre-cruise photo stop; Patricia is cut. Jasper is fuel/coffee + grab-and-go only. Be LEAVING Jasper by 9:00 AM, keep Medicine Lake short, reach Maligne Lake around 11:00 AM and dock by 11:45 AM for the 12:00 PM booked cruise.'
      }) || changed;
      const dep = stopFor(d28, 'hinton28a'); if (dep) changed = assignChanged(dep, { name: 'Hinton Lodge — Depart 06:45' }) || changed;
      const pyramid = stopFor(d28, 'pyramid'); if (pyramid) changed = assignChanged(pyramid, { stayMin: 35, note: 'Main pre-cruise Jasper lake stop. Shorten to ~20 min if Jasper departure would slip past 9:00 AM.' }) || changed;
      const patricia = stopFor(d28, 'patricia'); if (patricia) changed = assignChanged(patricia, { priority: 'cut', stayMin: 15, note: 'Cut before risking the cruise.' }) || changed;
      const jasper = stopFor(d28, 'jasper'); if (jasper) changed = assignChanged(jasper, {
        name: 'Jasper — Fuel + Coffee + Grab-and-Go', stayMin: 20, priority: 'nice',
        note: 'Hard operational rule: leave Jasper by 9:00 AM. Buy lunch/snacks to take with you; no sit-down lunch before the cruise.'
      }) || changed;
      const medicine = stopFor(d28, 'medicine'); if (medicine) changed = assignChanged(medicine, { stayMin: 15, note: 'On-route photo stop; cap at 15 min before the fixed cruise.' }) || changed;
      const annette = stopFor(d28, 'annette'); if (annette) changed = assignChanged(annette, { priority: 'nice', stayMin: 30, note: 'Post-cruise bonus only. Skip if wildlife/traffic delayed Maligne Road.' }) || changed;
    }

    const d29 = state.days.find(function (d) { return d.date === 'Sep 29'; });
    if (d29) {
      changed = assignChanged(d29, {
        note: 'Long southbound repositioning day. Athabasca Falls is protected; Valley of the Five Lakes and repeat Icefield stops are conditional. Bow Lake is the primary visit if skipped northbound. Yoho remains a true bonus only. Budget an additional C$24.50 Family/Group park day because the existing Sep 28 daily pass expires at 4:00 PM Sep 29.'
      }) || changed;
      const valley = stopFor(d29, 'valley5'); if (valley) changed = assignChanged(valley, { priority: 'nice', stayMin: 80, note: 'Do only if departure/road conditions are on time; cut before jeopardizing the Calgary hotel arrival.' }) || changed;
      const ath = stopFor(d29, 'athfalls'); if (ath) changed = assignChanged(ath, { priority: 'must', stayMin: 35, note: 'Primary Athabasca Falls visit.' }) || changed;
      const ice = stopFor(d29, 'icefield29'); if (ice) changed = assignChanged(ice, { priority: 'cut', stayMin: 45, note: 'Second chance only if Sep 27 weather blocked the Icefield view; do not repeat by default.' }) || changed;
      const bow = stopFor(d29, 'bowlake29'); if (bow) changed = assignChanged(bow, { priority: 'nice', stayMin: 20, name: 'Bow Lake — Primary Visit if Skipped Sep 27', note: 'Use this as the planned Bow Lake stop after shifting it off the shuttle-heavy Sep 27 day.' }) || changed;
    }

    const d30 = state.days.find(function (d) { return d.date === 'Sep 30'; });
    if (d30) {
      changed = assignChanged(d30, {
        note: 'Easy flight day. Calgary sightseeing is optional. Target the Ascent YYC Economy Parking Lot at 4:15 PM, not the voucher\'s 6:00 PM scheduled return, to protect the 7:10 PM WestJet flight. Confirm the early-return procedure with Ascent before the trip.'
      }) || changed;
      const city = stopFor(d30, 'canmore'); if (city) changed = assignChanged(city, { priority: 'cut', enabled: false, note: 'Enable only if everyone wants Calgary and you can still leave downtown by about 3:30 PM.' }) || changed;
      const yyc = stopFor(d30, 'yyc30'); if (yyc) changed = assignChanged(yyc, {
        name: 'YYC — Ascent Return TARGET 4:15 PM + WestJet 7:10 PM', notBefore: '16:15', stayMin: 175,
        note: 'Return is outside the terminal at YYC Economy Parking Lot. Refuel first, photograph car/fuel level, complete handoff and walk to terminal. Voucher says 6:00 PM; confirm early-return process in advance.'
      }) || changed;
    }

    state.costs = state.costs || {};
    if (state.costs.park !== 98.00) { state.costs.park = 98.00; changed = true; }
    if (state.costs.parkExtensionPlanned !== PARK_EXTENSION) { state.costs.parkExtensionPlanned = PARK_EXTENSION; changed = true; }

    state.bookings = state.bookings || [];
    let extension = state.bookings.find(function (b) { return b.id === 'parkExtension'; });
    if (!extension) { extension = { id: 'parkExtension' }; state.bookings.push(extension); changed = true; }
    changed = assignChanged(extension, {
      item: 'Parks Canada • Sep 29 Family/Group entry extension', estimate: 24.50, status: 'Need to buy', actual: '',
      confirm: '', locked: false, bookingGroup: 'parks-canada-extension',
      detail: 'Existing 3-day pass plan covers through Sep 29 at 4:00 PM. Add one C$24.50 Family/Group day pass for the expected late-afternoon/evening park time on Sep 29.',
      link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes'
    }) || changed;

    state.bookings.forEach(function (b, index) { if (b.p !== index + 1) { b.p = index + 1; changed = true; } });
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
      parkingRating: 'No reservation • Arrive around 11:00 AM', bestWindow: 'Sep 28 • 12:00 PM sailing • BOOKED',
      desc: 'Classic 1.5-hour Maligne Lake cruise to the Spirit Island area is booked for 3 adults on Sep 28 at 12:00 PM. Total C$321.42 is paid in full.',
      todo: 'Reach the lake around 11:00 AM. Have tickets downloaded/printed and be at the boarding dock by 11:45 AM.',
      cut: 'Do not cut or move this stop without intentionally changing reservation 4184612.', official: VERIFIED_MALIGNE_CRUISE.link,
      tag: 'BOOKED • Sep 28 • 12:00 PM'
    });

    const gondola = SPOT_INFO.gondola || (SPOT_INFO.gondola = {});
    Object.assign(gondola, {
      parking: 'Sulphur Mountain general parking is paid (C$17.50 in 2026), very limited and not reservable. Prefer the included Downtown Banff / Roam Route 1 ride after pre-purchasing the Gondola ticket.',
      parkingRating: 'Paid • Limited • No reservation',
      todo: 'Check summit visibility 24–48h before. If clear, pre-book the Gondola ticket and use the included downtown/Roam shuttle if practical; budget ~2h45 door-to-door.'
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
      todo: 'Book an 8:00–9:00 AM Sep 27 shuttle window with Moraine Lake FIRST. Check in during that one-hour window; carry screenshots because service is limited.'
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
      title: 'BOOK Moraine + Lake Louise shuttle — REQUIRED', due: '2026-09-25T08:00:00-06:00',
      detail: 'At 8:00 AM Mountain / 10:00 AM Toronto on Sep 25, book the Sep 27 Parks Canada shuttle. Target the 8:00–9:00 AM window and choose Moraine Lake FIRST. Reservation includes both lakes, connector, return trip and free Park & Ride parking. Model 30–60 min waits.',
      link: 'https://reservation.pc.gc.ca/', bookId: 'shuttle'
    });
    ensureTask('gondola-weather-book', {
      title: 'Weather-check + book Banff Gondola if clear', due: '2026-09-24T20:00:00-04:00',
      detail: 'Check the Sep 26 summit forecast/webcam 24–48h before. If visibility looks good, pre-purchase the Gondola ticket. No parking reservation exists; Sulphur Mountain parking is paid/limited, while the Downtown Banff/Roam shuttle is included for pre-booked guests.',
      link: 'https://www.banffjaspercollection.com/attractions/banff-gondola/', bookId: 'gondola'
    });
    ensureTask('park-extension', {
      title: 'Buy Sep 29 park-pass extension', due: '2026-09-29T09:00:00-06:00',
      detail: 'Add one C$24.50 Family/Group daily pass because the existing Sep 28 pass expires at 4:00 PM Sep 29 and the southbound itinerary is expected to remain in Banff/Yoho after that time.',
      link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes', bookId: 'parkExtension'
    });
    ensureTask('rental-early-return', {
      title: 'Confirm 4:15 PM early rental return', due: '2026-09-20T18:00:00-04:00',
      detail: 'Ascent voucher lists Sep 30 at 6:00 PM, but the WestJet flight is 7:10 PM. Confirm that returning around 4:15–4:30 PM at the YYC Economy Parking Lot is accepted and ask for the exact handoff procedure.',
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
