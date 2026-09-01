# Banff → Jasper Trip Command Center

Interactive planner for the **Sep 25–30, 2026** Toronto → Calgary → Banff → Jasper road trip (3 adults, 1 room, 2 queens).

This is a working trip file, not a brochure. Use it to lock bookings, shape each day, and carry the plan offline-ish in a browser.

## Run it

```bash
cd banff-jasper-planner
npm start
```

Then open the URL `serve` prints (usually http://localhost:3000).

You can also open `index.html` directly, but a local server is more reliable for map tiles and search.

## What to do first (the trip is ~25 days out)

1. Open **Plan**. The red banner is the Moraine / Lake Louise shuttle.
2. **Set an alarm for Sep 25, 8:00 AM Mountain (10:00 AM Toronto).** Remaining Parks Canada seats drop 48 hours before departure. Book **Moraine Lake as first destination**. Screenshot the ticket — there is no cell at the Park & Ride.
3. Book hotels with checkout text that says **1 room • 3 adults • 2 Queen Beds**. Same Hinton hotel Sep 27–28 if you can.
4. Lock flights + YYC rental (late pickup).
5. Parks Canada Family/Group pass is **$24.50/day** for Sep 26–29 (Canada Strong Pass ended Sep 7). ≈ **$98**, not a Discovery Pass.

## Tabs

| Tab | Use it for |
| --- | --- |
| **Plan** | Countdown, shuttle alarm, booking decisions, daylight load, September climate |
| **Map** | Reorder stops, drag pins, add catalog/search places, live drive times |
| **Days** | Photo cards, arrival/departure times, per-stop briefing |
| **Book** | Status, actuals, confirmation numbers |
| **Hotels** | 2-queen picker (updates the booking row + hotel name) |
| **Do** | Paid vs free attractions; toggles feed budget and stay times |
| **Pack** | Clothes / daypack / car checklists |
| **Field** | Fuel (only one station on the Parkway), no-cell, 511, emergency numbers |
| **Budget** | Live CAD total including food |
| **Data** | Dates, lunch/buffer minutes, JSON import/export, reset |
| **Print** | Plain-language plan, `.ics` calendar, copy, print |

## Map tips

- **+ Add stop** opens the Rockies catalog (fuel, Vermilion Lakes, Maligne Canyon, Yoho extras…) plus place search.
- Double-click the map to drop a pin, then name it.
- Drag rows to reorder. Drag markers to nudge a location.
- **Fuel stops** toggles gas markers. Saskatchewan Crossing is the only public fuel on the Icefields Parkway.
- Mark a stop **✓** as you visit it. Add a per-stop note (parking, confirmation, “icy path”).
- `[` / `]` previous/next day. `Ctrl/Cmd+Z` undo. `Esc` closes popups.

If you already used an earlier save, **Reset all** (Data tab) picks up the new default Sep 27 fuel stop. Or add **Saskatchewan Crossing (fuel)** from the catalog without resetting.

## What the times mean

Drive times use OSRM when you are online, with a crow-flies fallback if not. Long days also insert a lunch block (default 40 min) and a small buffer between stops (default 8 min). Edit both under **Data**. Finish times that land after sunset light up as **DARK / OVERLOADED** — Sep 27 is designed to be tight; cut Mistaya first, never Louise / Moraine / Peyto / Athabasca.

## State

Everything saves in `localStorage` in this browser (`bj-map-planner-v4`). Export JSON from Data or Print before switching machines. Import on the other side.

## Sources worth trusting over the planner

- Shuttle: [Parks Canada Lake Louise / Moraine](https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise) · [reservation.pc.gc.ca](https://reservation.pc.gc.ca/)
- Roads: [511 Alberta](https://511.alberta.ca)
- Fees: [Banff park fees](https://parks.canada.ca/pn-np/ab/banff/visit/tarifs-fees)
- Parkway fuel: Saskatchewan River Crossing is the only mid-route station (seasonal, expensive). Fill at Lake Louise going north and Jasper going south.


## Verified budget-first preset

The app now ships with a **Verified budget-first** recovery preset based on the Aug. 31, 2026 planning review for this specific 3-adult trip.

Open **Data → Presets** at any time:

- **Verified budget-first** — the agreed plan: Maligne Cruise protected; Banff Gondola and Icefield Adventure remain optional; MUST / NICE / CUT priorities restored.
- **Core scenery only** — strips paid attractions while retaining the major natural sights.
- **Pursuit-aware** — only use if you later decide to buy the Pursuit bundle; it intentionally makes the schedule more attraction-heavy.

Applying a preset preserves booking statuses, actual paid amounts, confirmation numbers, checklist state and entered hotel prices. It resets route edits and decision answers. **Reset all** also returns to the verified budget-first base plan after this version loads.

Existing browser saves are **not silently overwritten**. If your saved itinerary predates the verified plan, the Plan tab shows an **Apply verified preset** banner.

## Lock tab: timeline decisions, not a graph

The new **Lock** tab turns the remaining choices into time-ordered MCQs:

1. Sep 26 hotel: keep Cochrane unless a mountain-area 2-queen room is within about **C$100 total**.
2. Sep 27 Moraine/Louise transport: lock the 48-hour shuttle release or a licensed backup.
3. Lake Louise: lakeshore only; do not add Lake Agnes on the Parkway day.
4. Maligne Lake Cruise: protected paid highlight.
5. Banff Gondola: weather / Pursuit decision.
6. Icefield Adventure: NICE, mostly skipped without the pass.
7. Sep 29: choose **one** large optional bonus — Valley of Five Lakes, paid Icefield Adventure, or Emerald Lake / Natural Bridge — after weather, fatigue and Sep 27 completion are known.

The tab also shows booking readiness, unresolved decisions, budget position, and a final-lock checklist.

## Key schedule corrections in the verified preset

- **Sep 26** starts at 08:30 to protect sleep after the late Calgary arrival.
- Johnston Canyon is **120 min** for Lower + Upper Falls rather than the old 90-minute assumption.
- **Sep 27** starts at 06:00, not 04:30. The plan explicitly models Park & Ride check-in, shuttle/connector waiting and return to the car.
- Sep 27 protects Moraine + Rockpile, Lake Louise lakeshore, Bow Lake, Peyto and the free Athabasca Glacier stop. Mistaya and Sunwapta are NICE.
- Athabasca Falls is moved to **Sep 29 MUST**, reducing the fiction that every Parkway highlight fits after the lake-shuttle morning.
- Maligne Cruise gets a **150-minute protected block** (cruise + early arrival / operational buffer).
- Valley of Five Lakes is **NICE** with ~110 minutes planned for the 5.4 km Emerald Loop.
- Paid Icefield Adventure is **NICE**, unselected by default, and plans **165 minutes** when chosen.
- Emerald Lake / Natural Bridge is promoted to **NICE** and competes with the other Sep 29 bonus options instead of being automatically crammed in.
- Calgary sightseeing on Sep 30 is **CUT** until the return flight is actually booked.

See [VERIFICATION.md](VERIFICATION.md) for official 2026 sources, exact published durations/access rules, and which numbers are planner estimates rather than official timings.


## Mobile quick mode

Phones use a simplified planning surface instead of a stacked desktop layout.

- **Quick** is the phone summary: budget, next booking/decision and compact day cards.
- Bottom navigation keeps **Quick / Days / Map / Plan / More** one tap away.
- Day cards show the main MUST stops with stable stop codes such as **D2-4**, plus Quick look / Map / Google Maps.
- **Plan** contains the booking checklist, decision timeline and full itinerary; there is no separate Lock page.
- The map opens first on mobile; the stop editor stays collapsed until **Edit stops** is tapped.
- Place details prioritize arrival/departure, dwell, drive-from-previous, what-to-do, parking/access and Maps links.
- Bookings, Hotels, Attractions, Budget, Pack, Road, Data/Presets and Export remain available under **More**.

The last open page is restored after reload.


## Adaptive map route clock

The Map screen now includes a live route clock driven by the current itinerary order and live OSRM road legs.

For the selected day it shows:

- exact day start and projected finish
- road distance and total drive time
- each leg's drive time and distance
- arrival time at every active stop
- editable stop dwell/wait time
- departure time
- planner buffer / meal-wait time inserted between stops
- whether road legs are still using temporary estimates while OSRM loads

The timeline always uses the **current** stop sequence. Reordering or reversing stops, dragging a marker, adding/removing a stop, changing a MUST/NICE/CUT priority, changing the start time, or editing dwell time recalculates all downstream ETAs.

MUST and NICE stops are timed. CUT stops are bypassed. Pending Sep 29 choice-group alternatives remain visible as options but are not inserted into the active ETA chain until chosen.

On desktop the route clock floats over the map and can be collapsed. On mobile it appears directly below the map so the map remains usable.


## Unified Plan and stop codes

The main **Plan** page now replaces the old split Plan + Lock workflow.

It is organized as a normal travel workflow:

1. **Before you go** — grouped booking checklist with direct booking links.
2. **Decisions** — time-ordered choices with the current answer shown first and alternatives only when Change is opened.
3. **Itinerary** — all six days with real route times and stable stop identifiers.

Stop identifiers use **Day-Stop** notation everywhere practical:

- `D1-1` = Day 1, first stop
- `D2-4` = Day 2, fourth stop
- `D5-10` = Day 5, tenth stop

They are derived from the live itinerary order, so reordering a day immediately renumbers the affected stops across the map, ETA timeline, editor, Plan page and place details.

The app also remembers the last open page in the browser and restores it on reload. A phone-only Quick page falls back to Plan when the same saved state is opened on desktop.


## Jasper 2026 wildfire-recovery hard closures

The planner hard-excludes the following Parks Canada wildfire-recovery closures from active routing and ETA calculations:

- **Maligne Canyon** — closed for the 2026 season.
- **Cavell Road / Mount Edith Cavell area** — closed for the 2026 season, including Path of the Glacier and Cavell Meadows.

These are not ordinary CUT stops. If an old JSON import or manual edit contains one, the policy layer forces it to zero dwell / CUT and filters it from Google road routes. The add-place catalog does not offer them, and closed-location detail pages do not provide a directions action.

This does **not** remove the valid Maligne Valley plan: **Medicine Lake and Maligne Lake remain open**, and **Valley of the Five Lakes is open** in 2026.

Official references are recorded in [VERIFICATION.md](VERIFICATION.md).
