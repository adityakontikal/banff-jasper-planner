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
3. **All hotel nights are now resolved.** Sep 25 intentionally has no hotel; Sep 26 Cochrane, Sep 27–28 Hinton, and Sep 29 Calgary Airport are locked.
4. Flights, YYC rental and YYZ parking are already locked.
5. Parks Canada Family/Group pass is **$24.50/day** for Sep 26–29 (Canada Strong Pass ended Sep 7). ≈ **$98**, not a Discovery Pass.

## Tabs

| Tab | Use it for |
| --- | --- |
| **Plan** | Countdown, shuttle alarm, booking decisions, daylight load, September climate |
| **Map** | Reorder stops, drag pins, add catalog/search places, live drive times |
| **Days** | Photo cards, arrival/departure times, per-stop briefing |
| **Book** | Status, actuals, confirmation numbers |
| **Hotels** | Locked booked stays plus the intentional no-hotel Sep 25 transition |
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

1. Sep 27 Moraine/Louise transport: lock the 48-hour shuttle release or a licensed backup.
2. Lake Louise: lakeshore only; do not add Lake Agnes on the Parkway day.
3. Maligne Lake Cruise: protected paid highlight.
4. Banff Gondola: weather / Pursuit decision.
5. Icefield Adventure: NICE, mostly skipped without the pass.
6. Sep 29: choose **one** large optional bonus — Valley of Five Lakes, paid Icefield Adventure, or Emerald Lake / Natural Bridge — after weather, fatigue and Sep 27 completion are known.

The tab also shows booking readiness, unresolved decisions, budget position, and a final-lock checklist.

## Key schedule corrections in the verified preset

- **Sep 25 arrival night has no hotel by choice.** WestJet lands 12:44 AM Sep 26 and the Ascent rental pickup is 1:30 AM.
- **Sep 26** keeps the same Banff-first route but now starts from YYC at **05:45**, reaching the mountain corridor around sunrise and ending at the booked Cochrane hotel.
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


## Scroll contract

Scrolling is centralized in `scroll-policy.js`, which is intentionally loaded **last**.

- **Desktop/laptop:** the application remains viewport-sized. Normal pages use one vertical content scroller; Map and Days keep their purpose-built internal panes.
- **Phone/tablet:** the **document is the only page scroller**. Active pages are auto-height and never own vertical scroll.
- The only phone elements allowed to scroll internally are true overlays such as the destination modal and the More sheet.
- Horizontal day/tab/chip strips remain horizontally scrollable without taking ownership of vertical page scrolling.
- Map remains a fixed-height interactive surface; its ETA panel and optional editor sit in normal page flow below it.

A small diagnostic is available in the console as `getPlannerScrollState()` if a future CSS change causes another regression.


## Route-safe NICE options

The Plan page keeps classification separate from selection:

- **MUST** — protected first-timer/core stop.
- **NICE ON** — still `priority: nice`, but included in the live route/timeline.
- **NICE OFF** — still `priority: nice`, shown muted and excluded from routing/timing.
- **CUT** — actual fallback/removal bucket.

Turning a NICE stop on never promotes it to MUST and turning it off never rewrites it to CUT. Its position in the day's stop array is preserved, so re-enabling it inserts it back into the same route-safe location.

The verified preset starts only a small set of logistical NICE stops enabled by default (Banff quick lunch, Jasper quick fuel/food, and southbound Jasper fuel). Other NICE sightseeing options start off and can be tested from Plan.

Each day card shows:

- core MUST-only finish time
- finish time with the currently enabled NICE stops
- daylight remaining / after-sunset amount
- each NICE option's approximate incremental route-time cost
- a route-ordered ON/OFF switch

Sep 29's Valley of Five Lakes / Icefield Adventure / Emerald Lake group remains mutually exclusive when experimenting: enabling one NICE option turns the sibling NICE options off, but does not lock the final MCQ decision until the user explicitly does so.


## Locked flights — booked Sep. 1, 2026

Flights are now an authoritative booking in the planner rather than a scenario:

- **Outbound:** WestJet, Fri Sep 25, YYZ 10:25 PM → YYC 12:44 AM Sep 26, nonstop, 4h 19m.
- **Return:** WestJet, Wed Sep 30, YYC 7:10 PM → YYZ 1:05 AM Oct 1, nonstop, 3h 55m.
- **Combined paid total:** **C$966.63 for 3 adults**.

The planner intentionally stores the fare as one combined flight total rather than inventing an outbound/return price split.

Effects on the itinerary:

- Sep 25/26 road clock begins at the booked **12:44 AM YYC arrival**.
- YYC rental-pickup allowance is ~60 min.
- There is intentionally **no Sep 25 hotel**.
- After the 1:30 AM rental pickup, the plan keeps a YYC-area buffer/rest window and starts the Banff-first day at **5:45 AM**.
- Sep 30 uses **4:45 PM** as the rental-return target and keeps the YYC block through the booked **7:10 PM** flight departure.
- Reset/preset/import recovery cannot downgrade these flight rows back to undecided; they remain **Paid / Locked**.
- Rental and hotels are already locked; shuttle / park admission / remaining attraction decisions are next.


