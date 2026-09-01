# 2026 itinerary verification notes

Verified for the **Sep 25–30, 2026** plan on **Aug. 31, 2026**.

This file separates three different kinds of numbers used by the planner:

1. **Official** — published by Parks Canada / attraction operator.
2. **Live route** — calculated in the browser by OSRM from the current stop coordinates.
3. **Planning estimate** — a deliberate buffer/dwell chosen for this specific trip. It is not presented as an official duration.

The verified preset is budget-first: 3 adults, 3 drivers, long/night driving acceptable, but protect about 6–7 hours of sleep and avoid the old 04:30 start.

## Access, reservations and operating windows

| Item | Verified 2026 fact | Planner treatment | Source |
| --- | --- | --- | --- |
| Moraine Lake access | Personal vehicles are prohibited. Regular Parks Canada shuttles originate at Lake Louise Park & Ride. | Never generates a Google car route through Moraine/Louise. | https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise |
| Shuttle inventory | 40% of seats are released at season launch; remaining 60% at **8:00 AM Mountain Time two days before departure**. | Lock flow calls out the Sep 25 08:00 MDT release for Sep 27. | https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise/faq |
| Regular shuttle hours | Regular Lake Louise / Moraine service begins at **06:30**; last return is **19:30**. Lake Connector runs during the day. | Sep 27 can use the first regular window, but the budget-first Cochrane start at 06:00 cannot produce a true sunrise Moraine visit. | https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise |
| Shuttle waiting | Parks Canada warns visitors to expect at least ~30 min waiting at busy times and potentially longer during high ridership. | Adds explicit Park & Ride check-in/wait and larger lake dwell blocks rather than pretending transfers are instantaneous. | https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise |
| Maligne Classic Cruise | About **1.5 h**; pre-purchase recommended; arrive at least **30 min early**. Sep 7–Oct 3 hours: **09:00–17:30**. | Protects a **150 min** Maligne block for early arrival + cruise + a small shoreline/parking buffer. | https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/location-hours/ |
| Maligne drive risk | Operator advises allowing substantial extra time on Maligne Road for wildlife, traffic and parking; missed cruises are non-refundable. | Jasper is only a fuel/fast-food stop and Medicine is kept short; Patricia/Annette are sacrificed before the cruise. | https://prod.banffjaspercollection.com/attractions/maligne-lake-cruise/ |
| Icefield Adventure | Ice Explorer + walk on Athabasca Glacier + Skywalk. Operator advertises **2.5–3 h**; Sep 7–30 hours are **09:00–17:00**, weather dependent. | NICE, off by default. If selected, the preset allocates **165 min (~2h45)**. | https://prod.banffjaspercollection.com/attractions/columbia-icefield-adventure/ |
| Pursuit Pass | Does not replace park entry or Moraine/Louise transport. | SKIP by default; separate Pursuit-aware recovery preset exists if this decision changes. | https://www.banffjaspercollection.com/attractions/pursuit-pass/ |

## Hiking / walking durations

| Place | Official published duration / distance | Verified preset |
| --- | --- | --- |
| Johnston Canyon Lower Falls | 1.1 km one way, about **1 h round trip** | Fallback if day is badly delayed |
| Johnston Canyon Upper Falls | 2.4 km one way, 215 m gain, about **2 h round trip** | **MUST, 120 min** |
| Lake Louise Lakeshore | 2.3 km one way, minimal gain, about **1 h round trip** | **MUST; lakeshore only** |
| Lake Agnes | 3.9 km one way, 495 m gain, **2.5–3 h** | Retained as an option in place info, but not part of Sep 27 |
| Plain of Six Glaciers | ~5.8–5.9 km one way, ~**4 h** | Not scheduled |
| Moraine Lake Rockpile Loop | Parks Canada lists the Rockpile loop at about **30 min** | Protected within the Moraine visit |
| Moraine Lakeshore | 1.3 km, about **45 min** | Optional inside the lake dwell; Rockpile has priority |
| Peyto Lake Lookout | 0.6 km one way, about **30 min** | **MUST, 40 min** including parking/photo buffer |
| Bow Summit extension | 3 km one way, about **2.5 h** | Not scheduled |
| Mistaya Canyon | ~0.5–0.6 km one way, about **30 min** | **NICE, 30 min** |
| Valley of Five Lakes — Wetland Way | 1.8 km return, easy | Short alternative only |
| Valley of Five Lakes — Emerald Loop | 5.4 km loop, moderate | **NICE, ~110 min planning estimate** |
| Valley of Five Lakes — Valley Loop | 7.7 km loop, moderate | Not scheduled |

