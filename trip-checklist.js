/* Centralized trip checklist + official place audit.
 * Loaded after product-plan.js so it can consolidate checklist UI without
 * changing the route engine. scroll-policy.js must remain last.
 */
(function () {
  'use strict';

  const AUDIT_DATE = '2026-09-01';
  const AUDIT_VERSION = 'official-place-audit-2026-09-01-v1';
  let activeCategory = 'bookings';

  const SOURCES = {
    banff: { name: 'Parks Canada — Banff National Park', url: 'https://parks.canada.ca/pn-np/ab/banff' },
    banffTrails: { name: 'Parks Canada — Banff trail conditions', url: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking/etat-sentiers-trail-conditions' },
    banffBulletins: { name: 'Parks Canada — Banff important bulletins', url: 'https://parks.canada.ca/pn-np/ab/banff/bulletins' },
    bowValleyRestriction: { name: 'Parks Canada — Bow Valley Parkway vehicle restriction', url: 'https://parks.canada.ca/pn-np/ab/banff/bulletins/b9725292-f2ba-41cc-91a5-7816df981ce3' },
    shuttle: { name: 'Parks Canada — Lake Louise & Moraine shuttle', url: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise' },
    shuttleFaq: { name: 'Parks Canada — shuttle FAQ', url: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise/faq' },
    parkPass: { name: 'Parks Canada — park passes', url: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes' },
    parkFees: { name: 'Parks Canada — 2026 Banff fees', url: 'https://parks.canada.ca/pn-np/ab/banff/visit/tarifs-fees' },
    icefields: { name: 'Parks Canada — Icefields Parkway', url: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/promenadedesglaciers-icefieldsparkway' },
    icefieldsBanff: { name: 'Parks Canada — Icefields Parkway (Banff)', url: 'https://parks.canada.ca/pn-np/ab/banff/visit/les10-top10/glaciers-icefields' },
    jasperOpen: { name: 'Parks Canada — What is open in Jasper', url: 'https://parks.canada.ca/pn-np/ab/jasper/visit/ouvert-fermee-open-closed' },
    jasperTrails: { name: 'Parks Canada — Jasper trail conditions', url: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/etat-sentiers-trail-conditions' },
    jasperCrowds: { name: 'Parks Canada — Jasper popular locations & parking', url: 'https://parks.canada.ca/pn-np/ab/jasper/visit/foules-crowds' },
    fiveLakes: { name: 'Parks Canada — Valley of the Five Lakes', url: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/sud-south' },
    glacier: { name: 'Parks Canada — Athabasca Glacier / Icefields trails', url: 'https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/glaciers-icefields' },
    medicine: { name: 'Parks Canada — Medicine Lake', url: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/medicine' },
    yoho: { name: 'Parks Canada — Yoho points of interest', url: 'https://parks.canada.ca/pn-np/bc/yoho/activ/places' },
    maligne: { name: 'Pursuit — Maligne Lake Cruise 2026 hours', url: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/location-hours/' },
    maligneExperience: { name: 'Pursuit — Maligne cruise options', url: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/experience/' },
    gondola: { name: 'Pursuit — Banff Gondola 2026 hours & location', url: 'https://www.banffjaspercollection.com/attractions/banff-gondola/hours-location/' },
    gondolaAccess: { name: 'Pursuit — Banff Gondola transit & parking', url: 'https://www.banffjaspercollection.com/attractions/banff-gondola/stories/getting-to-the-banff-gondola/' },
    banffParking: { name: 'Town of Banff — Train Station parking', url: 'https://www.banff.ca/1104/Train-Station-Public-Parking' },
    calgary: { name: 'City of Calgary — visitor information', url: 'https://www.calgary.ca/' },
    yyc: { name: 'Calgary International Airport (YYC)', url: 'https://www.yyc.com/' }
  };

  function source(key) { return SOURCES[key] || SOURCES.banff; }
  function infoKey(stop) { return (SPOT_ALIASES && SPOT_ALIASES[stop.id]) || stop.id; }
  function booking(id) { return (S.bookings || []).find(function (b) { return b.id === id; }); }
  function bookingDone(id) {
    const b = booking(id);
    return !!b && ['Booked', 'Paid', 'Done'].includes(b.status);
  }
  function manualDone(id) { return !!(S.checklists && S.checklists[id]); }
  function setManual(id, value) {
    S.checklists = S.checklists || {};
    S.checklists[id] = !!value;
    save();
  }

  const PLACE_AUDIT = {
    yyc25: {
      kind: 'Booking + airport',
      source: 'yyc',
      facts: [
        'YYC is the trip arrival airport; rental pickup remains an outside-terminal handoff in the YYC Economy Parking area per the locked rental voucher.',
        'Keep the flight number, driver licence and payment card available for the rental handoff.',
        'The planner target is operational booking data, not a public-attraction estimate.'
      ],
      patch: { parking: 'Follow the locked Ascent pickup instructions for the YYC Economy Parking area. Keep the supplier contact and voucher available offline.', bestWindow: 'Booked pickup 1:30 AM Sep 26; protect the supplier deadline in the voucher.' }
    },
    yyc30: {
      kind: 'Booking + airport',
      source: 'yyc',
      facts: [
        'Return the rental with enough buffer for the booked 7:10 PM flight.',
        'Refuel to the contracted level and photograph the vehicle/fuel state before handoff.',
        'Use the supplier return instructions rather than a generic airport rental counter.'
      ],
      patch: { parking: 'Follow the locked Ascent return instructions at YYC; the planner intentionally targets an earlier 4:45 PM return.', bestWindow: 'Target rental return 4:45 PM; booked flight 7:10 PM.' }
    },
    cochrane: {
      kind: 'Locked lodging',
      source: null,
      facts: [
        'Use the exact hotel shown in the locked booking, not the older generic Cochrane lodging assumptions.',
        'One room for three adults with two Queen beds is the locked room requirement.',
        'Hotel confirmation and payment state come from the planner booking record.'
      ]
    },
    calgaryhotel: {
      kind: 'Locked lodging',
      source: null,
      facts: [
        'Holiday Inn Calgary-Airport by IHG is the locked Sep 29 hotel.',
        'Use the booking-confirmed room and address in the planner; do not substitute a similarly named airport hotel.',
        'The Calgary hotel removes the need for a Cochrane-to-airport transfer on flight day.'
      ]
    },
    minnewanka: {
      kind: 'Parks Canada',
      source: 'banffTrails',
      alert: 'LIVE RECHECK: Parks Canada currently lists a Bear Warning on the Lake Minnewanka Trail from the trailhead through Stewart Canyon. Recheck before Sep 26.',
      facts: [
        'Lake Minnewanka Road is currently listed with construction, narrow shoulders and high traffic.',
        'The trailhead-to-Stewart Canyon section currently has a bear warning and wet/muddy sections.',
        'This itinerary is a shoreline/scenic stop; do not extend onto warned trail segments without a fresh conditions check.'
      ],
      patch: { parking: 'Use signed designated Lake Minnewanka day-use parking only. Recheck road construction and trail/bear bulletins before travel.', bestWindow: 'Early morning remains the planner preference; official conditions can override it.' }
    },
    twojack: {
      kind: 'Parks Canada',
      source: 'banff',
      facts: [
        'Two Jack Lake is on the Lake Minnewanka loop and is treated here as a short scenic stop.',
        'Use designated day-use parking and obey any temporary wildlife/road restrictions.',
        'Recheck Banff bulletins because conditions on the Minnewanka loop can change.'
      ],
      patch: { parking: 'Use designated day-use parking; do not create roadside parking when a signed area is full.', bestWindow: 'Planner preference: early morning; verify current road/wildlife bulletins.' }
    },
    banff: {
      kind: 'Town of Banff',
      source: 'banffParking',
      facts: [
        'Banff Train Station has about 500 free stalls and is a short walk to downtown.',
        'Train Station public parking is open 6 AM–11 PM with a 9-hour daily limit.',
        'Downtown visitor pay parking is separate from the Parks Canada entry pass.'
      ],
      patch: { parking: 'Preferred: Banff Train Station Public Parking, 327 Railway Ave — about 500 free stalls, open 6 AM–11 PM, up to 9 hours/day.', parkingRating: 'Free Train Station lot preferred' }
    },
    bowfalls: {
      kind: 'Banff / public viewpoint',
      source: 'banff',
      facts: [
        'Treat Bow Falls as a short viewpoint, not a protected long hike.',
        'Use only signed parking/access and keep this stop expendable if the Sep 26 schedule slips.',
        'Recheck Banff road/bulletin status before departure.'
      ],
      patch: { parking: 'Use signed public access/parking around Bow Falls; avoid relying on an unverified stall count.', bestWindow: 'Flexible daylight stop; route timing takes priority.' }
    },
    surprise: {
      kind: 'Banff / public viewpoint',
      source: 'banff',
      facts: [
        'Surprise Corner remains a quick viewpoint in the planner.',
        'Use only a legal signed pullout/parking position; do not wait in a traffic lane.',
        'The stop is intentionally easy to cut when Johnston/Gondola timing needs protection.'
      ],
      patch: { parking: 'Use the signed viewpoint/pullout only when a legal space is available.', bestWindow: 'Quick daylight photo stop; no fixed official operating window.' }
    },
    gondola: {
      kind: 'Official attraction',
      source: 'gondola',
      facts: [
        'Sep 8–Oct 12, 2026: Banff Gondola operates daily 9 AM–9 PM; last ride up 7:30 PM. Last ride down is 10 minutes before close.',
        'Advance purchase is highly recommended and purchased tickets are nonrefundable. Online tickets are non-transferable and the purchaser must present the credit card used to buy the ticket.',
        'Same-day pre-purchased admission includes the Gondola/Brewster shuttle or Roam Route 1; 2026 Parks Canada parking near Sulphur Mountain is C$17.50/day and can fill. Pursuit says arrive 20 minutes before the Gondola departure and be in line 10 minutes before.'
      ],
      patch: { time: 'Plan ~2 hr for gondola + summit boardwalk; official hours Sep 8–Oct 12 are 9 AM–9 PM, last ride up 7:30 PM.', parking: 'Prefer included transit with a same-day pre-purchased ticket. If driving, Parks Canada Sulphur Mountain parking is C$17.50/day May 15–Oct 12 and can fill.', parkingRating: 'Transit preferred / paid lot can fill', bestWindow: 'GOOD VISIBILITY — weather-gated MUST' }
    },
    castlejunction: {
      kind: 'Parks Canada road access',
      source: 'bowValleyRestriction',
      alert: 'MANDATORY ROUTING WAYPOINT: this is not sightseeing. It forces the legal personal-vehicle route to/from Johnston Canyon during the Sep 1–Oct 6, 2026 east Bow Valley Parkway restriction.',
      facts: [
        'Parks Canada explicitly says Johnston Canyon can be accessed by vehicle via Castle Junction during the restriction.',
        'The planner includes Castle Junction immediately before and after Johnston Canyon so OSRM/Google route generation cannot silently use the prohibited east section.',
        'Do not remove these zero-dwell waypoints unless Parks Canada changes the restriction.'
      ],
      patch: { time: '0 min drive-through routing waypoint', parking: 'No stop/parking required; remain on the legal road route.', parkingRating: 'Mandatory routing waypoint', bestWindow: 'Sep 26 legal vehicle access' }
    },
    johnston: {
      kind: 'Parks Canada',
      source: 'bowValleyRestriction',
      alert: 'ROUTE CHANGE: Sep 1–Oct 6, 2026 personal vehicles cannot use the east Bow Valley Parkway to Johnston Canyon. Access Johnston Canyon by vehicle via Castle Junction.',
      facts: [
        'Parks Canada explicitly directs personal vehicles to Johnston Canyon via Castle Junction during the Sep 1–Oct 6 restriction.',
        'Current trail condition is generally good but wet/muddy; stay on designated trails and viewpoints.',
        'Off-trail use at Johnston Canyon is restricted.'
      ],
      patch: { parking: 'Use Johnston Canyon designated parking. For Sep 26, approach by vehicle via Castle Junction because the east Bow Valley Parkway is restricted to personal vehicles Sep 1–Oct 6.', parkingRating: 'Castle Junction access required Sep 26', bestWindow: 'Protect the full stop, but route via Castle Junction in 2026.' }
    },
    parkride: {
      kind: 'Parks Canada shuttle',
      source: 'shuttle',
      facts: [
        'Regular Lake Louise and Moraine Lake shuttles originate at Lake Louise Park & Ride, 1 Whitehorn Road.',
        'For Sep 2026 regular service: departures run 6:30 AM–5 PM and the last return is 7:30 PM.',
        'Parking is free for shuttle users; check in at the Park & Ride during the reserved one-hour departure window.'
      ],
      patch: { parking: 'Lake Louise Park & Ride, 1 Whitehorn Rd. Free parking for Parks Canada shuttle reservation holders; check in at the kiosk before boarding.', bestWindow: 'Arrive within the booked 1-hour departure window with extra check-in buffer.' }
    },
    parkride_return: {
      kind: 'Parks Canada shuttle',
      source: 'shuttleFaq',
      facts: [
        'The regular shuttle trip must begin and end at the Park & Ride.',
        'The reservation includes the initial lake, unlimited Lake Connector use, return to Park & Ride and free parking.',
        'Do not start the Icefields Parkway until everyone is back at the car with tickets/gear accounted for.'
      ],
      patch: { parking: 'Return to the same Lake Louise Park & Ride at 1 Whitehorn Rd; this is the explicit return-to-car step.', bestWindow: 'After the lakes: restroom, layers, snacks, offline map and fuel check.' }
    },
    moraine: {
      kind: 'Parks Canada shuttle',
      source: 'shuttle',
      facts: [
        'Personal vehicles are not permitted on Moraine Lake Road.',
        'Moraine Lake regular shuttle service runs through Oct 12, 2026; the Park & Ride is the required origin for regular service.',
        'Moraine Lake has no cell service, Wi-Fi, running water, lighting or services; pit toilets are available.'
      ],
      patch: { parking: 'No personal vehicle access. Use the booked Parks Canada shuttle or an authorized commercial operator.', cell: 'No cell service / Wi-Fi at the lake', bestWindow: 'Use the reserved shuttle; route order starts with the initial destination on the booking.' }
    },
    louise: {
      kind: 'Parks Canada shuttle',
      source: 'shuttleFaq',
      facts: [
        'A Parks Canada shuttle reservation can cover both Lake Louise and Moraine Lake.',
        'Unlimited Lake Connector use between the two lakes is included after Park & Ride check-in.',
        'The connector requires the valid boarding pass obtained at check-in.'
      ],
      patch: { parking: 'Use the shuttle/connector plan; do not add lakeshore parking to the regular Park & Ride itinerary.', bestWindow: 'After Moraine using the included Lake Connector; protect return-to-Park-&-Ride time.' }
    },
    bowlake: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'icefieldsBanff',
      facts: [
        'Bow Lake is a roadside Icefields Parkway point of interest.',
        'The Icefields Parkway requires a valid national park entry pass.',
        'Expect no reliable cell coverage and rapidly changing mountain weather.'
      ],
      patch: { parking: 'Use signed Bow Lake/day-use parking only.', cell: 'No reliable Icefields Parkway cell coverage', bestWindow: 'Daylight; weather and safe parking override photo timing.' }
    },
    bowlake29: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'icefieldsBanff',
      facts: [
        'This is a repeat Bow Lake opportunity, not a separate attraction.',
        'Only use it if Sep 27 weather prevented the first visit.',
        'Icefields Parkway no-cell and weather precautions still apply.'
      ],
      patch: { parking: 'Use signed Bow Lake/day-use parking only.', cell: 'No reliable Icefields Parkway cell coverage', bestWindow: 'Repeat only if the northbound visit was poor.' }
    },
    peyto: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'banffTrails',
      facts: [
        'Peyto Lake Lookout Trail is 0.6 km one way and Parks Canada estimates about 30 minutes round trip for the lookout.',
        'Current condition: respect posted notices and signs; stay on trail because alpine vegetation is fragile.',
        'The planner includes extra time for parking/viewpoint/photos beyond the official minimum walk time.'
      ],
      patch: { time: 'Official lookout trail: 0.6 km one way / ~30 min round trip; planner protects extra viewpoint time.', parking: 'Use the Peyto/Bow Summit designated parking area only.', bestWindow: 'Daylight; stay on designated trail/viewpoint.' }
    },
    mistaya: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'banffTrails',
      facts: [
        'Mistaya Canyon Trail is about 0.6 km one way and approximately 30 minutes round trip.',
        'A short descent reaches the footbridge; Parks Canada says not to walk on rocks along the canyon edge.',
        'Current condition is good, but signs/closures can change.'
      ],
      patch: { time: 'Official trail: ~0.6 km one way / ~30 min round trip.', parking: 'Use the signed Mistaya Canyon trailhead parking.', bestWindow: 'Optional; stay off canyon-edge rocks.' }
    },
    saskcrossing: {
      kind: 'Icefields Parkway service stop',
      source: 'icefieldsBanff',
      facts: [
        'Parks Canada warns services are sparse on the 232 km Icefields Parkway.',
        'There is only one gas station along the Parkway; fill before departure and do not depend on cellular service.',
        'Services are seasonal and mountain weather can change quickly.'
      ],
      patch: { cell: 'Limited / unreliable', parking: 'Use the signed commercial service area; this is the planned fuel/rest stop.', bestWindow: 'Fuel before continuing; never assume the next service is nearby.' }
    },
    icefield: {
      kind: 'Parks Canada / glacier',
      source: 'glacier',
      alert: 'SAFETY: Do not walk onto the Athabasca Glacier. Parks Canada warns the toe is hollow/collapsing and hidden crevasses can be fatal.',
      facts: [
        'Toe of the Athabasca Glacier Trail: 1.8 km return, 60 m elevation gain/loss, about 1 hour.',
        'Parks Canada explicitly says walking on the glacier is unsafe.',
        'Bring a jacket, gloves and warm cap; glacial wind can be much colder than nearby towns.'
      ],
      patch: { time: 'Free option: Toe of the Athabasca Glacier Trail 1.8 km return / ~1 hr. Paid commercial tours are separate.', effort: 'Moderate • 1.8 km return • 60 m gain/loss', bestWindow: 'Daylight with warm layers; never step onto glacier ice.' }
    },
    icefield29: {
      kind: 'Parks Canada / optional paid attraction',
      source: 'glacier',
      alert: 'SAFETY: Free glacier viewing does not mean walking on the glacier. Use the official trail/viewpoint unless on an authorized guided commercial experience.',
      facts: [
        'The free Toe of the Athabasca Glacier Trail remains available as a separate option.',
        'The paid Ice Explorer/Skywalk is not required to see the Icefield from the road/trail area.',
        'Keep Sep 29 as an optional bonus; do not stack it with every other NICE choice.'
      ],
      patch: { bestWindow: 'Only choose paid adventure if time/budget remain; free glacier views were already protected northbound.' }
    },
    sunwapta: {
      kind: 'Parks Canada / Jasper',
      source: 'jasperTrails',
      facts: [
        'Sunwapta Falls day-use area and trail are open in the current 2026 Jasper status.',
        'Current trail condition is good; main falls access is paved.',
        'Parking is comparatively limited at this popular stop, so do not create unsafe roadside parking.'
      ],
      patch: { parking: 'Use the designated Sunwapta Falls day-use lot; skip if safe parking is unavailable.', bestWindow: 'Optional northbound stop; route safety/daylight first.' }
    },
    athfalls: {
      kind: 'Parks Canada / Jasper',
      source: 'jasperTrails',
      facts: [
        'Athabasca Falls day-use area and trail are open in current 2026 status.',
        'Current trail condition is good and the main access is paved.',
        'Stay on the developed viewpoints/railings around the powerful falls and gorge.'
      ],
      patch: { parking: 'Use designated Athabasca Falls parking; expect heavy visitor demand during daytime.', bestWindow: 'Protected MUST; use official viewpoints and remain behind barriers.' }
    },
    hinton: {
      kind: 'Locked lodging',
      source: null,
      facts: [
        'Hinton Lodge is the locked two-night base for Sep 27–29.',
        'The same reservation covers both nights; do not create a duplicate Sep 28 hotel charge.',
        'Use Hinton for fuel/rest before Jasper/Parkway driving.'
      ]
    },
    pyramid: {
      kind: 'Parks Canada / Jasper',
      source: 'jasperOpen',
      facts: [
        'Pyramid Island and Pyramid Beach are open in current 2026 status.',
        'Parking at Pyramid Island is very limited compared with Pyramid Beach.',
        'Early arrival remains the planner strategy; use only designated parking.'
      ],
      patch: { parking: 'Pyramid Island parking is very limited; arrive early and use designated areas only.', bestWindow: 'Early morning before peak demand.' }
    },
    patricia: {
      kind: 'Parks Canada / Jasper',
      source: 'jasperOpen',
      facts: [
        'Patricia Lake is open in current 2026 status.',
        'It remains CUT in this itinerary because Pyramid is the higher-value protected lake stop.',
        'Only add it if the morning is running ahead.'
      ],
      patch: { bestWindow: 'Optional only after Pyramid; keep CUT if schedule is normal.' }
    },
    jasper: {
      kind: 'Parks Canada / Jasper townsite',
      source: 'jasperOpen',
      facts: [
        'Jasper townsite is the practical fuel/food/service reset before Maligne Valley.',
        'Current Jasper visitor areas on this route are generally open except specifically closed areas such as Maligne Canyon and Cavell.',
        'Parks Canada anticipates Highway 93A roadwork from mid-September into November 2026 with no through travel; check 511 before using 93A.',
        'Check current Jasper conditions before each long drive.'
      ],
      patch: { bestWindow: 'Fuel / food / washroom reset; keep the stop operational rather than sightseeing-heavy.' }
    },
    jasper29: {
      kind: 'Parks Canada / Jasper townsite',
      source: 'jasperOpen',
      facts: [
        'This southbound Jasper stop is an operational fuel/snack reset.',
        'Check 511 Alberta and Jasper conditions before entering the Icefields Parkway.',
        'Parks Canada anticipates Highway 93A roadwork from mid-September into November 2026 with no through travel / south-side access only; do not use 93A as an assumed through-route.',
        'Do not leave Jasper assuming fuel/cell service will be continuously available southbound.'
      ],
      patch: { bestWindow: 'Fuel + snacks + road check before Hwy 93 south.' }
    },
    medicine: {
      kind: 'Parks Canada / Jasper',
      source: 'medicine',
      facts: [
        'Medicine Lake is a naturally seasonal disappearing lake: late-summer/fall water can drain through sinkholes and a limestone cave system.',
        'A lower water level in late September is normal and is part of the site’s geology.',
        'Use signed viewpoints and keep the Maligne cruise departure as the timing anchor.'
      ],
      patch: { bestWindow: 'On-route to Maligne Lake; late-season lower water can be normal.' }
    },
    maligne: {
      kind: 'Official attraction + Parks Canada',
      source: 'maligne',
      facts: [
        'Sep 7–Oct 3, 2026 cruise operating window: 9 AM–5:30 PM; pre-purchase is recommended and purchased tickets are nonrefundable.',
        'Classic Cruise: about 1.5 hours with 15 minutes near Spirit Island. Premium: 2 hours, adults 16+, Pincushion Bay, 30 minutes near Spirit Island.',
        'Operator says arrive onsite at least 30 minutes before the booked cruise and be at the boarding dock at least 15 minutes before departure; bear spray is not permitted aboard the cruise.'
      ],
      patch: { time: 'Classic ~1.5 hr; Premium 2 hr. Planner must add early-arrival buffer.', parking: 'Use the Maligne Lake visitor parking and arrive early enough to park/check in before the sailing.', bestWindow: 'Book an exact Sep 28 sailing; protect its check-in time.' }
    },
    annette: {
      kind: 'Parks Canada / Jasper',
      source: 'jasperOpen',
      facts: [
        'Lake Annette and Lake Edith day-use areas are open in current 2026 status.',
        'They remain CUT in this itinerary because the Maligne day already has stronger protected stops.',
        'Only activate them if the cruise day is materially ahead of schedule.'
      ],
      patch: { bestWindow: 'Optional after Maligne only if schedule is ahead.' }
    },
    valley5: {
      kind: 'Parks Canada / Jasper',
      source: 'fiveLakes',
      facts: [
        'Valley of the Five Lakes is open in current 2026 status.',
        'Wetland Way: 1.8 km return (easy); Emerald Loop: 5.4 km loop (moderate); Valley Loop: 7.7 km loop (moderate).',
        'The planner’s 110-minute option corresponds to a compressed Emerald Loop planning slot; actual trail pace and conditions govern.'
      ],
      patch: { time: 'Emerald Loop: 5.4 km moderate; planner reserves ~110 min. Wetland Way is 1.8 km easy.', effort: 'Moderate for Emerald Loop • rolling terrain / short steep hills', bestWindow: 'Sep 29 bonus only; check trail/wildlife status first.' }
    },
    stutfield: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'icefields',
      facts: [
        'Stutfield Glacier is an Icefields Parkway roadside glacier viewpoint.',
        'Treat it as a quick signed pullout only when parking/visibility are safe.',
        'No-cell and rapid-weather-change precautions for the Parkway apply.'
      ],
      patch: { bestWindow: 'Quick roadside view only if safe pullout and visibility are good.', cell: 'No reliable Icefields Parkway cell coverage' }
    },
    waterfowl: {
      kind: 'Parks Canada / Icefields Parkway',
      source: 'icefields',
      facts: [
        'Waterfowl Lakes is a signed Icefields Parkway point of interest/campground area.',
        'This is a short optional southbound stop, not a protected detour.',
        'No-cell, seasonal-service and rapid-weather-change Parkway precautions apply.'
      ],
      patch: { bestWindow: 'Quick southbound stop if route is healthy.', cell: 'No reliable Icefields Parkway cell coverage' }
    },
    naturalbridge: {
      kind: 'Parks Canada / Yoho',
      source: 'yoho',
      facts: [
        'Natural Bridge is a separate Yoho point of interest on Emerald Lake Road.',
        'The Kicking Horse River passes beneath a naturally formed stone bridge.',
        'Use the designated viewpoint/facilities; this stop is paired with Emerald Lake only if the Sep 29 Yoho bonus is enabled.'
      ],
      patch: { parking: 'Use the signed Natural Bridge day-use parking; this is separate from Emerald Lake parking.', bestWindow: 'Pair with Emerald Lake as one optional Yoho bonus.' }
    },
    emerald: {
      kind: 'Parks Canada / Yoho',
      source: 'yoho',
      facts: [
        'Emerald Lake parking is officially described as extremely limited.',
        'The full lakeshore trail is 5.2 km with minimal elevation gain; a short visit can stay near the bridge/lakeshore.',
        'Personal watercraft are prohibited under current water-activity restrictions.'
      ],
      patch: { parking: 'Parking is extremely limited; do not circle repeatedly or park illegally if the area is full.', effort: 'Short bridge/lakeshore look is easy; full official lakeshore trail is 5.2 km with minimal gain.', bestWindow: 'Sep 29 bonus only; parking and remaining daylight decide.' }
    },
    canmore: {
      kind: 'City of Calgary optional stop',
      source: 'calgary',
      facts: [
        'This stop ID is legacy-named; the actual planner destination is Calgary downtown / Prince’s Island, not Canmore.',
        'It remains CUT unless the flight-day buffer is comfortably protected.',
        'Rental return and airport timing always take priority.'
      ],
      patch: { title: 'Calgary Downtown / Prince’s Island (flight-day option)', bestWindow: 'Only with generous flight/rental-return buffer.' }
    }
  };

  function placeAudit(stop) {
    if (!stop) return null;
    if (stop.id === 'cochrane29' || stop.id === 'cochrane30') return PLACE_AUDIT.calgaryhotel;
    if (stop.id === 'cochrane26_dep') return PLACE_AUDIT.yyc25;
    return PLACE_AUDIT[stop.id] || PLACE_AUDIT[infoKey(stop)] || {
      kind: 'Planner location',
      source: null,
      facts: [
        'No place-specific operating rule is being asserted beyond the linked official/planner source.',
        'Use signed access and current local conditions.',
        'Re-run the official-info audit before the trip because closures and warnings can change.'
      ]
    };
  }

  const oldGetSpotInfo = getSpotInfo;
  getSpotInfo = function (stop) {
    const base = oldGetSpotInfo(stop);
    const audit = placeAudit(stop);
    return audit && audit.patch ? Object.assign({}, base, audit.patch) : base;
  };

  const MASTER_CATEGORIES = [
    ['bookings', 'Bookings & tickets'],
    ['documents', 'Documents & passes'],
    ['transport', 'Rental & shuttle'],
    ['road', 'Road & access'],
    ['digital', 'Offline & devices'],
    ['gear', 'Gear & food'],
    ['final', 'Final 48h'],
    ['places', 'Every place']
  ];

  const MASTER_ITEMS = [
    { cat: 'bookings', id: 'auto_outbound', title: 'Outbound WestJet flight paid / locked', detail: 'Derived from locked booking.', auto: function () { return bookingDone('outbound'); } },
    { cat: 'bookings', id: 'auto_return', title: 'Return WestJet flight paid / locked', detail: 'Derived from locked booking.', auto: function () { return bookingDone('return'); } },
    { cat: 'bookings', id: 'auto_rental', title: 'Ascent rental booked', detail: 'Confirmed total C$403.74; booking itself is locked.', auto: function () { return bookingDone('rental'); } },
    { cat: 'bookings', id: 'rental_due_payment', title: 'Have payment method ready for C$371.30 rental balance due at pickup', detail: 'C$32.44 is already paid. Budget also notes a possible 2.4% credit-card fee.' },
    { cat: 'bookings', id: 'rental_deposit_capacity', title: 'Leave room for the C$1,000 refundable rental deposit authorization', detail: 'Deposit is not counted as trip cost but still needs available card capacity.' },
    { cat: 'bookings', id: 'auto_parking', title: 'YYZ airport parking paid', detail: 'Derived from locked SpotHero booking.', auto: function () { return bookingDone('yyzParking'); } },
    { cat: 'bookings', id: 'auto_h26', title: 'Sep 26 Super 8 Cochrane paid / locked', detail: '1 room • 3 adults • 2 Queens.', auto: function () { return bookingDone('h26'); } },
    { cat: 'bookings', id: 'auto_hinton', title: 'Sep 27–29 Hinton Lodge booked', detail: 'One two-night reservation; Sep 28 is not a second charge.', auto: function () { return bookingDone('h27') && bookingDone('h28'); } },
    { cat: 'bookings', id: 'hinton_due_payment', title: 'Have C$429.07 Hinton Lodge balance ready at property', detail: 'The two-night reservation is booked but not prepaid.' },
    { cat: 'bookings', id: 'hotel_deposit_capacity', title: 'Leave card room for hotel deposits / holds', detail: 'Planner booking data: Super 8 C$100 property deposit; Holiday Inn C$50 stay deposit + C$50/night breakage deposit.' },
    { cat: 'bookings', id: 'auto_h29', title: 'Sep 29 Holiday Inn Calgary-Airport paid / locked', detail: 'Final trip-night hotel.', auto: function () { return bookingDone('h29'); } },
    { cat: 'bookings', id: 'auto_park', title: 'Parks Canada 3-day Family/Group pass paid', detail: 'C$73.50 paid; printing/display is a separate task.', auto: function () { return bookingDone('park'); } },
    { cat: 'bookings', id: 'shuttle_booked', title: 'Book Sep 27 Moraine + Lake Louise shuttle', detail: '60% release Sep 25 at 8 AM Mountain / 10 AM Toronto. Choose Moraine as initial destination.', due: 'Sep 25 • 10:00 AM Toronto', auto: function () { return bookingDone('shuttle'); }, link: 'https://reservation.pc.gc.ca/' },
    { cat: 'bookings', id: 'maligne_ticket', title: 'Book Maligne Lake cruise for Sep 28', detail: 'Choose Classic vs Premium and lock an exact departure time; save the confirmation offline.', due: 'Before availability tightens', link: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/tickets/' },
    { cat: 'bookings', id: 'gondola_ticket', title: 'Buy Banff Gondola only after visibility check', detail: 'Strong YES if visibility is good. Tickets are nonrefundable, so make the weather call 24–48h before.', due: 'Sep 24–25', link: 'https://www.banffjaspercollection.com/attractions/banff-gondola/' },

    { cat: 'documents', id: 'pass', title: 'PRINT the official Parks Canada receipt and DISPLAY it in the vehicle', detail: 'Receipt instruction: place it on the left-hand side of the vehicle dashboard with the date visible while travelling in the park. Do not rely only on a phone copy.', due: 'Before entering Banff' },
    { cat: 'documents', id: 'park_dates_verified', title: 'Verify the printed pass dates cover all planned park time', detail: 'Daily passes are valid until 4 PM the following day. Confirm whether any Sep 29 park travel after 4 PM needs another day.', due: 'Before Sep 26' },
    { cat: 'documents', id: 'tickets_saved', title: 'Save all tickets / confirmations offline on every phone', detail: 'Flight, shuttle, Maligne, Gondola (if bought), hotels, rental, parking and park-pass receipt.' },
    { cat: 'documents', id: 'paper', title: 'Carry paper backup of critical confirmations', detail: 'Park-pass receipt is mandatory to print; also carry shuttle / hotel / rental essentials in case phones fail.' },
    { cat: 'documents', id: 'screen', title: 'Screenshot Moraine/Lake Louise shuttle ticket on every phone', detail: 'Moraine Lake has no cell service or Wi-Fi.' },
    { cat: 'documents', id: 'yyz-parking-pass', title: 'Save SpotHero parking pass / entry instructions offline', detail: 'Paid booking is done; this task is only the offline copy and entry instructions.' },
    { cat: 'documents', id: 'id_cards_ready', title: 'Driver licence + payment cards + photo ID ready', detail: 'Keep the rental payment card and driver documents accessible, not buried in luggage.' },

    { cat: 'transport', id: 'shuttle_alarm', title: 'Set alarm for the 48-hour Parks Canada shuttle release', detail: 'Sep 25 at 10:00 AM Toronto = 8:00 AM Mountain.', due: 'Sep 25 • 10:00 AM Toronto' },
    { cat: 'transport', id: 'shuttle_moraine_first', title: 'Choose Moraine Lake as first shuttle destination', detail: 'The reservation’s initial destination must be travelled to first; then use the Lake Connector.' },
    { cat: 'transport', id: 'rental_file', title: 'Send/confirm rental file: licence + payment card + flight number', detail: 'Required by the locked rental voucher; verify supplier has everything.' },
    { cat: 'transport', id: 'rental_insurance', title: 'Confirm rental insurance / own-coverage proof', detail: 'Know what is covered before pickup.' },
    { cat: 'transport', id: 'rental_drivers', title: 'Decide any additional rental drivers', detail: 'All added drivers should be present with required documents at pickup.' },
    { cat: 'transport', id: 'rental_early_return', title: 'Confirm 4:45 PM early-return procedure with Ascent', detail: 'Planner return target is earlier than the voucher’s scheduled return.' },
    { cat: 'transport', id: 'rental_fuel_return', title: 'Plan final refuel before YYC rental return', detail: 'Return to the contracted fuel level; photograph fuel gauge and vehicle condition.' },

    { cat: 'road', id: 'bowvalley_castle_route', title: 'Keep both Castle Junction routing waypoints for Johnston Canyon', detail: 'Sep 1–Oct 6, 2026 the east Bow Valley Parkway is restricted to personal vehicles. The route now forces Castle Junction before AND after Johnston so navigation cannot use the prohibited east section.', due: 'Sep 26' },
    { cat: 'road', id: 'app511', title: 'Save 511 Alberta for road checks', detail: 'Parks Canada tells Icefields Parkway travellers to check 511 Alberta before driving.', link: 'https://511.alberta.ca/' },
    { cat: 'road', id: 'road_check', title: 'Check 511 + Banff/Jasper/Yoho bulletins immediately before each long drive', detail: 'Conditions can change by hour; late-September rain can become snow.' },
    { cat: 'road', id: 'jasper93a_check', title: 'Do not assume Highway 93A is a through-route in late September', detail: 'Parks Canada anticipates mid-Sep to mid-Nov 2026 roadwork with 93A accessible from the south entrance only / no through travel. Check 511 before relying on 93A.' },
    { cat: 'road', id: 'fuelplan', title: 'Start Parkway days with a full tank', detail: 'Services are sparse and there is one gas station along the 232 km Parkway.' },
    { cat: 'road', id: 'sep27_fuel', title: 'Sep 27: full tank before Lake Louise / Icefields Parkway', detail: 'Do not depend on cellular service to find fuel.' },
    { cat: 'road', id: 'sep29_fuel', title: 'Sep 29: fill in Hinton/Jasper before southbound Parkway', detail: 'Treat Jasper as the operational fuel reset.' },
    { cat: 'road', id: 'wildlife_drive', title: 'Review wildlife driving rule: never stop in a live lane', detail: 'Expect wildlife traffic on Maligne Road / Parkway; use legal pullouts only.' },

    { cat: 'digital', id: 'offline_maps', title: 'Download offline maps for Calgary → Banff → Lake Louise → Jasper → Hinton → Yoho', detail: 'There is no dependable cell coverage on the Icefields Parkway and none at Moraine Lake.' },
    { cat: 'digital', id: 'offline', title: 'Verify offline map actually opens with phone in airplane mode', detail: 'Test the downloaded area, not just the download indicator.' },
    { cat: 'digital', id: 'power', title: 'Pack power bank + car charging cable', detail: 'Navigation/camera continue draining battery even without cell service.' },
    { cat: 'digital', id: 'weather_links', title: 'Save Environment Canada + Parks Canada condition pages', detail: 'Use official sources for the final weather/closure call.' },
    { cat: 'digital', id: 'contacts_offline', title: 'Save rental / hotel / emergency contacts offline', detail: 'Do not depend on search or email loading when signal is weak.' },

    { cat: 'gear', id: 'shell', title: 'Waterproof shell + insulating mid-layer', detail: 'High-elevation weather can change quickly.' },
    { cat: 'gear', id: 'hat', title: 'Warm hat + light gloves', detail: 'Especially for Peyto / Icefield / windy viewpoints.' },
    { cat: 'gear', id: 'shoes', title: 'Sturdy waterproof walking shoes', detail: 'Current Banff trails include wet/muddy sections.' },
    { cat: 'gear', id: 'extra', title: 'Extra warm layer kept in the car', detail: 'Keep accessible, not under all luggage.' },
    { cat: 'gear', id: 'bear_spray', title: 'Carry accessible bear spray and know how to use it', detail: 'Parks Canada currently has bear warnings around Lake Minnewanka and recommends bear-safe travel on trails.' },
    { cat: 'gear', id: 'water', title: 'Water for all three travellers', detail: 'Long service gaps; Moraine has no running water/services.' },
    { cat: 'gear', id: 'snacks', title: 'Road snacks / quick meals for Parkway days', detail: 'Do not build the schedule around slow service stops.' },
    { cat: 'gear', id: 'sun', title: 'Sunglasses + SPF', detail: 'High-altitude/glacier glare.' },
    { cat: 'gear', id: 'first', title: 'Small first-aid + blister kit', detail: 'Keep in daypack or accessible car storage.' },

    { cat: 'final', id: 'rerun_official_audit', title: 'Re-run this complete official-info analysis', detail: 'Recheck every Parks Canada bulletin/closure, Jasper open/closed status, 511, Maligne hours, Gondola hours/visibility, shuttle details and Yoho access. Update the planner if anything changed.', due: 'Sep 23–24' },
    { cat: 'final', id: 'banff_bulletins_24h', title: '24h before Banff: recheck Banff bulletins + trail conditions', detail: 'Especially Bow Valley Parkway access and the current Lake Minnewanka bear warning.', due: 'Sep 25' },
    { cat: 'final', id: 'jasper_bulletins_24h', title: 'Before Jasper/Parkway: recheck Jasper open/closed + trail conditions', detail: 'Current data is a Sep 1 snapshot; closures/wildlife warnings may change.', due: 'Sep 27–29' },
    { cat: 'final', id: 'gondola_visibility', title: 'Check Banff Gondola summit weather / visibility before buying', detail: 'MUST if visibility is good; skip for cloud/fog because tickets are nonrefundable.', due: '24–48h before Sep 26' },
    { cat: 'final', id: 'maligne_departure_confirmed', title: 'Confirm exact Maligne departure + arrival buffer', detail: 'Operator recommends pre-purchase and at least 30 min early; planner route must match the exact sailing.', due: 'After booking' },
    { cat: 'final', id: 'layers_ready', title: 'Put warm layers / rain shell in the car cabin', detail: 'Not buried in luggage.' },
    { cat: 'final', id: 'snacks_ready', title: 'Load water + snacks into car', detail: 'Especially Sep 27 and Sep 29 Parkway days.' },
    { cat: 'final', id: 'departure_walkaround', title: 'Rental pickup/return photo walkaround', detail: 'Photograph existing condition at pickup and final condition/fuel at return.' },
    { cat: 'final', id: 'share_trip_plan', title: 'Share the final route + lodging plan with someone not on the trip', detail: 'Parks Canada recommends leaving a trip plan and keeping an emergency contact informed of changes.' }
  ];

  function itemDone(item) {
    if (item.auto) return !!item.auto();
    return manualDone(item.id);
  }

  function setMasterCheck(id, value) {
    const item = MASTER_ITEMS.find(function (x) { return x.id === id; });
    if (!item || item.auto) return;
    setManual(id, value);
    renderMasterChecklist();
    if (modalSpotId && !document.getElementById('spotModal').classList.contains('hidden')) {
      const found = (S.days || []).flatMap(function (d) { return d.stops.map(function (s) { return { day: d, stop: s }; }); }).find(function (x) { return x.stop.id === modalSpotId; });
      if (found) renderPlacePrereqs(found.day, found.stop);
    }
  }

  const GLOBAL_TASK_LOOKUP = {};
  MASTER_ITEMS.forEach(function (x) { GLOBAL_TASK_LOOKUP[x.id] = x; });

  function task(id, title, detail, auto) {
    return { id: id, title: title, detail: detail || '', auto: auto || null };
  }
  function globalTask(id, titleOverride) {
    const item = GLOBAL_TASK_LOOKUP[id];
    return {
      id: id,
      title: titleOverride || (item ? item.title : id),
      detail: item ? item.detail : '',
      auto: item && item.auto ? item.auto : null,
      global: true
    };
  }

  const PLACE_TASKS = {
    yyc25: [
      globalTask('rental_file'),
      globalTask('id_cards_ready'),
      globalTask('rental_due_payment'),
      globalTask('rental_deposit_capacity'),
      task('place:yyc25:flight_delay_contact', 'If the flight is delayed, contact the rental supplier before the pickup deadline', 'Keep supplier details available offline.')
    ],
    yyc30: [
      globalTask('rental_fuel_return'),
      task('place:yyc30:return_photos', 'Photograph car condition + fuel gauge before handoff'),
      task('place:yyc30:flight_buffer', 'Protect airport security / boarding buffer after rental return')
    ],
    cochrane: [
      task('place:cochrane:confirmation', 'Hotel confirmation available offline', 'Use the locked Super 8 booking.', function (stop) { return stop && (stop.id === 'cochrane26_ret' || stop.id === 'cochrane27') && bookingDone('h26'); }),
      globalTask('hotel_deposit_capacity', 'Have card room for the C$100 Super 8 property deposit'),
      task('place:cochrane:morning_fuel', 'Fuel / snacks ready before the Sep 27 mountain drive')
    ],
    calgaryhotel: [
      task('place:calgaryhotel:confirmation', 'Hotel confirmation available offline', 'Use the locked Holiday Inn Calgary-Airport booking.', function () { return bookingDone('h29'); }),
      globalTask('hotel_deposit_capacity', 'Have card room for Holiday Inn deposit / breakage hold'),
      task('place:calgaryhotel:flightday', 'Review Sep 30 rental-return + flight timing before sleep')
    ],
    minnewanka: [
      globalTask('pass'),
      globalTask('bear_spray'),
      task('place:minnewanka:bear_recheck', 'Recheck Lake Minnewanka bear warning / trail conditions that morning', 'Sep 1 snapshot has an active bear warning.'),
      task('place:minnewanka:road_recheck', 'Recheck Minnewanka Loop road construction / traffic notice')
    ],
    twojack: [globalTask('pass'), task('place:twojack:parking', 'Use legal designated parking only; skip if full')],
    banff: [globalTask('pass'), task('place:banff:trainstation', 'Use Train Station free parking if parking for the Banff stop'), task('place:banff:timer', 'Keep lunch/town stop within route budget')],
    bowfalls: [globalTask('pass'), task('place:bowfalls:legalparking', 'Use signed/legal access only; keep it a short stop')],
    surprise: [globalTask('pass'), task('place:surprise:legalpullout', 'Only stop if a legal pullout space is available')],
    gondola: [
      globalTask('pass'),
      globalTask('gondola_visibility'),
      globalTask('gondola_ticket'),
      task('place:gondola:transport', 'Decide: included transit vs C$17.50 Parks Canada parking', 'Transit is preferred when using a same-day pre-purchased ticket.'),
      task('place:gondola:creditcard', 'Bring the same credit card used for the online Gondola ticket', 'Pursuit requires the purchasing card for non-transferable online tickets.'),
      task('place:gondola:arrival', 'Arrive ~20 min before the booked Gondola time; be in line at least 10 min before'),
      task('place:gondola:ticketoffline', 'Save Gondola ticket offline after purchase')
    ],
    castlejunction: [
      globalTask('pass'),
      globalTask('bowvalley_castle_route'),
      task('place:castlejunction:driveonly', 'Treat Castle Junction as drive-through routing, not a sightseeing stop'),
      task('place:castlejunction:noeast1a', 'Do not continue on the restricted east section of Bow Valley Parkway')
    ],
    johnston: [
      globalTask('pass'),
      globalTask('bowvalley_castle_route'),
      globalTask('shoes'),
      globalTask('bear_spray'),
      task('place:johnston:conditions', 'Recheck Johnston trail + Bow Valley Parkway bulletin that morning'),
      task('place:johnston:castle', 'Navigate to Johnston via Castle Junction, not the restricted east Parkway')
    ],
    parkride: [
      globalTask('pass'),
      globalTask('shuttle_booked'),
      globalTask('screen'),
      globalTask('shuttle_moraine_first'),
      task('place:parkride:window', 'Know the exact one-hour Park & Ride check-in window'),
      task('place:parkride:buffer', 'Arrive with check-in / washroom / gear buffer')
    ],
    parkride_return: [
      globalTask('offline_maps'),
      globalTask('fuelplan'),
      task('place:parkride_return:headcount', 'Everyone + all bags/tickets back at the car before Hwy 93'),
      task('place:parkride_return:reset', 'Restroom + layers + snacks + offline map check before Parkway')
    ],
    moraine: [
      globalTask('pass'),
      globalTask('shuttle_booked'),
      globalTask('screen'),
      globalTask('offline_maps'),
      globalTask('water'),
      task('place:moraine:boardingpass', 'Keep physical/digital shuttle boarding pass accessible for connector/return')
    ],
    louise: [
      globalTask('pass'),
      globalTask('shuttle_booked'),
      globalTask('screen'),
      task('place:louise:connector', 'Keep shuttle boarding pass for Lake Connector / return'),
      task('place:louise:returntime', 'Protect enough time for return to Park & Ride before starting Parkway')
    ],
    bowlake: [globalTask('pass'), globalTask('offline_maps'), globalTask('road_check'), task('place:bowlake:safeparking', 'Use only designated parking / pullout')],
    bowlake29: [globalTask('pass'), globalTask('offline_maps'), task('place:bowlake29:need', 'Only repeat if Sep 27 Bow Lake visibility was poor')],
    peyto: [globalTask('pass'), globalTask('offline_maps'), globalTask('shoes'), task('place:peyto:signs', 'Recheck trail notices; stay on designated trail/viewpoint')],
    mistaya: [globalTask('pass'), globalTask('offline_maps'), globalTask('shoes'), task('place:mistaya:edge', 'Stay off canyon-edge rocks; use footbridge/viewpoints only')],
    saskcrossing: [globalTask('fuelplan'), globalTask('offline_maps'), task('place:saskcrossing:fuel', 'Fuel if needed before continuing; do not assume another nearby station')],
    icefield: [globalTask('pass'), globalTask('offline_maps'), globalTask('hat'), globalTask('shell'), task('place:icefield:noice', 'Do NOT walk onto Athabasca Glacier ice'), task('place:icefield:conditions', 'Recheck Toe trail / 511 conditions')],
    icefield29: [globalTask('pass'), globalTask('offline_maps'), task('place:icefield29:choice', 'Confirm this is the chosen Sep 29 bonus before spending 2.5–3h')],
    sunwapta: [globalTask('pass'), globalTask('offline_maps'), task('place:sunwapta:parking', 'Use designated parking; skip if safe parking is unavailable')],
    athfalls: [globalTask('pass'), globalTask('offline_maps'), task('place:athfalls:railings', 'Stay behind barriers / on paved official viewpoints')],
    hinton: [task('place:hinton:confirmation', 'Hinton Lodge two-night confirmation saved offline', '', function () { return bookingDone('h27') && bookingDone('h28'); }), globalTask('hinton_due_payment'), task('place:hinton:fuel', 'Fill / reset before Jasper or southbound Parkway')],
    pyramid: [globalTask('pass'), task('place:pyramid:early', 'Aim early because Pyramid Island parking is very limited'), globalTask('bear_spray')],
    patricia: [globalTask('pass'), task('place:patricia:onlyif', 'Only add Patricia if Pyramid morning is ahead of schedule')],
    jasper: [globalTask('pass'), globalTask('road_check'), globalTask('jasper93a_check'), task('place:jasper:fuel', 'Fuel + food + washroom reset before Maligne Valley')],
    jasper29: [globalTask('pass'), globalTask('road_check'), globalTask('jasper93a_check'), globalTask('sep29_fuel')],
    medicine: [globalTask('pass'), task('place:medicine:timing', 'Keep stop short enough to protect exact Maligne cruise check-in')],
    maligne: [
      globalTask('pass'),
      globalTask('maligne_ticket'),
      globalTask('maligne_departure_confirmed'),
      globalTask('tickets_saved'),
      task('place:maligne:arrive', 'Arrive onsite at least 30 min before sailing and be at the dock at least 15 min before departure'),
      task('place:maligne:bearspray', 'Leave bear spray safely secured before boarding — operator does not permit it on the cruise'),
      task('place:maligne:classicpremium', 'Confirm booked product: Classic 1.5h or Premium 2h', 'Premium is adults-only 16+ and adds Pincushion Bay + 30 min near Spirit Island.')
    ],
    annette: [globalTask('pass'), task('place:annette:onlyif', 'Only activate Annette/Edith if the Maligne day is clearly ahead')],
    valley5: [globalTask('pass'), globalTask('bear_spray'), globalTask('shoes'), task('place:valley5:trailcheck', 'Recheck Valley of Five Lakes trail/wildlife status'), task('place:valley5:choice', 'Confirm Valley is the single Sep 29 big bonus before starting')],
    stutfield: [globalTask('pass'), globalTask('offline_maps'), task('place:stutfield:safe', 'Only stop with a safe legal pullout and good visibility')],
    waterfowl: [globalTask('pass'), globalTask('offline_maps'), task('place:waterfowl:time', 'Keep this a quick stop if Sep 29 is running on time')],
    naturalbridge: [globalTask('pass'), task('place:naturalbridge:yohochoice', 'Confirm Yoho is the selected Sep 29 big bonus'), task('place:naturalbridge:parking', 'Use Natural Bridge’s own signed parking; it is separate from Emerald Lake')],
    emerald: [globalTask('pass'), task('place:emerald:yohochoice', 'Confirm Yoho is the selected Sep 29 big bonus'), task('place:emerald:parking', 'If Emerald Lake parking is full, do not circle repeatedly or park illegally')],
    canmore: [task('place:calgary:buffer', 'Only enable Calgary sightseeing if rental return + flight buffer remains generous')]
  };

  function tasksForStop(stop) {
    const audit = placeAudit(stop);
    let key = stop.id;
    if (stop.id === 'cochrane29' || stop.id === 'cochrane30') key = 'calgaryhotel';
    else if (stop.id === 'cochrane26_dep') key = 'yyc25';
    else if (!PLACE_TASKS[key]) key = infoKey(stop);
    const rows = (PLACE_TASKS[key] || []).slice();
    if (!rows.length) rows.push(globalTask('rerun_official_audit'), task('place:' + stop.id + ':current', 'Recheck current official access/conditions before this stop'));
    return rows;
  }

  function placeTaskDone(row, stop) {
    if (row.auto) return !!row.auto(stop);
    const global = GLOBAL_TASK_LOOKUP[row.id];
    if (global && global.auto) return !!global.auto();
    return manualDone(row.id);
  }

  function setPlaceCheck(stopId, taskId, value) {
    const global = GLOBAL_TASK_LOOKUP[taskId];
    if (global && global.auto) return;
    setManual(taskId, value);
    renderMasterChecklist();
    const found = (S.days || []).flatMap(function (d) { return d.stops.map(function (s) { return { day: d, stop: s }; }); }).find(function (x) { return x.stop.id === stopId; });
    if (found) renderPlacePrereqs(found.day, found.stop);
  }

  function masterRow(item) {
    const done = itemDone(item);
    const locked = !!item.auto;
    return '<div class="mc-row ' + (done ? 'done' : '') + '">' +
      '<label class="mc-main">' +
        '<input type="checkbox" ' + (done ? 'checked' : '') + (locked ? ' disabled' : '') + ' onchange="setMasterChecklistItem(\'' + escapeAttr(item.id) + '\',this.checked)">' +
        '<span class="mc-box"></span>' +
        '<span><b>' + escapeHtml(item.title) + '</b>' +
          (item.detail ? '<small>' + escapeHtml(item.detail) + '</small>' : '') +
          (item.due ? '<em>Due: ' + escapeHtml(item.due) + '</em>' : '') +
        '</span>' +
      '</label>' +
      (item.link ? '<a href="' + item.link + '" target="_blank" rel="noopener">Open ↗</a>' : (locked ? '<span class="mc-auto">AUTO</span>' : '')) +
    '</div>';
  }

  function categoryCounts(cat) {
    if (cat === 'places') {
      let total = 0, done = 0;
      (S.days || []).forEach(function (day) {
        day.stops.forEach(function (stop) {
          tasksForStop(stop).forEach(function (row) {
            total++;
            if (placeTaskDone(row, stop)) done++;
          });
        });
      });
      return { done: done, total: total };
    }
    const list = MASTER_ITEMS.filter(function (x) { return x.cat === cat; });
    return { done: list.filter(itemDone).length, total: list.length };
  }

  function renderPlaceMaster() {
    return (S.days || []).map(function (day, dayIndex) {
      const cards = day.stops.map(function (stop) {
        const rows = tasksForStop(stop);
        const done = rows.filter(function (r) { return placeTaskDone(r, stop); }).length;
        const audit = placeAudit(stop);
        return '<button class="mc-place-card" onclick="openSpotModal(\'' + escapeAttr(day.date) + '\',\'' + escapeAttr(stop.id) + '\')">' +
          '<span class="mc-place-code">' + escapeHtml(tripStopCode(day, stop)) + '</span>' +
          '<span><b>' + escapeHtml(getSpotInfo(stop).title || stop.name) + '</b><small>' + escapeHtml((audit && audit.kind) || 'Planner location') + '</small></span>' +
          '<em>' + done + '/' + rows.length + '</em>' +
        '</button>';
      }).join('');
      return '<section class="mc-day"><div class="mc-day-head"><b>D' + (dayIndex + 1) + ' • ' + escapeHtml(day.date) + '</b><span>' + escapeHtml(day.label) + '</span></div><div class="mc-place-grid">' + cards + '</div></section>';
    }).join('');
  }

  function renderMasterChecklist() {
    const root = document.getElementById('checklistRoot');
    if (!root) return;

    const overallItems = MASTER_ITEMS;
    const overallDone = overallItems.filter(itemDone).length;
    const overall = Math.round((overallDone / Math.max(1, overallItems.length)) * 100);
    const catNav = MASTER_CATEGORIES.map(function (x) {
      const c = categoryCounts(x[0]);
      return '<button class="' + (activeCategory === x[0] ? 'on' : '') + '" onclick="setChecklistCategory(\'' + x[0] + '\')"><b>' + escapeHtml(x[1]) + '</b><span>' + c.done + '/' + c.total + '</span></button>';
    }).join('');

    let content;
    if (activeCategory === 'places') {
      content = '<div class="mc-place-intro"><b>Every route stop has its own pre-req list.</b><span>Opening a place here opens the same checklist inside its popup. Shared items (park pass, offline maps, tickets) stay synced with the master list.</span></div>' + renderPlaceMaster();
    } else {
      const list = MASTER_ITEMS.filter(function (x) { return x.cat === activeCategory; });
      content = '<div class="mc-list">' + list.map(masterRow).join('') + '</div>';
    }

    root.innerHTML =
      '<div class="mc-shell">' +
        '<header class="mc-hero"><div><small>MASTER TRIP CHECKLIST • OFFICIAL AUDIT ' + AUDIT_DATE + '</small><h1>Ready means the trip works offline.</h1><p>Bookings, documents, road access, gear and every-place prerequisites are centralized here. Locked bookings are checked automatically; preparation tasks remain manual.</p></div>' +
        '<div class="mc-score"><b>' + overall + '%</b><span>' + overallDone + '/' + overallItems.length + ' master tasks</span></div></header>' +
        '<div class="mc-critical">' +
          '<div><b>Park pass</b><span>Paid ✓ • still PRINT + DISPLAY receipt on left side of dashboard with date visible.</span></div>' +
          '<div><b>Johnston Sep 26</b><span>Vehicle access via Castle Junction; east Bow Valley Parkway restricted Sep 1–Oct 6.</span></div>' +
          '<div><b>Re-run audit</b><span>Do the full official-source recheck Sep 23–24.</span></div>' +
        '</div>' +
        '<nav class="mc-tabs">' + catNav + '</nav>' +
        '<div class="mc-content">' + content + '</div>' +
      '</div>';
  }

  function renderOfficialCard(day, stop) {
    const root = document.getElementById('modalOfficialRoot');
    if (!root) return;
    const audit = placeAudit(stop);
    const src = audit && audit.source ? source(audit.source) : null;
    const facts = (audit && audit.facts) || [];
    root.innerHTML =
      '<div class="modal-official-card">' +
        '<div class="modal-official-head"><div><small>' + escapeHtml((audit && audit.kind) || 'Planner location') + ' • VERIFIED ' + AUDIT_DATE + '</small><b>Official / booking truth</b></div>' +
          (src ? '<a href="' + src.url + '" target="_blank" rel="noopener">Official source ↗</a>' : '<span>Locked planner booking data</span>') +
        '</div>' +
        (audit && audit.alert ? '<div class="modal-live-alert">' + escapeHtml(audit.alert) + '</div>' : '') +
        '<ul>' + facts.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
        '<div class="modal-audit-foot">Time/route estimates remain planner estimates unless explicitly described above as official. Dynamic warnings must be rechecked before travel.</div>' +
      '</div>';
  }

  function renderPlacePrereqs(day, stop) {
    const root = document.getElementById('modalPrereqRoot');
    if (!root) return;
    const rows = tasksForStop(stop);
    const done = rows.filter(function (r) { return placeTaskDone(r, stop); }).length;
    root.innerHTML =
      '<section class="modal-prereq">' +
        '<div class="modal-prereq-head"><div><small>PRE-REQ CHECKLIST • ' + escapeHtml(tripStopCode(day, stop)) + '</small><b>Before this stop</b></div><span>' + done + '/' + rows.length + '</span></div>' +
        '<div class="modal-prereq-list">' +
          rows.map(function (row) {
            const isDone = placeTaskDone(row, stop);
            const locked = !!row.auto || !!(GLOBAL_TASK_LOOKUP[row.id] && GLOBAL_TASK_LOOKUP[row.id].auto);
            return '<label class="modal-prereq-row ' + (isDone ? 'done' : '') + '">' +
              '<input type="checkbox" ' + (isDone ? 'checked' : '') + (locked ? ' disabled' : '') + ' onchange="setPlaceChecklistItem(\'' + escapeAttr(stop.id) + '\',\'' + escapeAttr(row.id) + '\',this.checked)">' +
              '<span class="mc-box"></span><span><b>' + escapeHtml(row.title) + '</b>' + (row.detail ? '<small>' + escapeHtml(row.detail) + '</small>' : '') + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
        '<button class="btn small" onclick="closeSpotModal();setView(\'checklistview\');setChecklistCategory(\'places\')">Open master checklist ↗</button>' +
      '</section>';
  }

  function auditSavedState(state) {
    if (!state) return;
    state.checklists = state.checklists || {};
    state.officialAuditVersion = AUDIT_VERSION;

    const migrate = [
      ['rental-info', 'rental_file'],
      ['rental-drivers', 'rental_drivers'],
      ['shuttle-alarm', 'shuttle_alarm'],
      ['offline', 'offline_maps']
    ];
    migrate.forEach(function (pair) {
      if (state.checklists[pair[0]] && !state.checklists[pair[1]]) state.checklists[pair[1]] = true;
    });

    const d26 = (state.days || []).find(function (d) { return d.date === 'Sep 26'; });
    if (d26) {
      const johnston = d26.stops.find(function (s) { return s.id === 'johnston'; });
      if (johnston) {
        johnston.note = '2026 ACCESS: personal vehicles must reach Johnston Canyon via Castle Junction. East Bow Valley Parkway vehicle access is restricted Sep 1–Oct 6. Recheck Parks Canada bulletin before Sep 26.';
      }
    }
  }

  auditSavedState(BASE);
  auditSavedState(S);
  persist();

  const oldOpenSpotModal = openSpotModal;
  openSpotModal = function (date, id) {
    oldOpenSpotModal(date, id);
    const found = findStop(date, id);
    if (!found || !found.stop) return;
    renderOfficialCard(found.day, found.stop);
    renderPlacePrereqs(found.day, found.stop);
  };

  const oldSetView = setView;
  setView = function (id) {
    oldSetView(id);
    if (id === 'checklistview') renderMasterChecklist();
  };

  const oldRenderAll = renderAll;
  renderAll = function () {
    oldRenderAll();
    const view = document.getElementById('checklistview');
    if (view && view.classList.contains('on')) renderMasterChecklist();
  };

  if (typeof window.applyVerifiedPlannerPreset === 'function') {
    const oldApplyVerifiedPlannerPreset = window.applyVerifiedPlannerPreset;
    window.applyVerifiedPlannerPreset = function (name, silent) {
      const result = oldApplyVerifiedPlannerPreset(name, silent);
      auditSavedState(S);
      persist();
      renderAll();
      return result;
    };
  }

  window.setMasterChecklistItem = setMasterCheck;
  window.setPlaceChecklistItem = setPlaceCheck;
  window.renderMasterChecklist = renderMasterChecklist;
  window.setChecklistCategory = function (cat) {
    activeCategory = MASTER_CATEGORIES.some(function (x) { return x[0] === cat; }) ? cat : 'bookings';
    renderMasterChecklist();
  };
  window.tripOfficialPlaceAudit = PLACE_AUDIT;
  window.tripChecklistCategories = MASTER_CATEGORIES;

  if (!document.getElementById('masterChecklistCss')) {
    const st = document.createElement('style');
    st.id = 'masterChecklistCss';
    st.textContent =
      '.mc-shell{max-width:1220px;margin:0 auto;padding:8px 0 50px}.mc-hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;padding:22px 2px 18px;border-bottom:1px solid var(--line)}' +
      '.mc-hero small{color:#72a2bb;font-size:9px;font-weight:800;letter-spacing:.08em}.mc-hero h1{font-size:28px;margin:3px 0 5px}.mc-hero p{margin:0;color:var(--muted);font-size:11px;max-width:700px;line-height:1.55}.mc-score{text-align:right}.mc-score b{display:block;font-size:30px}.mc-score span{font-size:9px;color:var(--muted)}' +
      '.mc-critical{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.mc-critical>div{border:1px solid #6d5730;background:#201b10;border-radius:10px;padding:10px}.mc-critical b,.mc-critical span{display:block}.mc-critical b{font-size:10px;color:#efd28d}.mc-critical span{font-size:9px;color:#c9b98e;margin-top:3px;line-height:1.4}' +
      '.mc-tabs{display:flex;gap:5px;overflow-x:auto;padding:9px 0;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:12}.mc-tabs button{flex:0 0 auto;border:1px solid var(--line);background:#0b202e;color:#9db4c2;border-radius:8px;padding:7px 9px;cursor:pointer}.mc-tabs button b,.mc-tabs button span{display:block}.mc-tabs button b{font-size:9px}.mc-tabs button span{font-size:7px;color:#718b9b;margin-top:2px}.mc-tabs button.on{border-color:#4f879e;background:#123448;color:#fff}' +
      '.mc-content{padding-top:10px}.mc-list{border-top:1px solid var(--line)}.mc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:58px;border-bottom:1px solid var(--line);padding:4px 2px}.mc-main{display:flex;align-items:flex-start;gap:10px;flex:1;cursor:pointer}.mc-main input,.modal-prereq-row input{position:absolute;opacity:0;pointer-events:none}.mc-box{width:18px;height:18px;border:1px solid #547184;border-radius:5px;display:grid;place-items:center;flex:0 0 auto;margin-top:1px}.done .mc-box{background:#5da27b;border-color:#5da27b}.done .mc-box:after{content:"✓";color:#061610;font-size:11px;font-weight:900}.mc-main b{display:block;font-size:12px}.mc-main small{display:block;font-size:9px;color:var(--muted);margin-top:2px;line-height:1.45}.mc-main em{display:block;color:#d5b773;font-size:8px;font-style:normal;margin-top:3px}.mc-row>a{font-size:9px;color:#a7cada;text-decoration:none}.mc-auto{font-size:7px;color:#72aa89;border:1px solid #335e49;border-radius:999px;padding:3px 5px}' +
      '.mc-place-intro{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#0a1d2a;margin-bottom:10px}.mc-place-intro b,.mc-place-intro span{display:block}.mc-place-intro b{font-size:11px}.mc-place-intro span{font-size:9px;color:var(--muted);margin-top:3px}.mc-day{margin:12px 0}.mc-day-head{display:flex;gap:10px;align-items:baseline;padding:0 2px 6px}.mc-day-head b{font-size:11px}.mc-day-head span{font-size:9px;color:var(--muted)}.mc-place-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mc-place-card{display:grid;grid-template-columns:44px 1fr auto;gap:8px;align-items:center;background:#0b202e;color:inherit;border:1px solid var(--line);border-radius:9px;padding:8px;text-align:left;cursor:pointer}.mc-place-card:hover{border-color:#466d84}.mc-place-code{font-size:8px;font-weight:900;color:#7dc2a9}.mc-place-card b,.mc-place-card small{display:block}.mc-place-card b{font-size:9px}.mc-place-card small{font-size:7px;color:var(--muted);margin-top:2px}.mc-place-card em{font-size:8px;color:#9fc5d6;font-style:normal}' +
      '.modal-official-card{border:1px solid #3c6b59;background:#0a241d;border-radius:10px;padding:10px 11px;margin:0 0 12px}.modal-official-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.modal-official-head small,.modal-official-head b{display:block}.modal-official-head small{font-size:8px;color:#76b99b;font-weight:800}.modal-official-head b{font-size:12px;margin-top:2px}.modal-official-head a,.modal-official-head>span{font-size:8px;color:#a9d6c0}.modal-official-card ul{margin:8px 0 0;padding-left:17px}.modal-official-card li{font-size:9.5px;color:#c9ddd3;margin:4px 0;line-height:1.4}.modal-live-alert{margin-top:8px;border-left:3px solid #d1a84f;background:#2a2211;color:#f0d79a;padding:7px 8px;border-radius:5px;font-size:9px;line-height:1.45}.modal-audit-foot{font-size:7.5px;color:#77958a;border-top:1px solid rgba(255,255,255,.08);padding-top:6px;margin-top:8px}' +
      '.modal-prereq{border:1px solid #355a70;background:#081b28;border-radius:10px;padding:10px 11px;margin:12px 0}.modal-prereq-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.modal-prereq-head small,.modal-prereq-head b{display:block}.modal-prereq-head small{font-size:8px;color:#74a9c4}.modal-prereq-head b{font-size:12px}.modal-prereq-head>span{font-size:9px;color:#9fc6d8}.modal-prereq-list{border-top:1px solid rgba(255,255,255,.08);margin-bottom:8px}.modal-prereq-row{display:flex;gap:8px;align-items:flex-start;border-bottom:1px solid rgba(255,255,255,.06);padding:7px 0;cursor:pointer}.modal-prereq-row b,.modal-prereq-row small{display:block}.modal-prereq-row b{font-size:9.5px}.modal-prereq-row small{font-size:8px;color:#829aa8;margin-top:2px;line-height:1.35}' +
      '@media(max-width:900px){.mc-critical{grid-template-columns:1fr}.mc-place-grid{grid-template-columns:1fr 1fr}.mc-hero{display:block}.mc-score{text-align:left;margin-top:10px}.modal-official-head{display:block}.modal-official-head a{display:inline-block;margin-top:6px}}@media(max-width:560px){.mc-place-grid{grid-template-columns:1fr}.mc-tabs{margin-left:-2px;margin-right:-2px}}';
    document.head.appendChild(st);
  }

  renderMasterChecklist();
})();