## Locked rental — Ascent Car Rental

Rental is now a committed booking in the planner.

- Supplier: **Ascent Car Rental**
- Vehicle class: **Standard — Kia K4 or similar**
- Pickup: **Sep 26, 2026 at 1:30 AM**
- Pickup location: **YYC Economy Parking Lot, 2000 Airport Rd NE** (outside terminal)
- Drop-off booking time: **Sep 30, 2026 at 6:00 PM**
- Planner operational return target: **4:45 PM** for the booked 7:10 PM WestJet departure
- Confirmed rental total: **C$403.74**
- Already paid: **C$32.44**
- Remaining due at pickup: **C$371.30**
- Security deposit: **C$1,000**
- Fuel: **full-to-full**
- Mileage: **unlimited**
- Supplier phone: **+1 604 416 4600**
- Supplier email: **info@ascentcarrental.com**

The exact booking/confirmation code and main-driver name are intentionally **not committed to the GitHub source**. They remain in the user's voucher.

Important follow-ups from the voucher:

- supply driver-licence, payment-card and flight details to Ascent within 48 hours of booking or the booking is not guaranteed
- pickup must be completed by **2:28 AM Sep 26** unless Ascent agrees to hold the car longer
- confirm whether personal/credit-card rental insurance satisfies Ascent's requirements; otherwise counter insurance may be required
- additional drivers are allowed for a fee and all added drivers must be present with documents at pickup
- confirm the early-return/drop-off procedure at pickup because the booking says 6:00 PM but the trip plan returns at 4:45 PM
- the voucher notes a possible **2.4% card fee** on accepted credit-card payments

The planner budgets the full **C$403.74** confirmed rental total, but the Book screen separately shows **C$32.44 paid** and **C$371.30 still due**. The C$1,000 deposit remains excluded from trip cost.

## Locked YYZ airport parking — SpotHero

Toronto airport parking is now a committed paid booking in the planner.

- Facility: **EZ Airport Parking — Uncovered Self Park**
- Provider: **SpotHero**
- Entry: **Sep 25, 2026 after 8:00 PM**
- Exit: **Oct 1, 2026 before 8:00 PM**
- Paid total: **C$51.74**
- The pass explicitly says to **review the parking instructions before entering**.

The planner treats this as **Paid / Locked**, includes the C$51.74 in paid-booking progress, and keeps the existing Fuel + parking budget as the category envelope so the parking charge is not double-counted.

The SpotHero rental/confirmation ID and vehicle plate are intentionally **not committed to the public GitHub source**; those remain in the user's SpotHero pass.

## Paid-cruise budget rule

The current plan reserves budget for **one paid cruise only: Maligne Lake Classic Cruise / Spirit Island**. Lake Minnewanka Cruise remains off by default.

The planner now keeps the two paid-cruise toggles mutually exclusive and shows every selected paid attraction as its own Budget row. Choosing **Book Classic Cruise** in Plan and toggling the Maligne cruise on in Attractions both update the same underlying budget selection.

Hotels are fully resolved; the remaining trip lock-ins are the shuttle, park admission and attraction decisions.


## Locked hotels — booked Sep. 1, 2026

The hotel plan now reflects the actual confirmations:

- **Sep 25:** no hotel — intentional.
- **Sep 26 → Sep 27:** **Super 8 by Wyndham Cochrane**, 1 room, 3 adults, 2 Queen Beds. **C$301.28 paid.** Non-refundable. The confirmation notes a **C$100 property deposit**.
- **Sep 27 → Sep 29:** **Hinton Lodge**, 1 room, 3 adults, Standard Room, 2 Queen Beds, Non Smoking. **C$429.07 due at the property** for both nights. Free cancellation until Sep 26 at 6:00 PM property-local time.
- **Sep 29 → Sep 30:** **Holiday Inn Calgary-Airport by IHG**, 1 room, 3 adults, Standard Room with 2 Queen Beds (Low Floor). **C$171.42 paid.** Free cancellation until Sep 22 at 6:00 PM property-local time. The confirmation lists a **C$50 accommodation deposit** plus **C$50/night breakage deposit**.

The exact Hotels.com itinerary numbers are intentionally not committed into the application source.

Route impact:

- The trip remains **south → north → south**; the reversed itinerary was not adopted.
- Sep 26 now starts from YYC / the rental rather than an imaginary Sep 25 Cochrane hotel.
- Sep 26 ends at Super 8 Cochrane.
- Sep 27 departs Super 8 Cochrane and ends at Hinton Lodge.
- Sep 28 starts and ends at Hinton Lodge.
- Sep 29 departs Hinton Lodge and continues south as before, but now finishes at the booked Holiday Inn Calgary-Airport instead of Cochrane.
- Sep 30 starts already in Calgary, reducing the final-day hotel→YYC transfer substantially.
