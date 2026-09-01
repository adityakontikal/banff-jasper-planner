/* Verified Sep 2026 budget-first preset + decision locking layer.
 * Loaded after app.js so it can reuse the existing planner engine without replacing it.
 */
(function () {
  const PRESET_MARK = 'bj-verified-sep2026-preset-v1';

  const VERIFIED_DAYS = [
    {
      date: 'Sep 25', label: 'Toronto → Calgary Arrival → Drive to Cochrane', start: '23:00', drive: '~42 km', sleep: 'Cochrane (Night 1 of 2)',
      note: 'Budget-first default. Assumes the chosen outbound lands around 22:30 or earlier. Carry-on only + rental pickup: allow about 75 min from gate to car. If landing is later than 23:00, protect sleep and push Sep 26 departure later rather than stealing rest.',
      hotel: { name: 'Days Inn & Suites Cochrane', lat: 51.189, lng: -114.467 },
      stops: [
        { id: 'yyc25', name: 'Calgary International Airport (YYC)', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 75 },
        { id: 'cochrane25', name: 'Cochrane Hotel (Check-in & Sleep)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 26', label: 'Cochrane → Banff First-Timer Highlights → Cochrane', start: '08:30', drive: '~210 km', sleep: 'Cochrane (Night 2 of 2)',
      note: 'Protect sleep after the late flight. Minnewanka + Two Jack + Johnston Upper Falls are the core. Banff town is food/rest only. Bow Falls and Surprise Corner are short nice-to-have stops. Gondola is weather/pass dependent.',
      hotel: { name: 'Days Inn & Suites Cochrane', lat: 51.189, lng: -114.467 },
      stops: [
        { id: 'cochrane26_dep', name: 'Cochrane Hotel (Depart 08:30)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'minnewanka', name: 'Lake Minnewanka', lat: 51.2483, lng: -115.4979, priority: 'must', stayMin: 40 },
        { id: 'twojack', name: 'Two Jack Lake', lat: 51.2281, lng: -115.4926, priority: 'must', stayMin: 20 },
        { id: 'banff', name: 'Banff Town (Fast Lunch + Short Walk)', lat: 51.1784, lng: -115.5708, priority: 'nice', stayMin: 45 },
        { id: 'bowfalls', name: 'Bow Falls', lat: 51.1683, lng: -115.5608, priority: 'nice', stayMin: 15 },
        { id: 'surprise', name: 'Surprise Corner Viewpoint', lat: 51.1663, lng: -115.5560, priority: 'nice', stayMin: 10 },
        { id: 'johnston', name: 'Johnston Canyon — Lower + Upper Falls', lat: 51.2450, lng: -115.8400, priority: 'must', stayMin: 120 },
        { id: 'cochrane26_ret', name: 'Cochrane Hotel (Return & Sleep)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 27', label: 'Cochrane → Moraine/Louise → Icefields Parkway → Hinton', start: '06:00', drive: '~500 km', sleep: 'Hinton (Night 1 of 2)',
      note: 'Hardest day. Budget-first Cochrane start means no true sunrise at Moraine without sacrificing sleep. Reserve Moraine as first destination. Model at least 30 min shuttle waits. After the lakes, protect Bow Lake, Peyto and the free Athabasca Glacier stop; Sunwapta and Mistaya are optional if daylight slips.',
      hotel: { name: 'Ramada / Baymont Hinton (whichever final 3-adult 2Q total is lower)', lat: 53.399, lng: -117.586 },
      stops: [
        { id: 'cochrane27', name: 'Cochrane Hotel (Depart 06:00)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true },
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
        { id: 'hinton27', name: 'Hinton Hotel (Sleep)', lat: 53.399, lng: -117.586, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 28', label: 'Hinton → Jasper / Maligne Valley → Hinton', start: '07:00', drive: '~270 km', sleep: 'Hinton (Night 2 of 2)',
      note: 'Maligne Lake Cruise is the premium anchor. Pyramid is the worthwhile lake/photo stop; Patricia is cut-first. Jasper is fuel/fast food only. Medicine Lake is on-route. Annette/Edith stay cut unless the cruise day is running early.',
      hotel: { name: 'Same Hinton hotel as Sep 27', lat: 53.399, lng: -117.586 },
      stops: [
        { id: 'hinton28a', name: 'Hinton Hotel (Depart 07:00)', lat: 53.399, lng: -117.586, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'pyramid', name: 'Pyramid Lake & Pyramid Island', lat: 52.9210, lng: -118.1040, priority: 'must', stayMin: 40 },
        { id: 'patricia', name: 'Patricia Lake', lat: 52.9120, lng: -118.0950, priority: 'cut', stayMin: 15 },
        { id: 'jasper', name: 'Jasper Town (Fuel + Fast Food / Grab-and-Go)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 35 },
        { id: 'medicine', name: 'Medicine Lake Viewpoint', lat: 52.8640, lng: -117.8000, priority: 'must', stayMin: 20 },
        { id: 'maligne', name: 'Maligne Lake + Spirit Island Classic Cruise', lat: 52.7300, lng: -117.6420, priority: 'must', stayMin: 150 },
        { id: 'annette', name: 'Lake Annette & Lake Edith', lat: 52.8840, lng: -118.0450, priority: 'cut', stayMin: 25 },
        { id: 'hinton28b', name: 'Hinton Hotel (Sleep)', lat: 53.399, lng: -117.586, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 29', label: 'Hinton → Jasper / Parkway South → Yoho Option → Cochrane', start: '06:30', drive: '~500 km', sleep: 'Cochrane',
      note: 'Second-chance + choice day. Athabasca Falls is protected here. Valley of Five Lakes, paid Icefield Adventure and Emerald/Natural Bridge are all NICE alternatives — normally choose one major bonus, not all three. Repeated Bow/Icefield viewpoints become cuttable if Sep 27 weather was good.',
      hotel: { name: 'Days Inn / Super 8 Cochrane (lowest final 2Q/3-adult total)', lat: 51.189, lng: -114.467 },
      stops: [
        { id: 'hinton29', name: 'Hinton Hotel (Depart 06:30)', lat: 53.399, lng: -117.586, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'jasper29', name: 'Jasper (Southbound Fuel + Snacks)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 25 },
        { id: 'valley5', name: 'Valley of the Five Lakes — Emerald Loop Option', lat: 52.8450, lng: -118.0550, priority: 'nice', stayMin: 110, choiceGroup: 'sep29bonus' },
        { id: 'athfalls', name: 'Athabasca Falls', lat: 52.6634, lng: -117.8830, priority: 'must', stayMin: 35 },
        { id: 'stutfield', name: 'Stutfield Glacier Viewpoint', lat: 52.2620, lng: -117.2860, priority: 'nice', stayMin: 10 },
        { id: 'icefield29', name: 'Columbia Icefield — Second Chance / Adventure Option', lat: 52.2203, lng: -117.2249, priority: 'nice', stayMin: 45, choiceGroup: 'sep29bonus' },
        { id: 'waterfowl', name: 'Waterfowl Lakes', lat: 51.8450, lng: -116.6390, priority: 'nice', stayMin: 10 },
        { id: 'bowlake29', name: 'Bow Lake (Repeat only if Sep 27 weather was poor)', lat: 51.6827, lng: -116.4650, priority: 'cut', stayMin: 15 },
        { id: 'emerald', name: 'Emerald Lake + Natural Bridge (Yoho Option)', lat: 51.4436, lng: -116.5310, priority: 'nice', stayMin: 75, choiceGroup: 'sep29bonus' },
        { id: 'cochrane29', name: 'Cochrane Hotel (Sleep)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 30', label: 'Cochrane → Calgary Optional → YYC → Toronto', start: '10:00', drive: '~65 km', sleep: 'Home',
      note: 'Do not lock Calgary sightseeing until the return flight is booked. Default is relaxed checkout + cheap lunch + fuel + rental return with a 2-hour terminal buffer.',
      hotel: null,
      stops: [
        { id: 'cochrane30', name: 'Cochrane Hotel (Depart 10:00)', lat: 51.189, lng: -114.467, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'canmore', name: 'Calgary Downtown / Prince\'s Island (Only if flight timing leaves room)', lat: 51.0550, lng: -114.0700, priority: 'cut', stayMin: 90 },
        { id: 'yyc30', name: 'Calgary International Airport — Rental Return + Terminal', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 120 }
      ]
    }
  ];

  const VERIFIED_DECISIONS = {
    hotel26: 'budget-rule',
    lakeLouise: 'shoreline',
    maligne: 'book',
    pyramid: 'pyramid',
    icefield: 'nice-no-pass',
    gondola: 'weather',
    sep29bonus: 'pending',
    shuttle: 'pending'
  };

  function replaceStopPriority(day, id, priority) {
    const d = day && day.stops ? day : null;
    const st = d && d.stops.find(function (x) { return x.id === id; });
    if (st) st.priority = priority;
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
    BASE.presetVersion = 'verified-2026-08-31-v1';
    BASE.activePreset = 'verified';
    BASE.settings.title = 'Banff → Jasper Road Trip — Verified Budget-First';
    BASE.settings.globalNote = 'Verified Aug 31, 2026. Budget target C$3,000–3,500 comfortable; C$4,000–4,500 hard ceiling. Three drivers; long/night driving is acceptable. Protect 6–7h sleep / ~8–9h in-room time. Must = first-timer core; Nice = consider/choose; Cut = keep in data but sacrifice first.';
    BASE.settings.lunchMin = 30;
    BASE.settings.bufferMin = 8;
    BASE.costs.food = 360;
    BASE.costs.fuel = 260;
    BASE.costs.misc = 50;
    BASE.days = deepClone(VERIFIED_DAYS);
    BASE.decisions = deepClone(VERIFIED_DECISIONS);

    const maligne = BASE.attractions.find(function (a) { return a.id === 'maligneCruise'; });
    if (maligne) {
      maligne.selected = true;
      maligne.time = 2.5;
      maligne.rec = 'LOCKED #1 PAID PICK';
      maligne.desc = 'Classic cruise + Spirit Island. Only paid attraction currently protected in the verified preset.';
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
      gondola.selected = false;
      gondola.rec = 'NICE — CLEAR WEATHER / PASS ONLY';
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

    if (BASE.hotels && BASE.hotels['Sep 26'] && !BASE.hotels['Sep 26'].options.some(function (o) { return /Mountain-area/.test(o[0]); })) {
      BASE.hotels['Sep 26'].options.push([
        'Mountain-area 2Q strategy (Canmore / Dead Man\'s Flats)',
        '1 room • 3 adults • exact 2 Queen Beds required',
        'ONLY use if final total is no more than C$100 above the comparable Cochrane room. Saves roughly 50+ min toward Lake Louise next morning.',
        'https://www.google.com/travel/hotels?q=Canmore%20Alberta%20Sep%2026%202026%203%20adults%202%20queen%20beds'
      ]);
    }
  }

  const VERIFIED_INFO = {
    johnston: {
      time: '2 hr to Upper Falls (official)',
      timingOptions: [{ label: 'Lower Falls only — official ~1h', min: 60 }, { label: 'Lower + Upper Falls — official ~2h', min: 120 }],
      effort: '2.4 km one way • 215 m gain to Upper Falls',
      parking: 'Use Johnston Canyon designated P1/P2 only. Parks Canada says parking fills quickly and roadside parking is prohibited.',
      parkingRating: 'Busy — have a fallback',
      desc: 'First-timer must. Narrow canyon catwalks lead to Lower Falls and the 30 m Upper Falls. Your preset protects the full Upper Falls hike.',
      todo: 'Do Lower Falls, continue to Upper Falls, then turn around. Ink Pots are intentionally excluded from this compressed trip.',
      cut: 'If the day is badly delayed, downgrade to Lower Falls (~1h) before removing the stop entirely.',
      reviews: 'Verified 2026: Parks Canada lists Lower Falls at 1.1 km one way / ~1h round trip and Upper Falls at 2.4 km one way / ~2h round trip.',
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
      timingOptions: [{ label: 'Shoreline only — if cruise cancelled', min: 60 }, { label: 'Classic Cruise + 30m early arrival + shoreline buffer', min: 150 }],
      desc: 'Your #1 paid attraction and the only paid experience currently locked. Spirit Island is 14 km up-lake with no road or trail access, which makes the cruise meaningfully different from simply stopping at another viewpoint.',
      todo: 'Aim for an efficient late-morning / early-afternoon Classic Cruise. Arrive at least 30 min early. Keep fuel/snacks handled in Jasper before Maligne Road.',
      cut: 'If the cruise is booked, cut Patricia and Annette/Edith before risking the reservation.',
      reviews: 'Verified 2026: Classic Cruise ~1.5h; arrive 30 min early. Sep 7–Oct 3 operating window is 9 AM–5:30 PM. Spirit Island has no road/trail access.',
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
    emerald: {
      time: '60–75 min for Emerald + Natural Bridge pair',
      desc: 'High-value NICE option late Sep 29 if you have already completed the northbound Parkway musts. It is preferable to repeating Bow Lake in good weather.',
      parking: 'Yoho warns Emerald Lake parking is limited and fills quickly. Try later in the day; if the lot is a mess, do not circle and waste the schedule.',
      cut: 'If parking is full, weather is poor, or you chose Valley Five Lakes / Icefield Adventure, continue to Cochrane.',
      reviews: 'Verified 2026: Parks Canada advises that Emerald Lake parking is limited and to arrive early or later in the day.',
      official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/~/~/link.aspx?_id=D760206D5E7645308EA1EC10A41A54F5&_z=z'
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
    return !!state && state.presetVersion === 'verified-2026-08-31-v1';
  }

  function preserveProgress(next, old) {
    if (!old) return next;
    const oldBookings = old.bookings || [];
    next.bookings.forEach(function (b) {
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
    next.presetVersion = 'verified-2026-08-31-v1';
    next.activePreset = name;
    next.decisions = deepClone(VERIFIED_DECISIONS);
    const maligne = next.attractions.find(function (a) { return a.id === 'maligneCruise'; });
    const gondola = next.attractions.find(function (a) { return a.id === 'banffGondola'; });
    const ice = next.attractions.find(function (a) { return a.id === 'icefieldAdventure'; });
    const pass = next.attractions.find(function (a) { return a.id === 'pursuitPass'; });
    if (name === 'core') {
      if (maligne) maligne.selected = false;
      if (gondola) gondola.selected = false;
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
      if (st) st.stayMin = 165;
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
    S = next;
    localStorage.setItem(PRESET_MARK, name);
    persist();
    renderAll();
    if (!silent) toast('Applied preset: ' + label);
  }

  function setDecision(id, value) {
    if (!S.decisions) S.decisions = deepClone(VERIFIED_DECISIONS);
    S.decisions[id] = value;

    if (id === 'hotel26') {
      const d26 = S.days.find(function (d) { return d.date === 'Sep 26'; });
      const d27 = S.days.find(function (d) { return d.date === 'Sep 27'; });
      const ret = d26 && d26.stops.find(function (s) { return s.id === 'cochrane26_ret'; });
      const dep = d27 && d27.stops.find(function (s) { return s.id === 'cochrane27'; });
      const h = S.hotels && S.hotels['Sep 26'];
      const mountainIdx = h ? h.options.findIndex(function (o) { return /Mountain-area/.test(o[0]); }) : -1;
      if (value === 'mountain' && mountainIdx >= 0) {
        h.choice = mountainIdx;
        if (ret) { ret.name = 'Canmore / Dead Man\'s Flats Hotel (Return & Sleep)'; ret.lat = 51.089; ret.lng = -115.359; }
        if (dep) { dep.name = 'Canmore / Dead Man\'s Flats Hotel (Depart 06:00)'; dep.lat = 51.089; dep.lng = -115.359; }
        d26.sleep = 'Canmore / Dead Man\'s Flats (only because price delta ≤ C$100)';
        d27.label = 'Canmore/Dead Man\'s Flats → Moraine/Louise → Icefields Parkway → Hinton';
      } else if (value === 'budget-rule') {
        if (h && /Mountain-area/.test(h.options[h.choice] && h.options[h.choice][0])) h.choice = 0;
        if (ret) { ret.name = 'Cochrane Hotel (Return & Sleep)'; ret.lat = 51.189; ret.lng = -114.467; }
        if (dep) { dep.name = 'Cochrane Hotel (Depart 06:00)'; dep.lat = 51.189; dep.lng = -114.467; }
        d26.sleep = 'Cochrane (Night 2 of 2)';
        d27.label = 'Cochrane → Moraine/Louise → Icefields Parkway → Hinton';
      }
    }
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
      if (a) a.selected = reserveBudget;
      if (st) st.stayMin = reserveBudget ? 150 : 60;
    }
    if (id === 'gondola') {
      const a = S.attractions.find(function (x) { return x.id === 'banffGondola'; });
      if (a) a.selected = value === 'yes' || value === 'pass';
    }
    if (id === 'icefield') {
      const a = S.attractions.find(function (x) { return x.id === 'icefieldAdventure'; });
      const st = S.days.find(function (d) { return d.date === 'Sep 29'; }).stops.find(function (x) { return x.id === 'icefield29'; });
      const on = value === 'pass' || value === 'buy';
      if (a) a.selected = on;
      if (st) st.stayMin = on ? 165 : 45;
    }
    if (id === 'sep29bonus') {
      const d = S.days.find(function (x) { return x.date === 'Sep 29'; });
      const valley = d.stops.find(function (x) { return x.id === 'valley5'; });
      const ice = d.stops.find(function (x) { return x.id === 'icefield29'; });
      const emerald = d.stops.find(function (x) { return x.id === 'emerald'; });
      const iceAtt = S.attractions.find(function (x) { return x.id === 'icefieldAdventure'; });
      if (value === 'pending') {
        if (valley) valley.priority = 'nice';
        if (ice) { ice.priority = 'nice'; ice.stayMin = 45; }
        if (emerald) emerald.priority = 'nice';
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'valley') {
        if (valley) valley.priority = 'nice';
        if (ice) ice.priority = 'cut';
        if (emerald) emerald.priority = 'cut';
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'icefield') {
        if (valley) valley.priority = 'cut';
        if (ice) { ice.priority = 'nice'; ice.stayMin = 165; }
        if (emerald) emerald.priority = 'cut';
        if (iceAtt) iceAtt.selected = true;
      } else if (value === 'yoho') {
        if (valley) valley.priority = 'cut';
        if (ice) ice.priority = 'cut';
        if (emerald) emerald.priority = 'nice';
        if (iceAtt) iceAtt.selected = false;
      } else if (value === 'core') {
        if (valley) valley.priority = 'cut';
        if (ice) ice.priority = 'cut';
        if (emerald) emerald.priority = 'cut';
        if (iceAtt) iceAtt.selected = false;
      }
    }
    save();
  }

  const DECISION_FLOW = [
    {
      id: 'hotel26', when: 'NOW • HOTEL', title: 'Where do you sleep Sep 26?',
      detail: 'Budget wins unless the location upgrade is cheap enough. Cochrane → Lake Louise Ski Resort is about 1h57; Canmore → Ski Resort about 1h04.',
      options: [
        ['budget-rule', 'Cochrane unless mountain hotel ≤ +C$100', 'Recommended'],
        ['mountain', 'Canmore / Dead Man\'s Flats if ≤ +C$100', 'Buys ~50 min+ on Sep 27 morning'],
        ['pending', 'Still comparing', 'Do not lock route yet']
      ]
    },
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
      detail: 'Spirit Island has no road/trail access. Classic Cruise ~1.5h + arrive 30 min early. This is your highest-value standalone paid attraction.',
      options: [
        ['book', 'Book Classic Cruise around C$350 total', 'Locked recommendation'],
        ['hold', 'Hold until exact price / time', 'Still viable'],
        ['skip', 'Shoreline only', 'Cheapest']
      ]
    },
    {
      id: 'gondola', when: 'SEP 26 • WEATHER CALL', title: 'Banff Gondola?',
      detail: 'Keep it NICE. Only spend the time/money if weather is clear or a Pursuit purchase changes the economics.',
      options: [
        ['weather', 'Decide 24–48h before from forecast', 'Recommended'],
        ['yes', 'Buy à la carte if clear', 'Adds ~2h'],
        ['pass', 'Use because Pursuit Pass was bought', 'Bundle case'],
        ['no', 'Skip', 'Protect free sights']
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

    const coreBookings = ['return', 'outbound', 'rental', 'h25', 'h26', 'h27', 'h28', 'h29', 'park', 'shuttle'];
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
      ['All 5 hotel nights locked as 1 room / 3 adults / exact 2 Queens', ['h25','h26','h27','h28','h29'].every(isBooked)],
      ['Parks Canada admission handled', isBooked('park')],
      ['Moraine/Louise transport reservation locked', isBooked('shuttle') || S.decisions.shuttle === 'booked' || S.decisions.shuttle === 'backup'],
      ['Maligne Cruise decision locked', S.decisions.maligne === 'book' || S.decisions.maligne === 'skip'],
      ['Sep 29 bonus choice locked', S.decisions.sep29bonus && S.decisions.sep29bonus !== 'pending']
    ];
    const hardHtml = hard.map(function (x) {
      return '<div class="final-lock-item ' + (x[1] ? 'done' : '') + '"><span>' + (x[1] ? '✓' : '○') + '</span><b>' + escapeHtml(x[0]) + '</b></div>';
    }).join('');

    root.innerHTML =
      '<div class="lock-hero glass"><div><div class="ey">VERIFIED PRESET • AUG 31, 2026</div><h1>Lock the trip in the order decisions actually happen.</h1><p>MCQs are intentionally time-ordered: booking first, then weather/availability choices, then the Sep 29 bonus fork. Resetting to the verified preset restores every MUST/NICE/CUT classification.</p></div>' +
      '<div class="lock-metrics"><div><small>Core bookings</small><b>' + booked + '/' + coreBookings.length + '</b></div><div><small>Decisions resolved</small><b>' + answered + '/' + DECISION_FLOW.length + '</b></div><div class="' + budgetClass + '"><small>Selected estimate</small><b>' + money(totalNow) + '</b><span>Comfort target C$3k–3.5k</span></div></div></div>' +
      '<div class="lock-grid"><div class="glass panel"><div class="ph"><div><div class="ey">Timeline decision tree</div><h2>Answer these as the trip gets locked</h2></div></div><div class="lock-timeline">' + cards + '</div></div>' +
      '<div><div class="glass panel"><div class="ph"><div><div class="ey">Final lock</div><h2>What must be true before departure</h2></div></div><div class="final-lock-list">' + hardHtml + '</div></div>' +
      '<div class="glass panel"><div class="ph"><div><div class="ey">Budget rule</div><h2>Do not pay for convenience blindly</h2></div></div><div class="note"><b>Sep 26 hotel:</b> keep Cochrane unless a confirmed mountain-area 2Q room is within C$100 total. The mountain room buys roughly 50+ minutes toward Lake Louise next morning.</div><div class="note" style="margin-top:8px"><b>Paid attractions:</b> Maligne is protected. Gondola and Icefield Adventure remain nice/conditional. Pursuit stays off by default.</div><div class="note warn" style="margin-top:8px"><b>Sep 29:</b> Valley Five Lakes, Icefield Adventure and Yoho are alternatives. Pick one big bonus; Athabasca Falls remains core.</div></div></div></div>';
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
        '<div class="preset-cards"><button class="preset-card primary" onclick="applyVerifiedPlannerPreset(\'verified\')"><b>Verified budget-first</b><small>Maligne locked • Icefield/Gondola nice • budget rules active</small></button>' +
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
        if (st.choiceGroup && pendingGroups.includes(st.choiceGroup) && st.priority === 'nice') {
          optionIds.add(st.id);
          st.priority = 'cut';
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
        return s.priority !== 'cut' && !(s.choiceGroup && pendingGroups.includes(s.choiceGroup));
      }).length;
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
      root.insertAdjacentHTML('afterbegin',
        '<div class="verified-banner ' + (active ? '' : 'warn') + '"><div><b>' + (active ? '✓ Verified budget-first preset active' : 'Verified preset available') + '</b><p>' +
        (active ? 'Based on the verified Aug 31 plan. Your MCQ choices and manual edits remain yours; Reset to verified restores the baseline.' : 'Your saved browser state predates the verified route. Apply the preset to update timings/priorities while preserving bookings and entered prices.') +
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
      return base + '\n\nLOCKED / PENDING DECISIONS\n' + answers + '\n\nPRESET\nVerified budget-first Aug 31, 2026. Reset from Data → Presets.';
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
        filtered = filtered.filter(function (s) { return s.choiceGroup !== 'sep29bonus'; });
      }
      if (filtered.some(function (s) { return s.id === 'moraine'; })) {
        filtered = filtered.filter(function (s) { return s.id !== 'moraine' && s.id !== 'louise'; });
      }
      return oldGoogleRouteUrl(filtered);
    };

    const oldChooseHotel = chooseHotel;
    chooseHotel = function (date, idx) {
      oldChooseHotel(date, idx);
      if (date !== 'Sep 26') return;
      const h = S.hotels['Sep 26'];
      const opt = h && h.options[idx];
      const mountain = opt && /Mountain-area/.test(opt[0]);
      const d26 = S.days.find(function (d) { return d.date === 'Sep 26'; });
      const d27 = S.days.find(function (d) { return d.date === 'Sep 27'; });
      const ret = d26 && d26.stops.find(function (s) { return s.id === 'cochrane26_ret'; });
      const dep = d27 && d27.stops.find(function (s) { return s.id === 'cochrane27'; });
      if (mountain) {
        if (ret) { ret.name = 'Canmore / Dead Man\'s Flats Hotel (Return & Sleep)'; ret.lat = 51.089; ret.lng = -115.359; }
        if (dep) { dep.name = 'Canmore / Dead Man\'s Flats Hotel (Depart 06:00)'; dep.lat = 51.089; dep.lng = -115.359; }
        d26.sleep = 'Canmore / Dead Man\'s Flats (only because price delta ≤ C$100)';
        d27.label = 'Canmore/Dead Man\'s Flats → Moraine/Louise → Icefields Parkway → Hinton';
        if (S.decisions) S.decisions.hotel26 = 'mountain';
      } else {
        if (ret) { ret.name = 'Cochrane Hotel (Return & Sleep)'; ret.lat = 51.189; ret.lng = -114.467; }
        if (dep) { dep.name = 'Cochrane Hotel (Depart 06:00)'; dep.lat = 51.189; dep.lng = -114.467; }
        d26.sleep = 'Cochrane (Night 2 of 2)';
        d27.label = 'Cochrane → Moraine/Louise → Icefields Parkway → Hinton';
        if (S.decisions) S.decisions.hotel26 = 'budget-rule';
      }
      persist();
      renderAll();
    };
  }

  patchBase();
  patchDaylight();
  patchInfo();
  injectCss();
  injectUi();

  if (!S.decisions) S.decisions = deepClone(VERIFIED_DECISIONS);
  const hadSavedState = !!(localStorage.getItem(STORE_V6) || localStorage.getItem(STORE_V5) || localStorage.getItem(STORE_V4) || localStorage.getItem(STORE_V3));
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
    toast('Verified Aug 31 preset is ready. Open Plan or Data → Presets to apply it.');
  }
})();