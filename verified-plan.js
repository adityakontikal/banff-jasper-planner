/* Verified Sep 2026 budget-first preset + decision locking layer.
 * Loaded after app.js so it can reuse the existing planner engine without replacing it.
 */
(function () {
  const PRESET_MARK = 'bj-verified-sep2026-preset-v1';

  const VERIFIED_DAYS = [
    {
      date: 'Sep 25', label: 'Toronto → Calgary → Rental pickup • no hotel', start: '00:44', drive: 'Arrival logistics', sleep: 'No hotel — overnight transition',
      note: 'LOCKED: WestJet arrives YYC at 12:44 AM Sep 26 and Ascent pickup is 1:30 AM. No Sep 25 hotel by choice. Current south→north→south route remains unchanged.',
      hotel: null,
      stops: [
        { id: 'yyc25', name: 'YYC arrival 12:44 AM → Ascent rental pickup 1:30 AM', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 15, notBefore: '01:30' }
      ]
    },
    {
      date: 'Sep 26', label: 'YYC → Banff First-Timer Highlights → Cochrane', start: '05:45', drive: 'Via Castle Junction • live road route', sleep: 'Super 8 by Wyndham Cochrane (BOOKED)',
      note: 'No arrival-night hotel. Keep the Banff-first route. IMPORTANT 2026: reach Johnston Canyon by personal vehicle via Castle Junction because the east Bow Valley Parkway is restricted Sep 1–Oct 6. Protect Minnewanka + Two Jack + weather-clear Gondola + Johnston Upper Falls.',
      hotel: { name: 'Super 8 by Wyndham Cochrane', lat: 51.189327, lng: -114.488785 },
      stops: [
        { id: 'cochrane26_dep', name: 'YYC / Ascent rental — Depart 05:45 for Banff', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 0 },
        { id: 'minnewanka', name: 'Lake Minnewanka', lat: 51.2483, lng: -115.4979, priority: 'must', stayMin: 40 },
        { id: 'twojack', name: 'Two Jack Lake', lat: 51.2281, lng: -115.4926, priority: 'must', stayMin: 20 },
        { id: 'banff', name: 'Banff Town (Fast Lunch + Short Walk)', lat: 51.1784, lng: -115.5708, priority: 'nice', stayMin: 45 },
        { id: 'bowfalls', name: 'Bow Falls', lat: 51.1683, lng: -115.5608, priority: 'nice', stayMin: 15 },
        { id: 'surprise', name: 'Surprise Corner Viewpoint', lat: 51.1663, lng: -115.5560, priority: 'nice', stayMin: 10 },
        { id: 'gondola', name: 'Banff Gondola — Sulphur Mountain (weather-gated MUST)', lat: 51.14821, lng: -115.55614, priority: 'must', stayMin: 120, note: 'Strong yes when summit visibility is good. Check forecast/webcam 24–48h before; skip only for poor cloud/visibility.' },
        { id: 'castlejunction26_in', name: 'Castle Junction — Johnston legal-access waypoint', lat: 51.26876, lng: -115.91833, priority: 'must', stayMin: 0, note: '2026 ROUTE: use Castle Junction to reach Johnston Canyon by personal vehicle during the Sep 1–Oct 6 east Bow Valley Parkway restriction.' },
        { id: 'johnston', name: 'Johnston Canyon — Lower + Upper Falls', lat: 51.2450, lng: -115.8400, priority: 'must', stayMin: 120, note: '2026 ACCESS: personal vehicles must reach Johnston Canyon via Castle Junction. East Bow Valley Parkway vehicle access is restricted Sep 1–Oct 6. Recheck Parks Canada bulletin before Sep 26.' },
        { id: 'castlejunction26_out', name: 'Castle Junction — return to Hwy 1', lat: 51.26876, lng: -115.91833, priority: 'must', stayMin: 0, note: 'Return via Castle Junction; do not continue east on the restricted Bow Valley Parkway.' },
        { id: 'cochrane26_ret', name: 'Super 8 by Wyndham Cochrane (Booked • Check-in)', lat: 51.189327, lng: -114.488785, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 27', label: 'Cochrane → Moraine/Louise → Icefields Parkway → Hinton', start: '06:00', drive: '~500 km', sleep: 'Hinton Lodge (Night 1 of 2 • BOOKED)',
      note: 'Hardest day. Budget-first Cochrane start means no true sunrise at Moraine without sacrificing sleep. Reserve Moraine as first destination. Model at least 30 min shuttle waits. After the lakes, protect Bow Lake, Peyto and the free Athabasca Glacier stop; Sunwapta and Mistaya are optional if daylight slips.',
      hotel: { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 },
      stops: [
        { id: 'cochrane27', name: 'Super 8 by Wyndham Cochrane (Depart 06:00)', lat: 51.189327, lng: -114.488785, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'parkride', name: 'Lake Louise Park & Ride — Check-in / Wait', lat: 51.4403, lng: -116.1626, priority: 'must', stayMin: 30 },
        { id: 'moraine', name: 'Moraine Lake + Rockpile (includes connector wait)', lat: 51.3217, lng: -116.1860, priority: 'must', stayMin: 105 },
        { id: 'louise', name: 'Lake Louise Lakeshore (includes return-shuttle wait)', lat: 51.4167, lng: -116.2120, priority: 'must', stayMin: 90 },
        { id: 'parkride_return', name: 'Park & Ride — Back to Car / Gear Reset', lat: 51.4403, lng: -116.1626, priority: 'must', stayMin: 10 },
        { id: 'bowlake', name: 'Bow Lake & Crowfoot Glacier', lat: 51.6827, lng: -116.4650, priority: 'must', stayMin: 20 },
        { id: 'peyto', name: 'Peyto Lake Lookout', lat: 51.7177, lng: -116.5060, priority: 'must', stayMin: 40 },
        { id: 'mistaya', name: 'Mistaya Canyon', lat: 51.9460, lng: -116.7200, priority: 'nice', stayMin: 30 },
        { id: 'saskcrossing', name: 'Saskatchewan Crossing (Fuel / Rest / Snack)', lat: 51.9744, lng: -116.7456, priority: 'must', stayMin: 15 },
        { id: 'icefield', name: 'Columbia Icefield — Free Athabasca Glacier Stop', lat: 52.2203, lng: -117.2249, priority: 'must', stayMin: 45 },
        { id: 'sunwapta', name: 'Sunwapta Falls', lat: 52.5324, lng: -117.6450, priority: 'nice', stayMin: 25 },
        { id: 'hinton27', name: 'Hinton Lodge (Booked • Check-in)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 28', label: 'Hinton → Jasper / Maligne Valley → Hinton', start: '07:00', drive: '~270 km', sleep: 'Hinton Lodge (Night 2 of 2 • BOOKED)',
      note: 'Maligne Lake Cruise is the premium anchor. Pyramid is the worthwhile lake/photo stop; Patricia is cut-first. Jasper is fuel/fast food only. Medicine Lake is on-route. Annette/Edith stay cut unless the cruise day is running early.',
      hotel: { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 },
      stops: [
        { id: 'hinton28a', name: 'Hinton Lodge (Depart 07:00)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'pyramid', name: 'Pyramid Lake & Pyramid Island', lat: 52.9210, lng: -118.1040, priority: 'must', stayMin: 40 },
        { id: 'patricia', name: 'Patricia Lake', lat: 52.9120, lng: -118.0950, priority: 'cut', stayMin: 15 },
        { id: 'jasper', name: 'Jasper Town (Fuel + Fast Food / Grab-and-Go)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 35 },
        { id: 'medicine', name: 'Medicine Lake Viewpoint', lat: 52.8640, lng: -117.8000, priority: 'must', stayMin: 20 },
        { id: 'maligne', name: 'Maligne Lake + Spirit Island Cruise (Classic/Premium TBD)', lat: 52.7300, lng: -117.6420, priority: 'must', stayMin: 150 },
        { id: 'annette', name: 'Lake Annette & Lake Edith', lat: 52.8840, lng: -118.0450, priority: 'cut', stayMin: 25 },
        { id: 'hinton28b', name: 'Hinton Lodge (Return & Sleep)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 29', label: 'Hinton → Jasper / Parkway South → Yoho Option → Calgary Airport Hotel', start: '06:30', drive: '~540 km', sleep: 'Holiday Inn Calgary-Airport by IHG (BOOKED)',
      note: 'Second-chance + choice day. The southbound Parkway plan stays intact; after the final scenic/Yoho choice, continue to the booked Holiday Inn Calgary-Airport. This adds some driving tonight but removes the Cochrane→Calgary transfer on flight day.',
      hotel: { name: 'Holiday Inn Calgary-Airport by IHG', lat: 51.06593, lng: -114.01186 },
      stops: [
        { id: 'hinton29', name: 'Hinton Lodge (Depart 06:30)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'jasper29', name: 'Jasper (Southbound Fuel + Snacks)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 25 },
        { id: 'valley5', name: 'Valley of the Five Lakes — Emerald Loop Option', lat: 52.8450, lng: -118.0550, priority: 'nice', stayMin: 110, choiceGroup: 'sep29bonus' },
        { id: 'athfalls', name: 'Athabasca Falls', lat: 52.6634, lng: -117.8830, priority: 'must', stayMin: 35 },
        { id: 'stutfield', name: 'Stutfield Glacier Viewpoint', lat: 52.2620, lng: -117.2860, priority: 'nice', stayMin: 10 },
        { id: 'icefield29', name: 'Columbia Icefield — Second Chance / Adventure Option', lat: 52.2203, lng: -117.2249, priority: 'nice', stayMin: 45, choiceGroup: 'sep29bonus' },
        { id: 'waterfowl', name: 'Waterfowl Lakes', lat: 51.8450, lng: -116.6390, priority: 'nice', stayMin: 10 },
        { id: 'bowlake29', name: 'Bow Lake (Repeat only if Sep 27 weather was poor)', lat: 51.6827, lng: -116.4650, priority: 'cut', stayMin: 15 },
        { id: 'naturalbridge', name: 'Natural Bridge — Kicking Horse River (Yoho Option)', lat: 51.381632, lng: -116.530455, priority: 'nice', stayMin: 20, choiceGroup: 'sep29bonus' },
        { id: 'emerald', name: 'Emerald Lake (Yoho Option)', lat: 51.44321, lng: -116.53153, priority: 'nice', stayMin: 60, choiceGroup: 'sep29bonus' },
        { id: 'cochrane29', name: 'Holiday Inn Calgary-Airport by IHG (Booked • Check-in)', lat: 51.06593, lng: -114.01186, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 30', label: 'Calgary Airport Hotel → Calgary Optional → YYC → Toronto', start: '10:00', drive: '~30 km', sleep: 'Home',
      note: 'Wake up already in Calgary at the booked Holiday Inn Calgary-Airport. Calgary sightseeing remains optional. Keep the 4:45 PM Ascent rental-return target for the booked 7:10 PM WestJet flight.',
      hotel: null,
      stops: [
        { id: 'cochrane30', name: 'Holiday Inn Calgary-Airport by IHG (Depart 10:00)', lat: 51.06593, lng: -114.01186, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'canmore', name: 'Calgary Downtown / Prince\'s Island (Only if flight timing leaves room)', lat: 51.0550, lng: -114.0700, priority: 'cut', stayMin: 90 },
        { id: 'yyc30', name: 'YYC — Rental Return 4:45 PM + WestJet 7:10 PM', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 145, notBefore: '16:45' }
      ]
    }
  ];

  const VERIFIED_DECISIONS = {
    lakeLouise: 'shoreline',
    maligne: 'book',
    pyramid: 'pyramid',
    icefield: 'nice-no-pass',
    gondola: 'yes',
    sep29bonus: 'pending',
    shuttle: 'pending'
  };

  function replaceStopPriority(day, id, priority) {
    const d = day && day.stops ? day : null;
    const st = d && d.stops.find(function (x) { return x.id === id; });
    if (st) st.priority = priority;
  }

  function applyRoutePlaceIntegrity(state) {
    if (!state || !state.days) return state;

    const d26 = state.days.find(function (d) { return d.date === 'Sep 26'; });
    if (d26) {
      let gondolaStop = d26.stops.find(function (s) { return s.id === 'gondola'; });
      const gondolaData = {
        id: 'gondola',
        name: 'Banff Gondola — Sulphur Mountain (weather-gated MUST)',
        lat: 51.14821,
        lng: -115.55614,
        priority: 'must',
        stayMin: 120,
        note: 'Strong yes when summit visibility is good. Check forecast/webcam 24–48h before; skip only for poor cloud/visibility.'
      };
      if (!gondolaStop) {
        gondolaStop = gondolaData;
        const johnstonIndex = d26.stops.findIndex(function (s) { return s.id === 'johnston'; });
        d26.stops.splice(johnstonIndex >= 0 ? johnstonIndex : Math.max(0, d26.stops.length - 1), 0, gondolaStop);
      } else {
        Object.assign(gondolaStop, gondolaData);
      }

      const castleDataIn = {
        id: 'castlejunction26_in',
        name: 'Castle Junction — Johnston legal-access waypoint',
        lat: 51.26876,
        lng: -115.91833,
        priority: 'must',
        stayMin: 0,
        note: '2026 ROUTE: use Castle Junction to reach Johnston Canyon by personal vehicle during the Sep 1–Oct 6 east Bow Valley Parkway restriction.'
      };
      const castleDataOut = {
        id: 'castlejunction26_out',
        name: 'Castle Junction — return to Hwy 1',
        lat: 51.26876,
        lng: -115.91833,
        priority: 'must',
        stayMin: 0,
        note: 'Return via Castle Junction; do not continue east on the restricted Bow Valley Parkway.'
      };
      let castleIn = d26.stops.find(function (s) { return s.id === 'castlejunction26_in'; });
      let castleOut = d26.stops.find(function (s) { return s.id === 'castlejunction26_out'; });
      const johnstonIndexNow = d26.stops.findIndex(function (s) { return s.id === 'johnston'; });
      if (!castleIn) {
        castleIn = castleDataIn;
        d26.stops.splice(johnstonIndexNow >= 0 ? johnstonIndexNow : Math.max(0, d26.stops.length - 1), 0, castleIn);
      } else {
        Object.assign(castleIn, castleDataIn);
      }
      const johnstonIndexAfterIn = d26.stops.findIndex(function (s) { return s.id === 'johnston'; });
      if (!castleOut) {
        castleOut = castleDataOut;
        d26.stops.splice(johnstonIndexAfterIn >= 0 ? johnstonIndexAfterIn + 1 : Math.max(0, d26.stops.length - 1), 0, castleOut);
      } else {
        Object.assign(castleOut, castleDataOut);
      }
    }

    const d29 = state.days.find(function (d) { return d.date === 'Sep 29'; });
    if (d29) {
      let emerald = d29.stops.find(function (s) { return s.id === 'emerald'; });
      if (emerald) {
        Object.assign(emerald, {
          name: 'Emerald Lake (Yoho Option)',
          lat: 51.44321,
          lng: -116.53153,
          priority: 'nice',
          stayMin: 60,
          choiceGroup: 'sep29bonus'
        });
      }
      let bridge = d29.stops.find(function (s) { return s.id === 'naturalbridge'; });
      if (!bridge) {
        bridge = {
          id: 'naturalbridge',
          name: 'Natural Bridge — Kicking Horse River (Yoho Option)',
          lat: 51.381632,
          lng: -116.530455,
          priority: 'nice',
          stayMin: 20,
          choiceGroup: 'sep29bonus'
        };
        const emeraldIndex = d29.stops.findIndex(function (s) { return s.id === 'emerald'; });
        d29.stops.splice(emeraldIndex >= 0 ? emeraldIndex : Math.max(0, d29.stops.length - 1), 0, bridge);
      } else {
        Object.assign(bridge, {
          name: 'Natural Bridge — Kicking Horse River (Yoho Option)',
          lat: 51.381632,
          lng: -116.530455,
          priority: 'nice',
          stayMin: 20,
          choiceGroup: 'sep29bonus'
        });
      }

      const yohoOn = !!(state.decisions && state.decisions.sep29bonus === 'yoho');
      if (emerald) emerald.enabled = yohoOn;
      if (bridge) bridge.enabled = yohoOn;
    }

    state.decisions = state.decisions || deepClone(VERIFIED_DECISIONS);
    const gondolaAtt = (state.attractions || []).find(function (a) { return a.id === 'banffGondola'; });
    if (state.activePreset !== 'core') {
      state.decisions.gondola = state.decisions.gondola === 'pass' ? 'pass' : 'yes';
      if (gondolaAtt) {
        gondolaAtt.selected = true;
        gondolaAtt.rating = '9/10';
        gondolaAtt.rec = 'MUST — IF VISIBILITY IS GOOD';
        gondolaAtt.desc = 'Strong yes in clear weather: Sulphur Mountain summit + boardwalk. Keep budget reserved until the 24–48h weather check.';
        gondolaAtt.skip = 'Skip only if cloud/fog ruins summit visibility.';
      }
    } else {
      state.decisions.gondola = 'no';
      if (d26) {
        const coreGondolaStop = d26.stops.find(function (s) { return s.id === 'gondola'; });
        if (coreGondolaStop) coreGondolaStop.priority = 'cut';
      }
      if (gondolaAtt) gondolaAtt.selected = false;
    }
    state.presetVersion = 'verified-2026-09-01-v3';
    return state;
  }

  function patchDaylight() {
    // Route-appropriate late-September daylight. Banff values come from Banff;
    // Jasper-heavy days use Jasper values so the load meter is not overly optimistic.
    SUN['Sep 25'] = { rise: '07:33', set: '19:33' };
    SUN['Sep 26'] = { rise: '07:35', set: '19:30' };
    SUN['Sep 27'] = { rise: '07:36', set: '19:15' }; // Banff/Louise sunrise; Jasper-side sunset
    SUN['Sep 28'] = { rise: '07:23', set: '19:13' }; // Jasper
    SUN['Sep 29'] = { rise: '07:24', set: '19:24' }; // Jasper start; southbound toward Banff/Yoho
    SUN['Sep 30'] = { rise: '07:41', set: '19:21' };
  }

  function patchBase() {
    BASE.presetVersion = 'verified-2026-09-01-v3';
    BASE.activePreset = 'verified';
    BASE.settings.title = 'Banff → Jasper Road Trip — Verified Budget-First';
    BASE.settings.globalNote = 'Verified Sep 1, 2026. Official-source audit active. Budget target C$3,000–3,500 comfortable; C$4,000–4,500 hard ceiling. Protect sleep and first-timer core; follow current Parks Canada access/closure rules. Must = core; Nice = consider/choose; Cut = sacrifice first.';
    BASE.settings.lunchMin = 30;
    BASE.settings.bufferMin = 8;
    BASE.costs.food = 360;
    BASE.costs.fuel = 260;
    BASE.costs.misc = 50;
    BASE.days = deepClone(VERIFIED_DAYS);
    BASE.decisions = deepClone(VERIFIED_DECISIONS);
    applyRoutePlaceIntegrity(BASE);
    if (typeof applyLockedWestJetFlights === 'function') applyLockedWestJetFlights(BASE);
    if (typeof applyLockedAscentRental === 'function') applyLockedAscentRental(BASE);
    if (typeof applyLockedSpotHeroParking === 'function') applyLockedSpotHeroParking(BASE);
    if (typeof applyLockedHotelBookings === 'function') applyLockedHotelBookings(BASE);
    if (typeof applyLockedParkPass === 'function') applyLockedParkPass(BASE);

    // NICE classification is permanent; enabled only controls whether it participates
    // in the live route. Never promote a selected NICE stop to MUST.
    const niceOnByDefault = new Set(['banff', 'jasper', 'jasper29']);
    BASE.days.forEach(function (day) {
      day.stops.forEach(function (st) {
        if (st.priority === 'nice') st.enabled = niceOnByDefault.has(st.id);
      });
    });

    const maligne = BASE.attractions.find(function (a) { return a.id === 'maligneCruise'; });
    if (maligne) {
      maligne.selected = true;
      maligne.time = 2.5;
      maligne.rec = 'LOCKED #1 PAID PICK';
      maligne.desc = 'Spirit Island cruise is protected; exact Classic vs Premium product and departure remain to be booked.';
    }
    const ice = BASE.attractions.find(function (a) { return a.id === 'icefieldAdventure'; });
    if (ice) {
      ice.selected = false;
      ice.time = 2.75;
      ice.rec = 'NICE — MOSTLY SKIP WITHOUT PASS';
      ice.desc = '2.5–3h Ice Explorer + glacier walk + Skywalk. Keep as a Sep 29 choice, not a default.';
    }
    const gondola = BASE.attractions.find(function (a) { return a.id === 'banffGondola'; });
    if (gondola) {
      gondola.selected = true;
      gondola.rating = '9/10';
      gondola.rec = 'MUST — IF VISIBILITY IS GOOD';
      gondola.desc = 'Strong yes in clear weather: Sulphur Mountain summit + boardwalk. Keep budget reserved until the 24–48h weather check.';
      gondola.skip = 'Skip only if cloud/fog ruins summit visibility.';
    }
    if (!BASE.attractions.some(function (a) { return a.id === 'pursuitPass'; })) {
      BASE.attractions.unshift({
        id: 'pursuitPass', name: 'Pursuit Pass Rockies', day: 'Multi-day', cost: 957, time: 0, type: 'paid', rating: '4/10 for this trip',
        rec: 'SKIP BY DEFAULT', selected: false,
        desc: 'Bundle is only worth reconsidering if you deliberately decide to use several included attractions. It does not replace park admission or Moraine/Louise transport.',
        skip: 'You keep all core natural sights and can buy Maligne Cruise separately.',
        link: 'https://www.banffjaspercollection.com/attractions/pursuit-pass/'
      });
    }

  }

  const VERIFIED_INFO = {
    johnston: {
      time: '2 hr to Upper Falls (official)',
      timingOptions: [{ label: 'Lower Falls only — official ~1h', min: 60 }, { label: 'Lower + Upper Falls — official ~2h', min: 120 }],
      effort: '2.4 km one way • 215 m gain to Upper Falls',
      parking: 'Use Johnston Canyon designated P1/P2 only. Sep 1–Oct 6, 2026 personal vehicles must access Johnston Canyon via Castle Junction because the east Bow Valley Parkway is restricted.',
      parkingRating: 'Busy — have a fallback',
      desc: 'First-timer must. Narrow canyon catwalks lead to Lower Falls and the 30 m Upper Falls. Your preset protects the full Upper Falls hike.',
      todo: 'Do Lower Falls, continue to Upper Falls, then turn around. Ink Pots are intentionally excluded from this compressed trip.',
      cut: 'If the day is badly delayed, downgrade to Lower Falls (~1h) before removing the stop entirely.',
      reviews: 'Verified Sep 1, 2026: Lower Falls ~1.1 km one way / ~1h round trip; Upper Falls ~2.4 km one way / ~2h. Current access for personal vehicles is via Castle Junction; east Bow Valley Parkway vehicle restriction runs Sep 1–Oct 6.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking'
    },
    parkride: {
      time: '30–60+ min check-in / wait',
      parking: 'Free parking for reservation holders at Lake Louise Park & Ride, 1 Whitehorn Road. The trip must begin and end here for regular Parks Canada shuttles.',
      desc: 'Mandatory transit node for the budget-first Moraine + Louise plan. Reservation holders check in here during their 1-hour departure window.',
      todo: 'Arrive inside the booked window, check in, screenshot tickets on every phone, use washroom, then board toward Moraine first.',
      cut: 'Never compress this below the time you actually need to check in. Parks Canada warns waits of at least 30 min and up to 1h during high ridership.',
      reviews: 'Verified 2026: 60% of seats release at 8:00 AM MDT two days before departure; regular shuttles run 6:30 AM–5 PM; last return 7:30 PM.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise'
    },
    moraine: {
      time: '75 min visit + model ~30 min connector wait',
      timingOptions: [{ label: 'Rockpile only', min: 75 }, { label: 'Rockpile + extra shoreline / connector buffer', min: 105 }],
      parking: 'Personal vehicles are prohibited year-round. Use Parks Canada shuttle, Roam Super Pass, or a licensed commercial operator.',
      parkingRating: 'Shuttle only',
      cell: 'No cell / Wi-Fi at the lake (official)',
      effort: 'Short Rockpile climb + easy shoreline',
      desc: 'Top-tier first-timer must. The Rockpile gives the classic Valley of the Ten Peaks view and is worth protecting even on the hardest day.',
      todo: 'Go straight to Rockpile, enjoy the viewpoint, then use remaining time for a short shoreline look. Do not add a long hike on this day.',
      cut: 'Never cut Moraine. If the day is late, remove Mistaya, Sunwapta and other nice stops first.',
      reviews: 'Verified 2026: Moraine regular shuttles run every 30 min from 6:30 AM–5 PM; the Lake Connector runs 7 AM–6 PM. No personal-car access.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise'
    },
    louise: {
      time: '60 min full Lakeshore Trail (official)',
      timingOptions: [{ label: 'Chateau + short lakeshore look', min: 40 }, { label: 'Full Lakeshore Trail — official ~1h', min: 60 }, { label: 'Lake Agnes — official 2.5–3h (not recommended this day)', min: 165 }],
      effort: 'Lakeshore 2.3 km one way • minimal elevation',
      desc: 'First-timer must. The verified preset intentionally keeps Lake Louise to the flat lakeshore so the Icefields Parkway still has useful daylight.',
      todo: 'Walk enough of the lakeshore to get beyond the Chateau crowd; do not start Lake Agnes or Plain of Six Glaciers on Sep 27.',
      cut: 'Shorten to 40 min if shuttle waits run long; do not remove the lake itself.',
      reviews: 'Verified: Parks Canada lists Lakeshore at 2.3 km one way / ~1h round trip; Lake Agnes is 2.5–3h and Plain of Six Glaciers ~4h.',
      official: 'https://parks.canada.ca/-/media/pn-np/ab/banff/wet4/visit/depliants-brochures/2025-maps-of-the-lake-louise-area.pdf'
    },
    peyto: {
      time: '30 min official trail + parking/photo buffer',
      timingOptions: [{ label: 'Official lookout trail + photo', min: 40 }, { label: 'Bow Summit extension — official ~2.5h (skip)', min: 150 }],
      effort: '0.6 km one way • ~30 m gain',
      desc: 'First-timer must and one of the highest scenery-to-time stops on the route. The preset only does the main lookout.',
      todo: 'Use the main Peyto Lake Lookout, get the classic view, then return to the car. Do not continue to Bow Summit on this trip.',
      cut: 'Only cut for genuinely unsafe weather / zero visibility.',
      reviews: 'Verified: Parks Canada lists Peyto Lake Lookout at 0.6 km one way and ~30 min round trip.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking'
    },
    mistaya: {
      time: '30 min official',
      effort: '0.6 km one way • short descent/climb back',
      desc: 'Good canyon, but correctly classified NICE because Sep 27 already contains much stronger first-time highlights.',
      reviews: 'Verified: Parks Canada lists Mistaya Canyon at 0.6 km one way and ~30 min round trip.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking'
    },
    saskcrossing: {
      time: '15 min fuel / restroom / snack',
      desc: 'Operational stop, not sightseeing. This is the only public fuel station mid-Parkway in summer.',
      todo: 'Fuel if useful, restroom, quick snacks, then leave. Carry food/water so you are not dependent on service speed.',
      reviews: 'Verified: Parks Canada says fuel up before leaving Lake Louise/Jasper and lists one summer gas station at Saskatchewan River Crossing.',
      official: 'https://parks.canada.ca/pn-np/ab/banff/visit/promenadedesglaciers-icefieldsparkway'
    },
    icefield: {
      time: '45 min free stop / 2.5–3h paid Adventure',
      timingOptions: [{ label: 'Free glacier / forefield stop', min: 45 }, { label: 'Discovery Centre + free viewpoint', min: 60 }, { label: 'Ice Explorer + Skywalk — 2.5–3h', min: 165 }],
      cell: 'No year-round Parkway coverage; limited seasonal coverage near Icefield',
      desc: 'Free Athabasca Glacier / Columbia Icefield view is a MUST. The paid Icefield Adventure is only NICE and is mostly skipped unless you later buy the Pursuit Pass or deliberately choose it Sep 29.',
      todo: 'Sep 27: do the free glacier/forefield stop. Sep 29: use the paid Adventure only if it wins the day’s optional-choice fork.',
      cut: 'Never cut the free first view if visibility is good. Cut the paid Adventure before sacrificing core scenery.',
      reviews: 'Verified 2026: Pursuit lists the Icefield Adventure at 2.5–3h; Sep 7–30 operating hours are 9 AM–5 PM, weather dependent.',
      official: 'https://prod.banffjaspercollection.com/attractions/columbia-icefield-adventure/'
    },
    sunwapta: {
      time: '20–30 min planning dwell',
      desc: 'Strong waterfall but NICE northbound because the lake-shuttle block can consume much of Sep 27. Keep it if daylight is healthy.',
      todo: 'Use the paved main-falls route for a quick look; do not add Lower Sunwapta hike on this schedule.',
      reviews: 'Current 2026 Jasper trail report lists the main Sunwapta Falls route open/good; treat the 25 min dwell as a planning estimate, not an official duration.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/etat-sentiers-trail-conditions'
    },
    athfalls: {
      time: '30–40 min planning dwell',
      desc: 'Protected first-timer MUST, moved to Sep 29 so Sep 27 does not pretend every major waterfall fits after a long shuttle morning.',
      todo: 'Walk the paved viewpoints around the gorge and falls. Stay behind railings and use designated paths.',
      reviews: 'Current 2026 Jasper trail report lists Athabasca Falls open/good with a paved trail; 35 min is the preset planning dwell.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/etat-sentiers-trail-conditions'
    },
    pyramid: {
      time: '35–45 min',
      desc: 'The Jasper lake stop worth protecting: Pyramid Island + the footbridge + Pyramid Mountain backdrop. Patricia is the quick/cut alternative.',
      cut: 'If the morning is late, keep Pyramid and cut Patricia entirely.',
      reviews: 'Verified route strategy: Hinton → Pyramid is roughly 82 km / about 1h03 in current route references. Keep the visit compact so Maligne remains the anchor.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper'
    },
    medicine: {
      time: '15–25 min',
      desc: 'On-route geological stop before Maligne. By late September the disappearing-lake effect can be especially visible as inflow drops.',
      todo: 'Quick viewpoint + interpretive look; do not turn it into a long stop.',
      reviews: 'Verified: Parks Canada explains that Medicine Lake drains through sinkholes/caves and often recedes markedly in fall.',
      official: 'https://www.parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/medicine'
    },
    maligne: {
      time: '150 min protected trip block',
      timingOptions: [{ label: 'Shoreline only — if cruise cancelled', min: 60 }, { label: 'Classic Cruise + arrival/check-in buffer', min: 150 }, { label: 'Premium Cruise + arrival/check-in buffer', min: 150 }],
      desc: 'Your protected paid cruise anchor. Spirit Island is 14 km up-lake with no road or trail access, which makes the cruise meaningfully different from simply stopping at another viewpoint. Banff Gondola is tracked separately as a weather-gated MUST.',
      todo: 'Choose Classic vs Premium when booking the exact Sep 28 sailing. Arrive onsite at least 30 min early and be at the dock at least 15 min before departure. Keep fuel/snacks handled in Jasper before Maligne Road.',
      cut: 'If the cruise is booked, cut Patricia and Annette/Edith before risking the reservation.',
      reviews: 'Verified Sep 1, 2026: Classic ~1.5h with 15 min near Spirit Island; Premium 2h, adults 16+, adds Pincushion Bay and 30 min near Spirit Island. Sep 7–Oct 3 window is 9 AM–5:30 PM.',
      official: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/location-hours/'
    },
    valley5: {
      time: '110 min planning for Emerald Loop',
      timingOptions: [{ label: 'Wetland Way — 1.8 km easy', min: 40 }, { label: 'Emerald Loop — 5.4 km moderate (plan ~1h50)', min: 110 }, { label: 'Valley Loop — 7.7 km moderate', min: 150 }],
      desc: 'NICE, not must. The 5.4 km Emerald Loop is the worthwhile version because it reaches all five lakes; the preset gives it ~1h50 as a planning estimate for your 1–2h hiking comfort.',
      todo: 'Only do the full Emerald Loop if it wins the Sep 29 optional-choice fork. Do not squeeze it in beside the paid Icefield Adventure.',
      cut: 'Cut completely if weather is poor, legs are tired, or you choose Icefield Adventure / Yoho instead.',
      reviews: 'Verified 2026: Parks Canada lists Wetland Way 1.8 km easy, Emerald Loop 5.4 km moderate, Valley Loop 7.7 km moderate. The ~110 min dwell is our planning estimate.',
      official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/sud-south'
    },
    naturalbridge: {
      time: '15–25 min',
      desc: 'Separate physical stop on Emerald Lake Road. The Kicking Horse River rushes beneath a natural rock bridge; it is not located at Emerald Lake.',
      parking: 'Use the dedicated Natural Bridge day-use parking area and marked viewpoints.',
      cut: 'Keep paired with the Emerald Lake bonus; skip the pair if the southbound day is late.',
      official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/places'
    },
    emerald: {
      time: '45–60 min short visit',
      desc: 'High-value NICE option late Sep 29. Emerald Lake now has its own map point, separate from Natural Bridge.',
      parking: 'Yoho warns Emerald Lake parking is limited and fills quickly. Try later in the day; if the lot is a mess, do not circle and waste the schedule.',
      cut: 'If parking is full, weather is poor, or you chose Valley Five Lakes / Icefield Adventure, continue toward Calgary.',
      reviews: 'Verified 2026: Parks Canada advises that Emerald Lake parking is limited and to arrive early or later in the day.',
      official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/places'
    }
  };

  function patchInfo() {
    Object.keys(VERIFIED_INFO).forEach(function (key) {
      if (SPOT_INFO[key]) Object.assign(SPOT_INFO[key], VERIFIED_INFO[key]);
    });
    if (!SPOT_INFO.parkride_return) {
      SPOT_INFO.parkride_return = {
        title: 'Park & Ride — Back to Car / Gear Reset',
        photoQuery: 'Lake Louise Ski Resort Alberta',
        time: '10 min after shuttle return',
        rating: 'Operational',
        parking: 'Return to the same free Park & Ride lot where you checked in.',
        parkingRating: 'Mandatory return point',
        restrooms: 'Use facilities before starting the Icefields Parkway',
        cell: 'Variable',
        effort: 'Easy',
        desc: 'Explicitly models the return-to-car step that the old itinerary forgot. Regular Parks Canada shuttle trips must begin and end at the Park & Ride.',
        todo: 'Restroom, layers, snacks, offline map check, then start Hwy 93N.',
        cut: 'Do not skip the operational reset; you need the car for the Parkway.',
        reviews: 'Verified 2026: Parks Canada regular shuttle reservations include return to the Park & Ride.',
        official: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise',
        tag: 'Transit • Mandatory'
      };
    }
  }

  function isVerifiedState(state) {
    return !!state && state.presetVersion === 'verified-2026-09-01-v3';
  }

  function preserveProgress(next, old) {
    if (!old) return next;
    const oldBookings = old.bookings || [];
    next.bookings.forEach(function (b) {
      if (b.locked) return;
      const prev = oldBookings.find(function (x) { return x.id === b.id; });
      if (prev) {
        b.status = prev.status;
        b.actual = prev.actual;
        b.confirm = prev.confirm;
      }
    });
    next.checklists = deepClone(old.checklists || {});
    Object.keys(next.hotels || {}).forEach(function (date) {
      if (old.hotels && old.hotels[date]) {
        next.hotels[date].price = old.hotels[date].price;
        const oldName = old.hotels[date].options && old.hotels[date].options[old.hotels[date].choice] ? old.hotels[date].options[old.hotels[date].choice][0] : '';
        const idx = next.hotels[date].options.findIndex(function (o) { return o[0] === oldName; });
        if (idx >= 0) next.hotels[date].choice = idx;
      }
    });
    return next;
  }

  function configurePreset(next, name) {
    next.presetVersion = 'verified-2026-09-01-v3';
    next.activePreset = name;
    next.decisions = deepClone(VERIFIED_DECISIONS);
    const maligne = next.attractions.find(function (a) { return a.id === 'maligneCruise'; });
    const gondola = next.attractions.find(function (a) { return a.id === 'banffGondola'; });
    const ice = next.attractions.find(function (a) { return a.id === 'icefieldAdventure'; });
    const pass = next.attractions.find(function (a) { return a.id === 'pursuitPass'; });
    if (name === 'core') {
      if (maligne) maligne.selected = false;
      if (gondola) gondola.selected = false;
      const coreGondolaStop = next.days.find(function (d) { return d.date === 'Sep 26'; }).stops.find(function (s) { return s.id === 'gondola'; });
      if (coreGondolaStop) coreGondolaStop.priority = 'cut';
      next.decisions.gondola = 'no';
      if (ice) ice.selected = false;
      if (pass) pass.selected = false;
      const st = next.days.find(function (d) { return d.date === 'Sep 28'; }).stops.find(function (s) { return s.id === 'maligne'; });
      if (st) { st.name = 'Maligne Lake Shoreline (Cruise skipped)'; st.stayMin = 60; }
      next.decisions.maligne = 'skip';
    } else if (name === 'pursuit') {
      if (maligne) { maligne.selected = true; maligne.cost = 0; }
      if (gondola) { gondola.selected = true; gondola.cost = 0; }
      if (ice) { ice.selected = true; ice.cost = 0; }
      if (pass) pass.selected = true;
      const st = next.days.find(function (d) { return d.date === 'Sep 29'; }).stops.find(function (s) { return s.id === 'icefield29'; });
      if (st) { st.priority = 'nice'; st.enabled = true; st.stayMin = 165; }
      next.decisions.icefield = 'pass';
      next.decisions.gondola = 'pass';
      next.decisions.sep29bonus = 'icefield';
    }
    return next;
  }

  function applyPreset(name, silent) {
    const label = name === 'core' ? 'Core scenery only' : (name === 'pursuit' ? 'Pursuit-aware' : 'Verified budget-first');
    if (!silent && !confirm('Apply preset: ' + label + '? Booking statuses, actual paid amounts, confirmations and entered hotel prices will be preserved. Itinerary edits and decision answers will reset.')) return;
    let next = configurePreset(deepClone(BASE), name);
    next = preserveProgress(next, S);
    applyRoutePlaceIntegrity(next);
    if (name === 'core') {
      const coreGondolaStop = next.days.find(function (d) { return d.date === 'Sep 26'; }).stops.find(function (s) { return s.id === 'gondola'; });
      const coreGondolaAtt = next.attractions.find(function (a) { return a.id === 'banffGondola'; });
      if (coreGondolaStop) coreGondolaStop.priority = 'cut';
      if (coreGondolaAtt) coreGondolaAtt.selected = false;
      next.decisions.gondola = 'no';
    }
    if (typeof applyLockedWestJetFlights === 'function') applyLockedWestJetFlights(next);
    if (typeof applyLockedAscentRental === 'function') applyLockedAscentRental(next);
    if (typeof applyLockedSpotHeroParking === 'function') applyLockedSpotHeroParking(next);
    if (typeof applyLockedHotelBookings === 'function') applyLockedHotelBookings(next);
    if (typeof applyLockedParkPass === 'function') applyLockedParkPass(next);
    S = next;
    localStorage.setItem(PRESET_MARK, name);
    persist();
    renderAll();
    if (!silent) toast('Applied preset: ' + label);
  }

  function setDecision(id, value) {
    if (!S.decisions) S.decisions = deepClone(VERIFIED_DECISIONS);
    S.decisions[id] = value;

    if (id === 'shuttle') {
      const b = S.bookings.find(function (x) { return x.id === 'shuttle'; });
      if (b && (value === 'booked' || value === 'backup')) b.status = 'Booked';
      if (b && value === 'pending' && ['Not started','Waiting window'].includes(b.status)) b.status = 'Waiting window';
    }
    if (id === 'lakeLouise') {
      const st = S.days.find(function (d) { return d.date === 'Sep 27'; }).stops.find(function (x) { return x.id === 'louise'; });
      // Includes a modeled ~30 min return-shuttle wait in addition to the lake visit.
      if (st) st.stayMin = value === 'quick' ? 70 : (value === 'agnes' ? 195 : 90);
    }
    if (id === 'maligne') {
      const a = S.attractions.find(function (x) { return x.id === 'maligneCruise'; });
      const st = S.days.find(function (d) { return d.date === 'Sep 28'; }).stops.find(function (x) { return x.id === 'maligne'; });
      const reserveBudget = value === 'book' || value === 'hold';
      if (typeof setPaidAttractionSelection === 'function') setPaidAttractionSelection('maligneCruise', reserveBudget);
      else if (a) a.selected = reserveBudget;
      if (st) st.stayMin = reserveBudget ? 150 : 60;
    }
    if (id === 'gondola') {
      const a = S.attractions.find(function (x) { return x.id === 'banffGondola'; });
      const d26 = S.days.find(function (d) { return d.date === 'Sep 26'; });
      const st = d26 && d26.stops.find(function (x) { return x.id === 'gondola'; });
      const on = value !== 'no';
      if (a) a.selected = on;
      if (st) {
        st.priority = on ? 'must' : 'cut';
        if (on) delete st.enabled;
      }
    }
    if (id === 'icefield') {
      const a = S.attractions.find(function (x) { return x.id === 'icefieldAdventure'; });
      const d29 = S.days.find(function (d) { return d.date === 'Sep 29'; });
      const st = d29.stops.find(function (x) { return x.id === 'icefield29'; });
      const on = value === 'pass' || value === 'buy';
      if (a) a.selected = on;
      if (st) {
        st.priority = 'nice';
        st.enabled = on;
        st.stayMin = on ? 165 : 45;
      }
      if (on) {
        d29.stops.forEach(function (other) {
          if (other !== st && other.priority === 'nice' && other.choiceGroup === 'sep29bonus') other.enabled = false;
        });
      }
    }
    if (id === 'sep29bonus') {
      const d = S.days.find(function (x) { return x.date === 'Sep 29'; });
      const valley = d.stops.find(function (x) { return x.id === 'valley5'; });
      const ice = d.stops.find(function (x) { return x.id === 'icefield29'; });
      const bridge = d.stops.find(function (x) { return x.id === 'naturalbridge'; });
      const emerald = d.stops.find(function (x) { return x.id === 'emerald'; });
      const iceAtt = S.attractions.find(function (x) { return x.id === 'icefieldAdventure'; });

      [valley, ice, bridge, emerald].forEach(function (st) {
        if (st) st.priority = 'nice';
      });

      if (value === 'pending') {
        if (valley) valley.enabled = false;
        if (ice) { ice.enabled = false; ice.stayMin = 45; }
        if (bridge) bridge.enabled = false;
        if (emerald) emerald.enabled = false;
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'valley') {
        if (valley) valley.enabled = true;
        if (ice) ice.enabled = false;
        if (bridge) bridge.enabled = false;
        if (emerald) emerald.enabled = false;
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'icefield') {
        if (valley) valley.enabled = false;
        if (ice) { ice.enabled = true; ice.stayMin = 165; }
        if (bridge) bridge.enabled = false;
        if (emerald) emerald.enabled = false;
        if (iceAtt) iceAtt.selected = true;
      } else if (value === 'yoho') {
        if (valley) valley.enabled = false;
        if (ice) ice.enabled = false;
        if (bridge) bridge.enabled = true;
        if (emerald) emerald.enabled = true;
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'core') {
        if (valley) valley.enabled = false;
        if (ice) ice.enabled = false;
        if (bridge) bridge.enabled = false;
        if (emerald) emerald.enabled = false;
        if (iceAtt) iceAtt.selected = false;
      }
    }
    save();
  }

  const DECISION_FLOW = [
    {
      id: 'shuttle', when: 'SEP 25 • 8:00 AM MDT RELEASE', title: 'How are Moraine + Lake Louise locked?',
      detail: '60% of seats release at 8:00 AM MDT two days before Sep 27. Choose Moraine as first destination. Regular shuttles start 6:30 AM; plan at least 30 min waits.',
      options: [
        ['pending', 'Need the 48-hour release', 'Current'],
        ['booked', 'Parks Canada shuttle booked', 'Best'],
        ['backup', 'Licensed commercial backup booked', 'Acceptable']
      ]
    },
    {
      id: 'lakeLouise', when: 'SEP 27 • LAKES', title: 'How deep do you go at Lake Louise?',
      detail: 'The full Lakeshore Trail is ~1h. Lake Agnes is 2.5–3h and would damage the Parkway day.',
      options: [
        ['shoreline', 'Lakeshore only (~60 min)', 'Locked recommendation'],
        ['quick', 'Quick lake look (~40 min)', 'Use only if shuttle waits run long'],
        ['agnes', 'Lake Agnes 2.5–3h', 'Not recommended on this itinerary']
      ]
    },
    {
      id: 'maligne', when: 'SEP 28 • PAID ANCHOR', title: 'Maligne Lake Cruise?',
      detail: 'Spirit Island has no road/trail access. Choose Classic (1.5h) vs Premium (2h, adults 16+, Pincushion Bay) when the exact Sep 28 fare/time is booked. This remains the protected paid anchor.',
      options: [
        ['book', 'Book the best Sep 28 Classic/Premium sailing', 'Protected paid anchor'],
        ['hold', 'Hold until exact price / time', 'Still viable'],
        ['skip', 'Shoreline only', 'Cheapest']
      ]
    },
    {
      id: 'gondola', when: 'SEP 26 • WEATHER GATE', title: 'Banff Gondola — strong yes if visibility is good',
      detail: 'MUST in the working route and budget. Check the summit forecast/webcam 24–48h before; skip only if cloud/fog would erase the view.',
      options: [
        ['yes', 'Strong yes — buy if visibility is good', 'Current plan • ~2h'],
        ['weather', 'Hold budget while waiting for forecast', 'Still stays in route'],
        ['pass', 'Use because Pursuit Pass was bought', 'Bundle case'],
        ['no', 'Skip only for poor visibility', 'Weather fallback']
      ]
    },
    {
      id: 'icefield', when: 'SEP 29 • OPTIONAL', title: 'Icefield Adventure?',
      detail: 'Paid Ice Explorer + glacier walk + Skywalk is 2.5–3h. Free glacier view remains protected on Sep 27.',
      options: [
        ['nice-no-pass', 'Keep NICE; mostly skip without pass', 'Current plan'],
        ['buy', 'Buy à la carte', 'Expensive + 2.5–3h'],
        ['pass', 'Use because Pursuit Pass was bought', 'Bundle case'],
        ['skip', 'Free glacier view only', 'Best budget']
      ]
    },
    {
      id: 'sep29bonus', when: 'SEP 29 • CHOOSE ONE BIG BONUS', title: 'What gets the extra time southbound?',
      detail: 'Do not stack every nice item. Athabasca Falls stays MUST. Pick one bonus after weather, fatigue and Sep 27 completion are known.',
      options: [
        ['pending', 'Leave all three NICE until the trip', 'Default'],
        ['valley', 'Valley of Five Lakes — 5.4 km Emerald Loop', '~1h50 planning'],
        ['icefield', 'Paid Icefield Adventure', '2.5–3h'],
        ['yoho', 'Emerald Lake + Natural Bridge', 'Best if parking is easy late day'],
        ['core', 'No big bonus — just core Parkway', 'Most relaxed / cheapest']
      ]
    }
  ];

  function answerLabel(q, value) {
    const o = q.options.find(function (x) { return x[0] === value; });
    return o ? o[1] : 'Pending';
  }

  function renderLock() {
    const root = document.getElementById('lockRoot');
    if (!root) return;
    if (!S.decisions) S.decisions = deepClone(VERIFIED_DECISIONS);

    const coreBookings = ['return', 'outbound', 'rental', 'yyzParking', 'h25', 'h26', 'h27', 'h28', 'h29', 'park', 'shuttle'];
    const booked = coreBookings.filter(function (id) { return isBooked(id); }).length;
    const answered = DECISION_FLOW.filter(function (q) {
      const v = S.decisions[q.id];
      return v && v !== 'pending' && v !== 'hold' && v !== 'weather' && v !== 'nice-no-pass';
    }).length;
    const totalNow = typeof total === 'function' ? total() : 0;
    const budgetClass = totalNow <= 3500 ? 'ok' : (totalNow <= 4000 ? 'warn' : 'urgent');

    const cards = DECISION_FLOW.map(function (q) {
      const val = S.decisions[q.id] || '';
      const buttons = q.options.map(function (o) {
        return '<button class="lock-choice ' + (val === o[0] ? 'selected' : '') + '" onclick="setVerifiedDecision(\'' + q.id + '\',\'' + o[0] + '\')"><b>' + escapeHtml(o[1]) + '</b><small>' + escapeHtml(o[2]) + '</small></button>';
      }).join('');
      return '<div class="lock-step"><div class="lock-time">' + escapeHtml(q.when) + '</div><div class="lock-copy"><h3>' + escapeHtml(q.title) + '</h3><p>' + escapeHtml(q.detail) + '</p><div class="lock-choices">' + buttons + '</div></div></div>';
    }).join('');

    const hard = [
      ['Return flight booked', isBooked('return')],
      ['Outbound flight booked', isBooked('outbound')],
      ['Rental with workable late pickup booked', isBooked('rental')],
      ['Toronto airport parking booked', isBooked('yyzParking')],
      ['Hotel plan locked: no-hotel Sep 25 + all 4 booked nights confirmed for 3 adults / 2 Queens', ['h25','h26','h27','h28','h29'].every(isBooked)],
      ['Parks Canada 3-day Family/Group pass paid • verify printed dates cover late Sep 29', isBooked('park')],
      ['Moraine/Louise transport reservation locked', isBooked('shuttle') || S.decisions.shuttle === 'booked' || S.decisions.shuttle === 'backup'],
      ['Maligne Cruise decision locked', S.decisions.maligne === 'book' || S.decisions.maligne === 'skip'],
      ['Sep 29 bonus choice locked', S.decisions.sep29bonus && S.decisions.sep29bonus !== 'pending']
    ];
    const hardHtml = hard.map(function (x) {
      return '<div class="final-lock-item ' + (x[1] ? 'done' : '') + '"><span>' + (x[1] ? '✓' : '○') + '</span><b>' + escapeHtml(x[0]) + '</b></div>';
    }).join('');

    root.innerHTML =
      '<div class="lock-hero glass"><div><div class="ey">VERIFIED PRESET • SEP 1, 2026</div><h1>Lock the trip in the order decisions actually happen.</h1><p>MCQs are intentionally time-ordered: booking first, then weather/availability choices, then the Sep 29 bonus fork. Resetting to the verified preset restores every MUST/NICE/CUT classification.</p></div>' +
      '<div class="lock-metrics"><div><small>Core bookings</small><b>' + booked + '/' + coreBookings.length + '</b></div><div><small>Decisions resolved</small><b>' + answered + '/' + DECISION_FLOW.length + '</b></div><div class="' + budgetClass + '"><small>Selected estimate</small><b>' + money(totalNow) + '</b><span>Comfort target C$3k–3.5k</span></div></div></div>' +
      '<div class="lock-grid"><div class="glass panel"><div class="ph"><div><div class="ey">Timeline decision tree</div><h2>Answer these as the trip gets locked</h2></div></div><div class="lock-timeline">' + cards + '</div></div>' +
      '<div><div class="glass panel"><div class="ph"><div><div class="ey">Final lock</div><h2>What must be true before departure</h2></div></div><div class="final-lock-list">' + hardHtml + '</div></div>' +
      '<div class="glass panel"><div class="ph"><div><div class="ey">Budget rule</div><h2>Keep paid extras intentional</h2></div></div><div class="note"><b>Hotels:</b> all nights are resolved and locked. Do not revive alternate-hotel comparisons in presets or saved-state recovery.</div><div class="note" style="margin-top:8px"><b>Paid attractions:</b> Maligne is protected. Gondola is a weather-gated MUST; Icefield Adventure remains NICE/conditional. Pursuit stays off by default.</div><div class="note warn" style="margin-top:8px"><b>Sep 29:</b> Valley Five Lakes, Icefield Adventure and Yoho are alternatives. Pick one big bonus; Athabasca Falls remains core.</div></div></div></div>';
  }

  function injectUi() {
    if (!document.querySelector('[data-view="lockview"]')) {
      const tabs = document.getElementById('tabs');
      const planBtn = tabs && tabs.querySelector('[data-view="planview"]');
      if (tabs && planBtn) planBtn.insertAdjacentHTML('afterend', '<button data-view="lockview">Lock</button>');
      const plan = document.getElementById('planview');
      if (plan) plan.insertAdjacentHTML('afterend', '<section class="view" id="lockview"><div id="lockRoot"></div></section>');
      const lockBtn = document.querySelector('[data-view="lockview"]');
      if (lockBtn) lockBtn.onclick = function () { setView('lockview'); renderLock(); };
    }

    const settings = document.getElementById('settings');
    if (settings && !document.getElementById('presetPanel')) {
      settings.insertAdjacentHTML('afterbegin',
        '<div class="glass panel" id="presetPanel"><div class="ph"><div><div class="ey">Presets / recovery</div><h2>Reset the route without losing booking progress</h2><p>The verified preset is the plan agreed in chat. Core-only strips paid attractions. Pursuit-aware is only for a later bundle decision.</p></div></div>' +
        '<div class="preset-cards"><button class="preset-card primary" onclick="applyVerifiedPlannerPreset(\'verified\')"><b>Verified budget-first</b><small>Maligne protected • Gondola weather-gated MUST • Icefield NICE</small></button>' +
        '<button class="preset-card" onclick="applyVerifiedPlannerPreset(\'core\')"><b>Core scenery only</b><small>No paid attractions • cheapest recovery mode</small></button>' +
        '<button class="preset-card" onclick="applyVerifiedPlannerPreset(\'pursuit\')"><b>Pursuit-aware</b><small>Only use if you later buy the pass; expect harder day loads</small></button></div></div>');
    }
  }

  function injectCss() {
    if (document.getElementById('verifiedPlanCss')) return;
    const st = document.createElement('style');
    st.id = 'verifiedPlanCss';
    st.textContent =
      '.verified-banner{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;border:1px solid #3d765f;background:linear-gradient(135deg,#0e2a22,#10283a);border-radius:14px;margin-bottom:12px}.verified-banner.warn{border-color:#7a6030;background:linear-gradient(135deg,#2a2210,#132433)}.verified-banner p{margin:3px 0 0;color:#c7d8e3;font-size:12px}.lock-hero{padding:18px;display:grid;grid-template-columns:1.4fr .8fr;gap:16px}.lock-hero h1{font-size:30px;margin:4px 0 8px;letter-spacing:-.035em}.lock-hero p{margin:0;color:var(--muted);line-height:1.55}.lock-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.lock-metrics>div{background:#081a27;border:1px solid var(--line);border-radius:11px;padding:10px}.lock-metrics small{display:block;color:var(--muted);font-size:10px}.lock-metrics b{font-size:20px}.lock-metrics span{display:block;font-size:9px;color:var(--muted);margin-top:2px}.lock-metrics .ok{border-color:#3e765e}.lock-metrics .warn{border-color:#7a6030}.lock-metrics .urgent{border-color:#8a4a4a}.lock-grid{display:grid;grid-template-columns:1.45fr .8fr;gap:12px;margin-top:12px}.lock-timeline{display:flex;flex-direction:column;gap:0}.lock-step{display:grid;grid-template-columns:150px 1fr;gap:12px;padding:0 0 16px;position:relative}.lock-step:before{content:"";position:absolute;left:73px;top:24px;bottom:-2px;border-left:2px solid #294a61}.lock-step:last-child:before{display:none}.lock-time{position:relative;z-index:1;background:#0c2638;border:1px solid var(--line);border-radius:999px;padding:6px 8px;height:max-content;text-align:center;font-size:10px;font-weight:800;color:#9fd6ff}.lock-copy{background:#081a27;border:1px solid var(--line);border-radius:12px;padding:11px}.lock-copy h3{margin:0 0 4px;font-size:15px}.lock-copy p{margin:0 0 9px;color:var(--muted);font-size:11px;line-height:1.45}.lock-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.lock-choice{background:#0d2536;border:1px solid var(--line);border-radius:9px;color:inherit;text-align:left;padding:8px;cursor:pointer}.lock-choice b,.lock-choice small{display:block}.lock-choice small{color:var(--muted);font-size:9px;margin-top:2px}.lock-choice.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:#0e3029}.final-lock-list{display:flex;flex-direction:column;gap:6px}.final-lock-item{display:flex;gap:8px;align-items:flex-start;padding:8px 9px;border:1px solid var(--line);background:#081a27;border-radius:9px;color:#c2d3df;font-size:11px}.final-lock-item.done{border-color:#3e765e;background:#0c2820;color:#d9f8e9}.preset-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.preset-card{background:#081a27;border:1px solid var(--line);border-radius:12px;color:inherit;padding:12px;text-align:left;cursor:pointer}.preset-card.primary{border-color:var(--accent)}.preset-card b,.preset-card small{display:block}.preset-card small{color:var(--muted);font-size:10px;margin-top:4px;line-height:1.4}@media(max-width:900px){.lock-hero,.lock-grid{grid-template-columns:1fr}.lock-step{grid-template-columns:1fr}.lock-step:before{display:none}.lock-choices,.preset-cards{grid-template-columns:1fr}}';
    document.head.appendChild(st);
  }

  function patchTimelineEngine() {
    const oldComputeDayTimeline = computeDayTimeline;
    computeDayTimeline = function (day) {
      if (!day || !day.stops) return oldComputeDayTimeline(day);
      const pendingGroups = [];
      if (S.decisions && S.decisions.sep29bonus === 'pending') pendingGroups.push('sep29bonus');
      if (!pendingGroups.length) return oldComputeDayTimeline(day);

      const clone = deepClone(day);
      const optionIds = new Set();
      clone.stops.forEach(function (st) {
        if (st.choiceGroup && pendingGroups.includes(st.choiceGroup) && st.priority === 'nice' && st.enabled !== true) {
          optionIds.add(st.id);
          st.enabled = false;
        }
      });
      const tl = oldComputeDayTimeline(clone);
      tl.items.forEach(function (it) {
        if (optionIds.has(it.stop.id)) {
          const original = day.stops.find(function (s) { return s.id === it.stop.id; });
          it.stop = original || it.stop;
          it.isCut = false;
          it.isOptionPending = true;
          it.arrTime = { display: 'OPTION' };
          it.depTime = { display: 'OPTION' };
          it.stayMin = 0;
          it.plannedStayMin = original ? getDefaultStayMin(original) : it.plannedStayMin;
        }
      });
      tl.activeCount = day.stops.filter(function (s) {
        return typeof isStopActive === 'function'
          ? isStopActive(s)
          : (s.priority !== 'cut' && s.enabled !== false && !(s.choiceGroup && pendingGroups.includes(s.choiceGroup)));
      }).length;
      tl.cutCount = day.stops.filter(function (s) { return s.priority === 'cut'; }).length;
      tl.pendingOptionCount = optionIds.size;
      return tl;
    };
  }

  function patchRenderers() {
    const oldRenderPlan = renderPlan;
    renderPlan = function () {
      oldRenderPlan();
      const root = document.getElementById('planRoot');
      if (!root) return;
      const active = isVerifiedState(S);
      const activePresetName = S.activePreset === 'core' ? 'Core scenery preset' : (S.activePreset === 'pursuit' ? 'Pursuit-aware preset' : 'Verified budget-first preset');
      root.insertAdjacentHTML('afterbegin',
        '<div class="verified-banner ' + (active ? '' : 'warn') + '"><div><b>' + (active ? '✓ ' + activePresetName + ' active' : 'Verified preset available') + '</b><p>' +
        (active ? 'Based on the verified Sep 1 official-source audit. Your choices/manual edits remain yours; Reset to verified restores the audited baseline.' : 'Your saved browser state predates the verified route. Apply the preset to update timings/priorities while preserving bookings and entered prices.') +
        '</p></div><div class="actions"><button class="btn small ' + (active ? '' : 'primary') + '" onclick="applyVerifiedPlannerPreset(\'verified\')">' + (active ? 'Reset to verified' : 'Apply verified preset') + '</button><button class="btn small" onclick="setView(\'lockview\');renderVerifiedLock()">Open Lock flow</button></div></div>');
    };

    const oldRenderAll = renderAll;
    renderAll = function () {
      oldRenderAll();
      renderLock();
    };

    const oldOpenSpotModal = openSpotModal;
    openSpotModal = function (date, id) {
      oldOpenSpotModal(date, id);
      const f = findStop(date, id);
      if (!f || !f.stop) return;
      const inf = getSpotInfo(f.stop);
      const rev = document.getElementById('modalReviews');
      if (rev && VERIFIED_INFO[SPOT_ALIASES[f.stop.id] || f.stop.id]) {
        rev.innerHTML = '<b>✅ Verified 2026 source check:</b><div class="review-quote">' + escapeHtml(inf.reviews || 'Verified against the linked official source.') + '</div>';
      }
    };

    const oldPlanText = planText;
    planText = function () {
      const base = oldPlanText();
      const answers = DECISION_FLOW.map(function (q) { return '• ' + q.when + ': ' + answerLabel(q, S.decisions && S.decisions[q.id]); }).join('\n');
      const preset = S.activePreset === 'core' ? 'Core scenery only' : (S.activePreset === 'pursuit' ? 'Pursuit-aware' : 'Verified budget-first');
      return base + '\n\nLOCKED / PENDING DECISIONS\n' + answers + '\n\nPRESET\n' + preset + ' • verified baseline Sep 1, 2026. Reset from Data → Presets.';
    };

    const oldToggleAtt = toggleAtt;
    toggleAtt = function (id, value) {
      oldToggleAtt(id, value);
      if (id === 'icefieldAdventure') {
        const st = S.days.find(function (d) { return d.date === 'Sep 29'; });
        const ice = st && st.stops.find(function (x) { return x.id === 'icefield29'; });
        if (ice) ice.stayMin = value ? 165 : 45;
        if (S.decisions) S.decisions.icefield = value ? 'buy' : 'nice-no-pass';
        persist();
        renderAll();
      }
    };

    const oldGoogleRouteUrl = googleRouteUrl;
    googleRouteUrl = function (stops) {
      let filtered = stops || [];
      if (S.decisions && S.decisions.sep29bonus === 'pending') {
        filtered = filtered.filter(function (s) {
          return s.choiceGroup !== 'sep29bonus' || s.enabled === true;
        });
      }
      if (filtered.some(function (s) { return s.id === 'moraine'; })) {
        filtered = filtered.filter(function (s) { return s.id !== 'moraine' && s.id !== 'louise'; });
      }
      return oldGoogleRouteUrl(filtered);
    };

  }

  patchBase();
  patchDaylight();
  patchInfo();
  injectCss();
  injectUi();

  if (!S.decisions) S.decisions = deepClone(VERIFIED_DECISIONS);

  // Older browser saves could have the Maligne decision and attraction flag out
  // of sync. The decision is authoritative for budget reservation.
  if (S.decisions && (S.decisions.maligne === 'book' || S.decisions.maligne === 'hold')) {
    if (typeof setPaidAttractionSelection === 'function') setPaidAttractionSelection('maligneCruise', true);
  } else if (S.decisions && S.decisions.maligne === 'skip') {
    if (typeof setPaidAttractionSelection === 'function') setPaidAttractionSelection('maligneCruise', false);
  }

  const hadSavedState = !!(localStorage.getItem(STORE_V6) || localStorage.getItem(STORE_V5) || localStorage.getItem(STORE_V4) || localStorage.getItem(STORE_V3));
  if (hadSavedState) {
    applyRoutePlaceIntegrity(S);
    persist();
  }
  if (!hadSavedState) {
    S = configurePreset(deepClone(BASE), 'verified');
    localStorage.setItem(PRESET_MARK, 'verified');
    persist();
  }

  window.applyVerifiedPlannerPreset = applyPreset;
  window.setVerifiedDecision = setDecision;
  window.renderVerifiedLock = renderLock;

  patchTimelineEngine();
  patchRenderers();
  renderAll();

  if (!isVerifiedState(S)) {
    toast('Verified Sep 1 official-audit preset is ready. Open Plan or Data → Presets to apply it.');
  }
})();