Official hiking references:

- Banff hiking: https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking
- Lake Louise map: https://parks.canada.ca/-/media/pn-np/ab/banff/wet4/visit/depliants-brochures/2025-maps-of-the-lake-louise-area.pdf
- Jasper south-of-town trails: https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/sud-south

## Icefields Parkway operating reality

Official Parks Canada guidance:

- The Lake Louise–Jasper corridor is about **232 km**.
- There is **one summer public gas station** mid-route at Saskatchewan River Crossing.
- Bring water/food and fuel before leaving Lake Louise or Jasper.
- Cell coverage is absent / extremely limited over the corridor.
- Parking lots can fill; do not build an itinerary that requires every optional stop.

Sources:

- https://parks.canada.ca/pn-np/ab/banff/visit/les10-top10/glaciers-icefields.aspx
- https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/promenadedesglaciers-icefieldsparkway

The planner therefore protects Saskatchewan Crossing as an **operational** stop, not a sightseeing attraction.

## Daylight

The original app used Banff sunrise/sunset for every day. The verified preset uses route-appropriate values because Jasper gets dark earlier.

Reference values for Sep 2026:

- Banff Sep 25: ~07:33 / 19:33
- Banff Sep 26: ~07:35 / 19:30
- Banff Sep 27: ~07:36 / 19:28
- Jasper Sep 27: ~07:22 / 19:15
- Jasper Sep 28: ~07:23 / 19:13
- Jasper Sep 29: ~07:24 / 19:11
- Banff Sep 29: ~07:39 / 19:24
- Banff Sep 30: ~07:41 / 19:21

References:

- https://www.timeanddate.com/sun/canada/banff?month=9
- https://www.timeanddate.com/sun/%405985916?month=9

The Sep 29 route travels south, so the app uses a southbound/day-end value rather than Jasper's earlier sunset. This is a planner heuristic, not an astronomical claim for every point on the road.

## Drive times

The app **does not hard-code most inter-stop drive time claims**. It requests the current road route from the public OSRM routing service using the stop coordinates. This is intentionally better than freezing a one-time Google estimate into the JSON.

Important exceptions / interpretation:

- Moraine/Louise shuttle legs are represented by route geometry plus explicit wait/check-in buffers. The bus ride itself is not guaranteed to match the OSRM car estimate.
- Wildlife jams, construction, fuel queues, washrooms and parking searches are not predictable from a routing engine. The itinerary therefore contains dwell/buffer time and CUT/NICE escape hatches.
- Google Maps buttons are navigation aids; Parks Canada / 511 Alberta remains authoritative for closures and restrictions.

Hotel-position planning reference used by the decision tree:

- Cochrane → Lake Louise Ski Resort / Park & Ride: roughly **2 h**.
- Canmore → Lake Louise Ski Resort / Park & Ride: roughly **1 h**.

That is why the mountain-area hotel is only recommended when its final exact **1 room / 3 adults / 2 Queen Beds** total is within about **C$100** of the Cochrane alternative.

## MUST / NICE / CUT rationale

### MUST — first-time visitor core

- Lake Minnewanka
- Two Jack Lake
- Johnston Canyon to Upper Falls
- Moraine Lake + Rockpile
- Lake Louise lakeshore
- Bow Lake northbound
- Peyto Lake Lookout
- Free Athabasca Glacier / Columbia Icefield stop
- Pyramid Lake / Pyramid Island
- Medicine Lake
- Maligne Lake + booked Classic Cruise / Spirit Island
- Athabasca Falls
- Required fuel / shuttle / hotel / airport operational stops

### NICE — choose / weather / time dependent

- Banff town fast lunch
- Bow Falls
- Surprise Corner
- Mistaya Canyon
- Sunwapta Falls northbound
- Jasper fuel / fast-food stop
- Valley of Five Lakes Emerald Loop
- Stutfield Glacier viewpoint
- paid Icefield Adventure
- Waterfowl Lakes
- Emerald Lake + Natural Bridge
- Banff Gondola

### CUT — keep in data, sacrifice first

- Patricia Lake
- Lake Annette / Edith
- repeat Bow Lake after a successful Sep 27 visit
- Calgary / Prince's Island until the return flight is booked
- redundant shopping / café time

Nothing needs to be deleted from the planner simply because it is CUT.

