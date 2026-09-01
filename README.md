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