## Sep 29 choice rule

The verified preset intentionally leaves three large bonus options visible:

1. Valley of Five Lakes — Emerald Loop (~110 min planning)
2. Paid Icefield Adventure (~165 min planning)
3. Emerald Lake + Natural Bridge (~75 min planning, parking dependent)

**Normally choose one**, after checking:

- Sep 27 completion
- weather / visibility
- fatigue
- parking
- whether Pursuit was bought
- whether the group wants another hike vs another paid experience

Athabasca Falls remains MUST regardless.

## Current 2026 closures / recheck requirement

Jasper's 2024 wildfire recovery continues to affect access. Maligne Canyon and the Cavell area have had 2026 closures/restrictions. Trail/road status can change.

Before departure and each Parkway/Maligne day, recheck:

- https://511.alberta.ca/
- https://parks.canada.ca/pn-np/ab/jasper/visit/etat-condition
- https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/etat-sentiers-trail-conditions
- https://parks.canada.ca/pn-np/ab/banff/visit/etat-condition

## Planning estimates that are intentionally *not* called official

These are trip-design values, not published attraction guarantees:

- Lake Minnewanka 40 min
- Two Jack 20 min
- Banff lunch/walk 45 min
- Bow Falls 15 min
- Surprise Corner 10 min
- Bow Lake 20 min
- free Columbia Icefield stop 45 min
- Sunwapta main-falls stop 25 min
- Athabasca Falls 35 min
- Pyramid 40 min
- Patricia 15 min
- Jasper fuel/food 35 min
- Medicine 20 min
- Stutfield 10 min
- Waterfowl 10 min
- Emerald + Natural Bridge 75 min
- YYC rental/terminal buffers

They are deliberately easy to change in the app and are restored by the verified preset if experimentation gets messy.


## Jasper wildfire-recovery closures — verified Aug. 31, 2026

### Hard exclusions

**Maligne Canyon — CLOSED for the 2026 season**

Parks Canada states that Maligne Canyon will remain closed for the 2026 season while wildfire-recovery assessments and rehabilitation planning continue. The Aug. 14, 2026 area-closure bulletin prohibits access to Maligne Canyon trails and surrounding land from First Bridge parking lot to the Fifth Bridge junction.

- Recovery page: https://parks.canada.ca/pn-np/ab/jasper/gestion-management/serviceimmobilier-realty/retablissement-recovery/pc-recovery
- Canyon page: https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraires/canyon-maligne
- Aug. 14 closure bulletin: https://parks.canada.ca/voyage-travel/securite-safety/bulletins/76ecae58-8a63-480c-8304-dc903837eefd

**Cavell Road / Mount Edith Cavell — CLOSED for the 2026 season**

Parks Canada states that Cavell Road remains closed for the 2026 season. The Aug. 14 closure bulletin says Edith Cavell Road and area are closed to all travel and specifically includes Path of the Glacier and Cavell Meadows.

- Recovery page: https://parks.canada.ca/pn-np/ab/jasper/gestion-management/serviceimmobilier-realty/retablissement-recovery/pc-recovery
- Cavell page: https://parks.canada.ca/pn-np/ab/jasper/activ/experience/sentiers-trails/cavell
- Aug. 14 closure bulletin: https://parks.canada.ca/voyage-travel/securite-safety/bulletins/76ecae58-8a63-480c-8304-dc903837eefd

### Nearby itinerary items that remain valid

- **Maligne Lake: OPEN.** Parks Canada's current "What's open" page lists Maligne Lake open while Maligne Canyon is closed.
- **Valley of the Five Lakes: OPEN.** Parks Canada lists it open and identifies it as a summer-2026 reopening.
- The Maligne Lake itinerary therefore remains **Jasper → Medicine Lake → Maligne Lake**. Do not substitute Maligne Canyon into that route.

Current-status page:
https://parks.canada.ca/pn-np/ab/jasper/visit/ouvert-fermee-open-closed

### Planner enforcement

`closure-policy.js` is loaded last and acts as a safety policy over presets, imports and manual edits:

- closed locations are never added to the active route or ETA chain
- Google route generation filters them
- imported closed stops are forced to `CUT`, zero dwell and marked `hardClosed2026`
- attempts to promote them back to MUST/NICE are blocked
- name/search/catalog attempts to add them are blocked
- the add-place catalog omits Maligne Canyon
- detail views show Parks Canada closure information instead of navigation actions
