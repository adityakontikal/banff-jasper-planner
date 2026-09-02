/* Banff → Jasper trip command center */
const STORE_V6 = 'bj-map-planner-v6';
const STORE_V5 = 'bj-map-planner-v5';
const STORE_V4 = 'bj-map-planner-v4';
const STORE_V3 = 'bj-map-planner-v3';
const money = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(Number(n || 0));
const COLORS = { must: '#56c6a5', nice: '#68b9ff', cut: '#f0c36a', hotel: '#c5a6ff' };

const SUN = {
  'Sep 25': { rise: '07:33', set: '19:33' },
  'Sep 26': { rise: '07:35', set: '19:30' },
  'Sep 27': { rise: '07:36', set: '19:28' },
  'Sep 28': { rise: '07:38', set: '19:26' },
  'Sep 29': { rise: '07:39', set: '19:24' },
  'Sep 30': { rise: '07:41', set: '19:22' }
};
const DATE_ISO = {
  'Sep 25': '2026-09-25', 'Sep 26': '2026-09-26', 'Sep 27': '2026-09-27',
  'Sep 28': '2026-09-28', 'Sep 29': '2026-09-29', 'Sep 30': '2026-09-30'
};

const SPOT_INFO = {
  minnewanka: {
    title: 'Lake Minnewanka', photoQuery: 'Lake Minnewanka Banff Alberta', time: '30–45 min', rating: '8.7/10',
    timingOptions: [{ label: 'Quick Shoreline', min: 20 }, { label: 'Standard Dwell', min: 40 }, { label: 'Stewart Canyon Walk', min: 75 }],
    parking: 'Large paved day-use lot (~120 stalls). Fills after 10:30 AM on weekends; ample early morning.',
    parkingRating: 'Moderate (Easy early)', bestWindow: '07:30–09:30 AM (Calm water, Cascade Mountain reflections)',
    restrooms: 'Heated flush washrooms at main day-use pavilion', cell: 'Good (LTE / 5G)', effort: 'Easy flat shoreline path',
    desc: 'The largest glacial lake in Banff National Park (21 km long), framed by Mt. Aylmer and Cascade Mountain. Excellent high-payoff launch stop before Banff town.',
    todo: 'Walk the shoreline near the day-use area, capture Cascade Mountain reflections, or stroll toward Stewart Canyon bridge.',
    reviews: '"Go early before tour buses arrive at 10 AM. The water is glass-flat in the morning with incredible mountain reflections." — Recent Review',
    cut: 'Keep this stop, but shorten to 15–20 minutes if the morning drive was delayed.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/activ/nautiques-sports/minnewanka', tag: 'Lake • Scenic'
  },
  twojack: {
    title: 'Two Jack Lake', photoQuery: 'Two Jack Lake Banff Alberta', time: '15–25 min', rating: '8.6/10',
    timingOptions: [{ label: 'Quick Photo Stop', min: 15 }, { label: 'Shoreline Stroll', min: 25 }],
    parking: 'Small roadside day-use pullout (~25 stalls). Fills quickly mid-day; high turnover.',
    parkingRating: 'Challenging mid-day / Easy early', bestWindow: '08:00–09:30 AM (Famous Mount Rundle reflection)',
    restrooms: 'Vault toilets near day-use area', cell: 'Good (LTE)', effort: 'Easy flat path (< 200m)',
    desc: 'A compact emerald lake on the Minnewanka Loop offering iconic, postcard-perfect views of Mount Rundle rising straight out of the water.',
    todo: 'Walk to the shoreline point, line up Mount Rundle with the water reflection, and snap photos from the Parks Canada red chairs.',
    reviews: '"One of the most peaceful spots in Banff if you catch it before 9 AM. The reflection of Mount Rundle is unmatched." — Traveler Review',
    cut: 'If parking is full, skip without looping repeatedly to preserve Johnston Canyon time.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Lake • Quick stop'
  },
  banff: {
    title: 'Banff Town (Lunch & Stroll)', photoQuery: 'Banff Alberta town mountains', time: '45–90 min', rating: '8.9/10',
    timingOptions: [{ label: 'Quick Lunch Grab', min: 45 }, { label: 'Standard Lunch & Walk', min: 60 }, { label: 'Relaxed Stroll & Shops', min: 90 }],
    parking: 'Banff Train Station Public Lot (500+ free stalls, 10 min walk to town). Avoid circling downtown.',
    parkingRating: 'Train Station: Easy / Downtown: Very Busy', bestWindow: '11:00 AM – 01:30 PM (Ideal lunch & resupply stop)',
    restrooms: 'Banff Visitor Centre / Town Hall / Public restrooms on Bear St.', cell: 'Excellent (5G)', effort: 'Paved pedestrian avenues',
    desc: 'The historic mountain town hub nestled beneath Cascade Mountain and Mount Norquay, packed with bakeries, cafes, and mountain culture.',
    todo: 'Park at the Train Station, walk Banff Avenue toward Cascade Mountain, grab lunch or coffee, and pick up any forgotten warm layers.',
    reviews: '"Park at the free train station lot and walk across the pedestrian bridge! Saves 20 minutes of circling crowded downtown streets." — Local Guide Tip',
    cut: 'Trim shopping/wandering time first if Johnston Canyon or daylight is at risk.',
    official: 'https://banff.ca/', tag: 'Town • Food & Rest'
  },
  bowfalls: {
    title: 'Bow Falls', photoQuery: 'Bow Falls Banff Alberta', time: '15–25 min', rating: '8.2/10',
    timingOptions: [{ label: 'Quick Look & Photo', min: 15 }, { label: 'Riverbank Stroll', min: 25 }],
    parking: 'Dedicated Bow Falls parking lot on River Avenue (~40 stalls).',
    parkingRating: 'Easy to Moderate', bestWindow: 'Mid-morning or early afternoon',
    restrooms: 'Flush washrooms at parking lot', cell: 'Good (LTE / 5G)', effort: 'Flat paved walkway (< 100m)',
    desc: 'A roaring, wide cascade where the Bow River crashes over limestone ledges just below the Fairmont Banff Springs Hotel.',
    todo: 'Walk along the river railing to the wooden viewing platforms, watch the rapids, and look up at the Banff Springs area.',
    reviews: '"Super accessible stop right in town with dramatic rushing glacial water. Very easy 15-minute photo stop." — Traveler Review',
    cut: 'Safe to shorten to a 10-minute photo stop before sacrificing Johnston Canyon.',
    official: 'https://www.banfflakelouise.com/experiences/bow-falls', tag: 'Falls • Quick stop'
  },
  surprise: {
    title: 'Surprise Corner Viewpoint', photoQuery: 'Surprise Corner Banff Springs Alberta', time: '10–15 min', rating: '8.4/10',
    timingOptions: [{ label: 'Quick Viewpoint Photo', min: 10 }, { label: 'Deck Photo & Look', min: 15 }],
    parking: 'Small dedicated pullout (~15 stalls) on Tunnel Mountain Road.',
    parkingRating: 'Limited pullout stalls', bestWindow: 'Early afternoon (Sun lights the castle facade)',
    restrooms: 'None at viewpoint', cell: 'Good (LTE)', effort: 'Small wooden observation deck (steps)',
    desc: 'The world-famous elevated viewpoint revealing the Fairmont Banff Springs Hotel rising like a Scottish castle above dense pine forests.',
    todo: 'Step onto the wooden viewing platform to capture the classic panorama of the "Castle in the Rockies" with Sulphur Mountain behind it.',
    reviews: '"The absolute best photo angle of the Fairmont Banff Springs. Don\'t linger long, just grab your shots and keep moving." — Photography Tip',
    cut: 'One of the first quick pullouts to drop if running behind schedule.',
    official: 'https://www.banfflakelouise.com/', tag: 'Viewpoint • Quick'
  },
  johnston: {
    title: 'Johnston Canyon', photoQuery: 'Johnston Canyon Banff Alberta waterfall', time: '1.5–2.0 hr', rating: '9.4/10',
    timingOptions: [{ label: 'Lower Falls Only (2.4 km)', min: 60 }, { label: 'Lower + Upper Falls (5.0 km)', min: 90 }, { label: 'Full Hike + Ink Pots', min: 150 }],
    parking: 'Johnston Canyon P1/P2 lots (~200 stalls). Extremely popular, fills mid-day.',
    parkingRating: 'Challenging (Very busy)', bestWindow: 'Early morning or late afternoon (after 14:30 when crowds thin)',
    restrooms: 'Large heated washrooms at trailhead', cell: 'No Service in canyon', effort: 'Moderate catwalks & asphalt paths with gentle incline',
    desc: 'A deep limestone slot canyon with cantilevered steel catwalks suspended directly above churning turquoise torrents leading to powerful waterfalls.',
    todo: 'Walk the catwalk to Lower Falls, duck through the natural cave to feel the spray, and continue toward Upper Falls if time allows.',
    reviews: '"The suspended catwalks inside the canyon walls are unbelievable! Lower Falls cave is a must, but watch your footing—catwalks can be wet." — Visitor Review',
    cut: 'Shorten to Lower Falls only (45–60 min) before skipping the canyon completely.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking/johnston', tag: 'Canyon • Must-do'
  },
  parkride: {
    title: 'Lake Louise Park & Ride (Shuttle Hub)', photoQuery: 'Lake Louise Ski Resort Park and Ride Alberta', time: '20–30 min transfer', rating: '10/10',
    timingOptions: [{ label: 'Standard Check-in & Board', min: 25 }, { label: 'Buffer & Gear Prep', min: 35 }],
    parking: 'Massive free parking lot at Lake Louise Ski Resort (1 Whitehorn Rd). 1000+ stalls.',
    parkingRating: 'Ample / Easy', bestWindow: 'Arrive 15–20 min before your booked reservation window',
    restrooms: 'Porta-potties & washrooms at bus boarding terminal', cell: 'Moderate (LTE)', effort: 'Flat walk from car to boarding kiosks',
    desc: 'The mandatory Parks Canada transit hub that connects you effortlessly to Moraine Lake and Lake Louise without the stress or high fees of lakeshore parking.',
    todo: 'Have your booking PDF or phone screenshot ready (no cell at Moraine). Check in at the kiosk, receive your physical bus ticket, and board the express coach.',
    reviews: '"Seamless process! Arrive 15 minutes before your time slot, show the reservation QR code on your phone, and staff gets you straight onto the coach." — Traveler Review',
    cut: 'NEVER cut this buffer—missing your reserved shuttle window risks losing access to Moraine Lake for the whole trip.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise', tag: 'Transit • Mandatory'
  },
  moraine: {
    title: 'Moraine Lake & Valley of the Ten Peaks', photoQuery: 'Moraine Lake Valley of Ten Peaks Alberta', time: '60–90 min', rating: '10/10',
    timingOptions: [{ label: 'Rockpile Panorama', min: 45 }, { label: 'Rockpile + Shoreline Trail', min: 75 }, { label: 'Consolation Lakes Hike', min: 150 }],
    parking: 'No personal vehicle access. Accessible strictly by Parks Canada Shuttle / licensed buses.',
    parkingRating: 'Shuttle Required', bestWindow: 'Morning (07:30–10:30 AM) when sunlight illuminates the Ten Peaks',
    restrooms: 'Vault toilets near lodge and shuttle drop-off', cell: 'No Cell Service', effort: 'Rockpile: 300m stairs/switchbacks (Easy-Moderate); Shoreline: Flat',
    desc: 'Widely hailed as the most magnificent alpine vista in North America—intense cyan glacial water surrounded by the towering jagged summits of the Ten Peaks.',
    todo: 'Climb the stone stairs up the Rockpile trail to the classic $20 bill viewpoint. Then walk along the lakeshore path near the wooden canoe docks.',
    reviews: '"Pictures simply do not do it justice. The color of the water from the top of the Rockpile is electric blue. Take the stairs—it only takes 10 minutes and the view is unforgettable." — Review',
    cut: 'Do not skip! This is the crown jewel of the Canadian Rockies.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise', tag: 'Lake • Crown Jewel'
  },
  louise: {
    title: 'Lake Louise Lakeshore', photoQuery: 'Lake Louise Alberta turquoise lake Victoria Glacier', time: '45–75 min', rating: '9.8/10',
    timingOptions: [{ label: 'Chateau & Lakeshore Panorama', min: 45 }, { label: 'Full Shoreline Walk (4 km)', min: 75 }, { label: 'Lake Agnes Teahouse Hike', min: 150 }],
    parking: 'Connected directly via the free Lake Connector Shuttle from Moraine Lake.',
    parkingRating: 'Connector Shuttle', bestWindow: 'Midday to early afternoon',
    restrooms: 'Public washrooms near the lakeshore promenade', cell: 'Moderate (LTE)', effort: 'Flat paved lakeshore promenade',
    desc: 'The iconic turquoise glacial lake backed by Mount Victoria and Victoria Glacier, overlooked by the historic Fairmont Chateau Lake Louise.',
    todo: 'Walk the wide promenade past the Chateau, take photos of the glacier reflection in the emerald water, and watch canoes glide across the bay.',
    reviews: '"The Lake Connector shuttle drops you right at the front! Walk 5 minutes past the Chateau crowds to the right along the shoreline for quiet, uninterrupted photos." — Traveler Tip',
    cut: 'Do not skip. Shorten the shoreline walk to 30 min if the Parkway drive is waiting.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/visit/les10-top10/louise', tag: 'Lake • World Famous'
  },
  bowlake: {
    title: 'Bow Lake & Crowfoot Glacier', photoQuery: 'Bow Lake Icefields Parkway Alberta', time: '20–30 min', rating: '8.9/10',
    timingOptions: [{ label: 'Quick Shoreline Photo', min: 15 }, { label: 'Historic Lodge Walk', min: 30 }],
    parking: 'Spacious paved parking lot at the Bow Lake day-use area and Num-Ti-Jah Lodge pullout.',
    parkingRating: 'Easy', bestWindow: 'Late morning or afternoon (Sun illuminates Crowfoot Mountain)',
    restrooms: 'Vault toilets at day-use area', cell: 'No Cell Service', effort: 'Flat gravel lakeshore path (< 100m)',
    desc: 'A massive turquoise lake directly beside Highway 93, fed by the Bow Glacier and crowned by Crowfoot Mountain and the red-roofed Num-Ti-Jah Lodge.',
    todo: 'Walk right to the water\'s edge, photograph the reflections of Crowfoot Glacier, and enjoy the wide-open Parkway vista.',
    reviews: '"One of the easiest yet most rewarding stops on the Parkway. You pull off the highway and you are immediately staring at a glowing glacial lake with zero hiking needed." — Review',
    cut: 'Trim to a 10-min photo stop if running late on the Parkway.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Lake • Icefields Parkway'
  },
  bowlake29: {
    title: 'Bow Lake (Southbound viewpoint)', photoQuery: 'Bow Lake Icefields Parkway Alberta', time: '20–30 min', rating: '8.6/10',
    timingOptions: [{ label: 'Quick Shoreline Photo', min: 15 }, { label: 'Historic Lodge Walk', min: 30 }],
    parking: 'Spacious paved parking lot at Bow Lake day-use area.',
    parkingRating: 'Easy', bestWindow: 'Afternoon light',
    restrooms: 'Vault toilets at day-use area', cell: 'No Cell Service', effort: 'Flat path',
    desc: 'Your southbound revisit of Bow Lake—ideal for catching the afternoon sun or snapping photos if northbound weather was cloudy.',
    todo: 'Short viewpoint stop for photos if conditions are clear.',
    reviews: '"Afternoon sun lights up the peaks on the east side of the lake beautifully." — Review',
    cut: 'Skip the repeat if you had good weather on Sep 27.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Lake • Revisit'
  },
  peyto: {
    title: 'Peyto Lake (Bow Summit Viewpoint)', photoQuery: 'Peyto Lake viewpoint Alberta Canadian Rockies', time: '45–60 min', rating: '9.8/10',
    timingOptions: [{ label: 'Main Viewing Platform (1.2 km)', min: 45 }, { label: 'Platform + Upper Ridge Lookout', min: 65 }],
    parking: 'Bow Summit day-use parking (~140 stalls). Highest pass on the Parkway (2,088 m).',
    parkingRating: 'Moderate (Steady turnover)', bestWindow: '11:00 AM – 02:00 PM (High sun brings out the neon wolf-shaped turquoise hue)',
    restrooms: 'Modern vault toilets at lower parking lot', cell: 'No Cell Service', effort: 'Paved 10-15 min uphill walk (50m gain, 1.2 km return). Watch for morning frost in late Sept.',
    desc: 'The highest highway viewpoint in the Canadian Rockies, looking down upon an unreal, wolf-head-shaped lake fed by glacial rock flour from Peyto Glacier.',
    todo: 'Walk up the paved trail to the viewing deck. The iconic wolf shape and vibrant cyan color are unforgettable.',
    reviews: '"The paved path is a gentle uphill walk. The viewpoint blew our minds—the lake literally looks like a wolf head colored with blue Gatorade!" — TripAdvisor Top Review',
    cut: 'Do not skip unless heavy clouds or dense blizzard obscure all visibility.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Viewpoint • Must-do'
  },
  mistaya: {
    title: 'Mistaya Canyon', photoQuery: 'Mistaya Canyon Alberta', time: '30–45 min', rating: '8.1/10',
    timingOptions: [{ label: 'Bridge & Canyon Gorge', min: 30 }, { label: 'Gorge Exploration', min: 45 }],
    parking: 'Dedicated highway trailhead parking lot on west side of Hwy 93.',
    parkingRating: 'Easy', bestWindow: 'Midday',
    restrooms: 'Vault toilets at trailhead', cell: 'No Cell Service', effort: 'Gentle downhill 500m walk to bridge, then uphill return',
    desc: 'A deep, sinuous slot canyon where the roaring Mistaya River has carved dramatic potholes, swirling eddies, and sculpted limestone curves.',
    todo: 'Walk down the gravel path to the wooden bridge crossing directly over the narrowest chasm, and observe the sculpted rock potholes.',
    reviews: '"A short 10-minute downhill walk leads to an impressive bridge right over a violent river canyon. Very scenic and much quieter than Johnston." — Review',
    cut: 'First natural stop on Day 3 to cut if you are behind on the 500 km drive.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Canyon • Optional'
  },
  saskcrossing: {
    title: 'Saskatchewan River Crossing (Fuel & Rest)', photoQuery: 'Saskatchewan River Crossing Icefields Parkway', time: '15–20 min', rating: '7.8/10',
    timingOptions: [{ label: 'Fuel, Washroom & Snack Top-up', min: 15 }],
    parking: 'The Crossing Resort commercial service lot.',
    parkingRating: 'Ample', bestWindow: 'Anytime',
    restrooms: 'Commercial building flush washrooms', cell: 'Spotty / Wi-Fi available at resort', effort: 'Flat commercial stop',
    desc: 'The only commercial fuel and service station between Lake Louise and Jasper (230 km). Vital insurance stop for fuel, restrooms, and coffee.',
    todo: 'Top up your tank regardless of gauge level, use the clean washrooms, stretch legs, and grab any water/snacks.',
    reviews: '"Fuel is expensive here (typically 30-40c higher per liter), but running out of gas on the Parkway without cell service is far worse! Put in $20-30 for peace of mind." — Local Advice',
    cut: 'Skip only if your fuel gauge is above 75% leaving Lake Louise.',
    official: 'https://icefieldsparkway.com/faqs', tag: 'Fuel • Essential'
  },
  icefield: {
    title: 'Columbia Icefield (Athabasca Glacier)', photoQuery: 'Athabasca Glacier Columbia Icefield Alberta', time: '45–60 min (Free) / ~2.5 hr (Paid Adventure)', rating: '9.3/10',
    timingOptions: [{ label: 'Toe of Glacier Walk & Viewpoint', min: 45 }, { label: 'Discovery Centre + Exhibits', min: 60 }, { label: 'Ice Explorer + Skywalk (Booked)', min: 150 }],
    parking: 'Upper Discovery Centre paved lot or lower Toe of the Glacier parking area.',
    parkingRating: 'Large lot (Easy)', bestWindow: 'Mid-afternoon (13:00–16:00)',
    restrooms: 'Modern flush washrooms inside Columbia Icefield Discovery Centre', cell: 'No Cell Service (Free Wi-Fi in Centre)', effort: 'Toe of Glacier: 1 km gravel path with moderate slope. Very windy & cold!',
    desc: 'The largest icefield in the Rocky Mountains south of Alaska. The Athabasca Glacier is a colossal tongue of ancient ice cascading down from the Columbia Icefield.',
    todo: 'Walk the gravel trail up to the glacial moraine and historical date markers to see how far the glacier has receded. Dress in full winter windbreakers—temperatures are 5-10°C colder than Banff.',
    reviews: '"The wind blowing off the glacier is freezing! Bring gloves, a toque, and windproof jacket even if it\'s sunny. Seeing the retreat markers from 1900 to now is sobering and awe-inspiring." — Review',
    cut: 'Keep the free viewpoint on Day 3; save the paid Ice Explorer tour for Day 5 southbound if schedule allows.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper/activ/itineraires-itineraries/promenade-icefields', tag: 'Glacier • Must-do'
  },
  icefield29: {
    title: 'Columbia Icefield (Second Chance / Adventure)', photoQuery: 'Athabasca Glacier Columbia Icefield Alberta', time: '45–60 min free / ~2.5 hr paid', rating: '8.8/10',
    timingOptions: [{ label: 'Discovery Centre & Viewpoint', min: 45 }, { label: 'Ice Explorer + Skywalk Tour', min: 150 }],
    parking: 'Discovery Centre paved parking lot.',
    parkingRating: 'Easy', bestWindow: 'Midday',
    restrooms: 'Flush washrooms inside Discovery Centre', cell: 'No Cell Service', effort: 'Flat / Tour vehicle',
    desc: 'Your southbound slot for the optional Columbia Icefield Adventure (Ice Explorer vehicle onto the glacier + glass Skywalk).',
    todo: 'Only do the paid Ice Explorer if booked and Day 5 is running ahead of schedule.',
    reviews: '"Riding the giant Ice Explorer onto the glacier ice is very unique, but dress warm!" — Review',
    cut: 'Skip the paid tour if Day 5 is running tight.',
    official: 'https://www.banffjaspercollection.com/attractions/columbia-icefield/', tag: 'Glacier • Optional paid'
  },
  sunwapta: {
    title: 'Sunwapta Falls', photoQuery: 'Sunwapta Falls Jasper Alberta', time: '30–45 min', rating: '9.1/10',
    timingOptions: [{ label: 'Upper Falls & Bridge', min: 25 }, { label: 'Lower Falls Trail (2 km)', min: 45 }],
    parking: 'Paved day-use parking lot right off Hwy 93 (~60 stalls).',
    parkingRating: 'Easy', bestWindow: 'Afternoon',
    restrooms: 'Flush washrooms at day-use area', cell: 'No Cell Service', effort: 'Upper Falls: Flat paved walk (< 100m); Lower Falls: 2 km forested path',
    desc: 'A roaring Class 6 waterfall fed by Athabasca Glacier, where the Sunwapta River splits around a forested island before plunging into a deep limestone canyon.',
    todo: 'Walk across the wooden footbridge right above the plunge point and watch the churning glacial waters enter the narrow chasm.',
    reviews: '"Super easy stop right off the highway. The upper falls viewing bridge is literally 2 minutes from your car and the sheer volume of water is wild." — Review',
    cut: 'Stick to the Upper Falls (15–25 min) rather than hiking to the lower falls.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Falls • High value'
  },
  athfalls: {
    title: 'Athabasca Falls', photoQuery: 'Athabasca Falls Jasper Alberta', time: '35–50 min', rating: '9.5/10',
    timingOptions: [{ label: 'Main Falls & Gorge Bridges', min: 35 }, { label: 'Full Pothole & Canyon Circuit', min: 50 }],
    parking: 'Large paved parking lot with tour bus loops and RV stalls (~120 stalls).',
    parkingRating: 'Easy to Moderate', bestWindow: 'Late afternoon / golden hour (Mount Kerkeslin backdrop)',
    restrooms: 'Flush washrooms near parking lot', cell: 'Weak / Spotty', effort: 'Paved walkways, concrete stairs, and bridges over the canyon',
    desc: 'One of the most powerful and scenic waterfalls in the Rockies. The massive Athabasca River narrows dramatically and forces its way through carved quartzite rock gorges with Mount Kerkeslin towering behind.',
    todo: 'Follow the multi-level walkway network down through the ancient dry canyon to the river mouth, crossing several bridges directly over boiling potholes.',
    reviews: '"The sheer power of this waterfall is breathtaking. The paved trail has several great viewing angles and carved canyon steps that take you right down to the river." — Top Review',
    cut: 'Do not skip unless total darkness forces you straight to Hinton.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Falls • Must-do'
  },
  pyramid: {
    title: 'Pyramid Lake & Pyramid Island', photoQuery: 'Pyramid Lake Jasper Alberta island bridge', time: '35–45 min', rating: '9.2/10',
    timingOptions: [{ label: 'Wooden Bridge & Island Loop', min: 35 }, { label: 'Island + Lakeshore Bench', min: 50 }],
    parking: 'Designated day-use parking stalls along Pyramid Lake Road near the footbridge.',
    parkingRating: 'Easy (Early morning)', bestWindow: '07:30–09:00 AM (Glassy reflections of Pyramid Mountain before winds pick up)',
    restrooms: 'Vault toilets near the island trailhead', cell: 'Good (LTE)', effort: 'Flat wooden footbridge and short island loop trail (< 500m)',
    desc: 'A tranquil alpine lake at the base of the striking, reddish Pyramid Mountain, featuring a historic wooden footbridge leading to a tiny pine-covered island.',
    todo: 'Walk across the wooden bridge to Pyramid Island, photograph the red pyramid peak reflecting in the glassy water, and sit in the peaceful shelter pavilion.',
    reviews: '"Go right after sunrise! The lake is like glass and the red mountain reflects perfectly. Walking across the wooden footbridge is pure magic." — Jasper Visitor Review',
    cut: 'Keep Pyramid Island; drop Patricia Lake if morning time is constrained.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Lake • Morning Highlight'
  },
  patricia: {
    title: 'Patricia Lake', photoQuery: 'Patricia Lake Jasper Alberta', time: '15–20 min', rating: '7.6/10',
    timingOptions: [{ label: 'Quick Shoreline Photo', min: 15 }],
    parking: 'Small roadside pullouts and boat launch parking on Pyramid Lake Road.',
    parkingRating: 'Easy', bestWindow: 'Morning',
    restrooms: 'None at pullout', cell: 'Good (LTE)', effort: 'Flat roadside access',
    desc: 'A quiet, forested lake just minutes before Pyramid Lake with historical WWII significance (Project Habbakuk ice-ship tests).',
    todo: 'Pull over at the scenic turnout, snap a reflection photo of the mountain ridge, and continue to Pyramid Island.',
    reviews: '"A quick 10-minute stop on your way to Pyramid Lake. Beautiful and calm in the morning." — Review',
    cut: 'First morning stop to cut if running late for your Maligne Lake Cruise.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Lake • Quick stop'
  },
  jasper: {
    title: 'Jasper Town (Lunch, Fuel & Bakery)', photoQuery: 'Jasper Alberta town mountains', time: '45–75 min', rating: '8.9/10',
    timingOptions: [{ label: 'Quick Fuel & Sandwich Grab', min: 45 }, { label: 'Sit-down Lunch & Town Walk', min: 60 }, { label: 'Relaxed Lunch & Bakery Stop', min: 75 }],
    parking: 'Connaught Drive public lots and street parking (easy in town).',
    parkingRating: 'Easy', bestWindow: '11:00 AM – 01:00 PM',
    restrooms: 'Jasper Visitor Information Centre and town parks', cell: 'Excellent (5G)', effort: 'Paved pedestrian town',
    desc: 'A relaxed, charming mountain railway town surrounded by rugged wilderness, offering cozy bakeries, brewpubs, and gear shops.',
    todo: 'Fill your fuel tank, pick up fresh pastries and sandwiches at the famous Jasper Bear\'s Paw Bakery or Sunhouse Cafe, and stock up on water for the Maligne Valley drive.',
    reviews: '"Do not miss Bear\'s Paw Bakery for raspberry white chocolate scones and gourmet sandwiches to take out to Maligne Lake!" — Traveler Recommendation',
    cut: 'Trim town wandering to 30 min before cutting sightseeing.',
    official: 'https://www.jasper.travel/', tag: 'Town • Food & Fuel'
  },
  jasper29: {
    title: 'Jasper (Southbound Fuel & Snacks)', photoQuery: 'Jasper Alberta town mountains', time: '20–30 min', rating: '8.0/10',
    timingOptions: [{ label: 'Fuel Top-up & Coffee Grab', min: 25 }],
    parking: 'Town gas station / Connaught Drive.',
    parkingRating: 'Easy', bestWindow: 'Early morning (07:30 AM)',
    restrooms: 'Gas station / Visitor Centre', cell: 'Excellent (5G)', effort: 'Quick stop',
    desc: 'A quick morning pit-stop in Jasper to top off fuel, grab coffee and breakfast sandwiches before hitting the southbound Icefields Parkway.',
    todo: 'Fill gas tank, grab hot coffee, check 511 Alberta road status, and head south.',
    reviews: '"Always fill your tank in Jasper before heading south on Highway 93." — Local Advice',
    cut: 'Essential fuel check before 230 km Parkway drive.',
    official: 'https://www.jasper.travel/', tag: 'Town • Fuel & Launch'
  },
  medicine: {
    title: 'Medicine Lake Viewpoint', photoQuery: 'Medicine Lake Jasper Alberta', time: '20–30 min', rating: '8.5/10',
    timingOptions: [{ label: 'Main Viewpoint & Geology Signs', min: 20 }, { label: 'Shoreline Exploration', min: 30 }],
    parking: 'Paved scenic pullouts with interpretive signs along Maligne Lake Road.',
    parkingRating: 'Easy', bestWindow: 'Late morning on the drive to Maligne Lake',
    restrooms: 'Vault toilets at main pullout', cell: 'No Cell Service', effort: 'Flat paved pullout',
    desc: 'The famous "disappearing lake" of the Rockies. In late September, water drains underground through one of the world\'s largest karst sinkhole networks, exposing eerie mudflats and rocky shores.',
    todo: 'Stop at the roadside wooden platform to view the dramatic limestone peaks and read the interpretive signs explaining how the lake drains underground into Maligne Canyon 16 km away.',
    reviews: '"In late September the lake is half-drained, creating a spooky, moon-like landscape with jagged peaks in the background. Often a great spot to spot bighorn sheep on the road!" — Review',
    cut: 'Directly on the road to Maligne Lake; keep as a 15-min photo stop.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Lake • Geological Wonder'
  },
  maligne: {
    title: 'Maligne Lake & Spirit Island Cruise', photoQuery: 'Maligne Lake Spirit Island Jasper Alberta', time: '2.0–2.5 hr', rating: '9.7/10',
    timingOptions: [{ label: 'Shoreline & Historic Boathouse (Free)', min: 60 }, { label: 'Spirit Island Boat Cruise (Booked)', min: 135 }, { label: 'Cruise + Mary Schäffer Trail', min: 165 }],
    parking: 'Large paved day-use parking lot near the ticket office and historic boathouse.',
    parkingRating: 'Ample (Arrive 30-45m before booked cruise)', bestWindow: 'Midday or early afternoon booked cruise',
    restrooms: 'Modern flush washrooms at ticket pavilion and The View restaurant', cell: 'No Cell Service', effort: 'Flat docks and paved shoreline paths; 15 min flat walk at Spirit Island',
    desc: 'The largest natural glacier-fed lake in the Canadian Rockies (22 km long), ringed by hanging glaciers and towering peaks leading to the sacred, world-famous Spirit Island.',
    todo: 'Board the heated glass-enclosed cruise boat for a 90-minute voyage down the lake. Disembark at Spirit Island for 15 minutes of world-class photography, then grab a warm drink at the historic 1920s boathouse.',
    reviews: '"Spirit Island is truly spiritual. The 90-minute cruise is worth every single penny—seeing the mountains rise directly out of the deep glacial water is a memory for a lifetime." — Verified Cruise Review',
    cut: 'If cruise is booked, never cut! If doing free visit, enjoy the shoreline and boathouse for 45 min.',
    official: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/'
  },
  annette: {
    title: 'Lake Annette & Lake Edith', photoQuery: 'Lake Annette Jasper Alberta', time: '25–35 min', rating: '7.9/10',
    timingOptions: [{ label: 'Lake Annette Beach & Stroll', min: 25 }, { label: 'Ochre Lake Loop', min: 40 }],
    parking: 'Large paved day-use parking lots at Lake Annette and Lake Edith.',
    parkingRating: 'Easy', bestWindow: 'Late afternoon',
    restrooms: 'Flush washrooms at day-use area', cell: 'Good (LTE)', effort: 'Flat paved barrier-free loop (2.4 km)',
    desc: 'A pair of crystal-clear turquoise kettle lakes near Jasper town with sandy beaches, backed by views of Mount Edith Cavell and the Colin Range.',
    todo: 'Walk out to the sandy shoreline of Lake Annette, admire the turquoise water clarity, and relax before the drive back to Hinton.',
    reviews: '"A quiet, pretty local spot to unwind at the end of the day. The water is astonishingly clear." — Review',
    cut: 'First stop on Day 4 to cut if Maligne Lake took longer or wildlife delays occurred.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Lakes • Relaxed add-on'
  },
  valley5: {
    title: 'Valley of the Five Lakes', photoQuery: 'Valley of the Five Lakes Jasper', time: '75–90 min', rating: '9.2/10',
    timingOptions: [{ label: 'Lakes 1–4 Loop (4.5 km)', min: 75 }, { label: 'Full 5-Lakes Circuit', min: 90 }],
    parking: 'Dedicated signed parking lot on Highway 93 (~50 stalls).',
    parkingRating: 'Moderate', bestWindow: 'Morning (08:00–10:00 AM for calm waters and morning light)',
    restrooms: 'Vault toilets at trailhead', cell: 'Weak / Spotty', effort: 'Moderate dirt trail (4.5 km loop, ~80m elevation change, rolling terrain)',
    desc: 'One of the top-rated short hikes in Jasper National Park, looping through five distinct jewel-like lakes ranging in color from deep jade green to electric blue.',
    todo: 'Hike Trail 9b past Lake 1, take photos at the famous Parks Canada red chairs overlooking Lake 3 and Lake 4, and marvel at the contrasting shades of green and turquoise.',
    reviews: '"Hands down the prettiest short hike in Jasper! Each lake has a different shade of emerald and turquoise. Take the loop between Lake 3 and 4 for the red chairs view." — AllTrails 5-Star Review',
    cut: 'On Day 5, this is a prime morning highlight. If skipping the hike, substitute with a photo stop at Stutfield Glacier.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Hike • Top Rated'
  },
  stutfield: {
    title: 'Stutfield Glacier Viewpoint', photoQuery: 'Stutfield Glacier Icefields Parkway Alberta', time: '10–15 min', rating: '7.8/10',
    timingOptions: [{ label: 'Roadside Viewpoint Photo', min: 10 }],
    parking: 'Signed roadside pullout on Highway 93.',
    parkingRating: 'Easy', bestWindow: 'Morning / Midday',
    restrooms: 'None at viewpoint', cell: 'No Cell Service', effort: 'Steps from car to railing',
    desc: 'A stunning roadside lookout over the Sunwapta River Canyon with views toward the hanging icefalls of the Stutfield Glacier on Mount Kitchener.',
    todo: 'Pull over for 10 minutes to photograph the massive icefall cascading down the rock face.',
    reviews: '"Quick, easy pullout on the Icefields Parkway with an awesome view of a twin hanging glacier." — Review',
    cut: 'Easy 5-minute skip if clouded over.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Glacier • Quick Viewpoint'
  },
  waterfowl: {
    title: 'Waterfowl Lakes', photoQuery: 'Waterfowl Lakes Banff Alberta', time: '10–20 min', rating: '8.0/10',
    timingOptions: [{ label: 'Roadside Panorama', min: 15 }],
    parking: 'Designated viewpoint pullout along Highway 93.',
    parkingRating: 'Easy', bestWindow: 'Afternoon',
    restrooms: 'Vault toilets at nearby campground', cell: 'No Cell Service', effort: 'Steps from car',
    desc: 'A pair of vibrant glacier-fed lakes reflecting the massive pyramidal face of Mount Chephren and Howse Peak.',
    todo: 'Snap photos of Mount Chephren reflecting in Upper Waterfowl Lake.',
    reviews: '"Spectacular mountain reflection right off the side of the road." — Review',
    cut: 'Skip if running behind on the drive to Yoho or Cochrane.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Lakes • Quick Parkway'
  },
  naturalbridge: {
    title: 'Natural Bridge — Kicking Horse River', photoQuery: 'Natural Bridge Yoho National Park Kicking Horse River', time: '15–25 min', rating: '8.8/10',
    timingOptions: [{ label: 'Bridge viewpoints', min: 20 }, { label: 'Short riverside stroll', min: 35 }],
    parking: 'Dedicated Natural Bridge day-use parking off Emerald Lake Road.',
    parkingRating: 'Moderate', bestWindow: 'Before Emerald Lake on the same Yoho detour',
    restrooms: 'Vault toilets at the day-use area', cell: 'Weak / Spotty', effort: 'Very short marked walk from parking',
    desc: 'A separate Yoho stop where the Kicking Horse River has carved through a natural rock bridge. It is not at Emerald Lake and now has its own map pin.',
    todo: 'Use the marked viewpoints, watch the turquoise river force through the rock channel, then continue to Emerald Lake.',
    reviews: 'Short, high-value stop that pairs naturally with Emerald Lake without pretending both attractions are at one coordinate.',
    cut: 'Keep tied to the Emerald Lake bonus; skip both if the Sep 29 southbound day is running late.',
    official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/places', tag: 'Yoho • River feature'
  },
  emerald: {
    title: 'Emerald Lake (Yoho)', photoQuery: 'Emerald Lake Yoho National Park British Columbia', time: '45–90 min', rating: '9.4/10',
    timingOptions: [{ label: 'Bridge + lakeshore view', min: 45 }, { label: 'Lakeshore / lodge area', min: 60 }, { label: 'Full Emerald Lake Circuit (5.2 km)', min: 120 }],
    parking: 'Paved parking at Emerald Lake; this is separate from Natural Bridge parking.',
    parkingRating: 'Moderate / fills at popular times', bestWindow: 'Late afternoon if the southbound schedule stays healthy',
    restrooms: 'Facilities around the Emerald Lake Lodge / day-use area', cell: 'Weak / Spotty', effort: 'Flat lakeshore access for the short visit',
    desc: 'Emerald Lake is its own destination in Yoho National Park, with vivid green water and the President Range surrounding the lake.',
    todo: 'Walk the bridge/lakeshore area for the classic view. Natural Bridge is a separate stop on Emerald Lake Road and has its own map pin.',
    reviews: '"The green color of this lake looks fake in photos, but in person it is even brighter!" — Yoho visitor sentiment',
    cut: 'Treat Emerald Lake + Natural Bridge as one optional Sep 29 bonus package, but keep them as two real map locations.',
    official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/places', tag: 'Yoho • Scenic Masterpiece'
  },
  gondola: {
    title: 'Banff Gondola (Sulphur Mountain Summit)', photoQuery: 'Banff Gondola Sulphur Mountain', time: '1.5–2.0 hr', rating: '8.2/10',
    timingOptions: [{ label: 'Summit Boardwalk & Exhibits', min: 90 }, { label: 'Summit Walk + Rooftop Dining', min: 120 }],
    parking: 'Dedicated gondola lot on Mountain Avenue (paid parking enforced).',
    parkingRating: 'Paid Lot / Can be busy', bestWindow: 'Clear sunny weather only',
    restrooms: 'Full luxury facilities at base and summit complex', cell: 'Excellent (5G)', effort: '8-minute enclosed cable car ride + 1 km wooden boardwalk at summit (stairs)',
    desc: 'Ascend 698 meters in a modern 4-passenger glass gondola to the summit of Sulphur Mountain (2,281 m) for an awe-inspiring 360-degree panorama of six mountain ranges, the Bow Valley, and Banff town.',
    todo: 'Ride the gondola up, walk the scenic wooden boardwalk out to Sanson\'s Peak meteorological station, and take photos from the multi-level observation deck.',
    reviews: '"Expensive (~$105/person), but the summit views on a bluebird sunny day are unreal. Only book if summit webcams show zero fog/clouds." — Visitor Review',
    cut: 'Skip if cloudy or overcast; you already see stunning mountain peaks from the highway and lakes for free.',
    official: 'https://www.banffjaspercollection.com/attractions/banff-gondola/', tag: 'Paid • Weather Dependent'
  },
  hotspringsloc: {
    title: 'Banff Upper Hot Springs', photoQuery: 'Banff Upper Hot Springs', time: '60–75 min', rating: '7.3/10',
    timingOptions: [{ label: 'Thermal Pool Soak & Relax', min: 60 }],
    parking: 'Shared upper lot above Sulphur Mountain gondola.',
    parkingRating: 'Moderate', bestWindow: 'Evening / dusk',
    restrooms: 'Full changerooms, lockers, and showers', cell: 'Good (LTE)', effort: 'Zero effort (Thermal pool relaxation)',
    desc: 'Canada\'s highest historic mineral hot springs pool (1,585 m), fed by natural 100% geo-thermal mineral waters (38–40°C) with views across the valley to Mount Rundle.',
    todo: 'Change into swimwear, rent historic heritage suits if desired, and soak in the soothing hot mineral water after a full day of hiking.',
    reviews: '"Cheap (~$19/person) and feels incredible after walking around in the cold. It gets busy, but relaxing in hot natural spring water with mountain views is fantastic." — Review',
    cut: 'Optional evening relaxer. Easy to drop if dinner or sleep is the priority.',
    official: 'https://hotsprings.ca/banff/', tag: 'Thermal Soak • Optional'
  },
  yyc25: {
    title: 'Calgary International Airport (YYC Arrival)', photoQuery: 'Calgary International Airport YYC', time: '45 min', rating: '10/10',
    timingOptions: [{ label: 'Landing & Rental Collect', min: 45 }],
    parking: 'Ascent pickup is outside the terminal at YYC Economy Parking Lot, 2000 Airport Rd NE.',
    parkingRating: 'Outside-terminal pickup', bestWindow: 'Booked pickup 1:30 AM Sep 26; voucher deadline 2:28 AM',
    restrooms: 'Use terminal facilities before leaving', cell: 'Excellent (5G)', effort: 'Airport / parking-lot transfer',
    desc: 'Booked Ascent Car Rental pickup after the 12:44 AM WestJet arrival. Vehicle class is Standard — Kia K4 or similar.',
    todo: 'Go to the YYC Economy Parking Lot for Ascent pickup. If the flight is delayed, call +1 604 416 4600 before the 2:28 AM pickup deadline.',
    reviews: 'Voucher-backed operational note: Ascent is outside the terminal in the YYC Economy Parking Lot and is listed as operating 00:00–23:59 daily.',
    cut: 'Mandatory flight arrival.',
    official: 'https://www.yyc.com/', tag: 'Airport Hub'
  },
  yyc30: {
    title: 'Calgary International Airport (YYC Return)', photoQuery: 'Calgary International Airport YYC', time: '60–90 min', rating: '10/10',
    timingOptions: [{ label: 'Fuel, Car Return & Security', min: 60 }],
    parking: 'Ascent drop-off location: YYC Economy Parking Lot, 2000 Airport Rd NE.',
    parkingRating: 'Outside-terminal return', bestWindow: 'Planner target 16:45; voucher scheduled drop-off is 18:00',
    restrooms: 'Full airport terminal facilities', cell: 'Excellent (5G)', effort: 'Airport walk',
    desc: 'Final departure point. Booked WestJet departs YYC at 19:10 and lands YYZ at 01:05 on Oct 1. Target rental return around 16:45.',
    todo: 'Refuel to full, follow Ascent drop-off instructions, photograph the car/fuel level, and proceed to the terminal. Confirm the early-return procedure when collecting the car.',
    reviews: 'Voucher-backed operational note: scheduled drop-off is 6:00 PM, but the trip plan intentionally returns earlier for the 7:10 PM flight.',
    cut: 'Non-negotiable departure.',
    official: 'https://www.yyc.com/', tag: 'Airport Hub'
  },
  crowfoot: {
    title: 'Crowfoot Glacier Viewpoint', photoQuery: 'Crowfoot Glacier Icefields Parkway', time: '10–15 min', rating: '7.5/10',
    timingOptions: [{ label: 'Roadside Photo Stop', min: 10 }],
    parking: 'Signed Parkway pullout opposite Crowfoot Glacier.',
    parkingRating: 'Easy', bestWindow: 'Morning / Midday',
    restrooms: 'None at pullout', cell: 'No Cell Service', effort: 'Steps from car',
    desc: 'A fast Icefields Parkway viewpoint toward the remaining toes of Crowfoot Glacier perched high on Crowfoot Mountain above Bow Lake.',
    todo: 'Photo stop if the glacier is visible; pair seamlessly with Bow Lake.',
    reviews: '"Quick 5-minute photo pullout on Highway 93." — Review',
    cut: 'Skip if clouded in.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Glacier • Quick'
  },
  herbert: {
    title: 'Herbert Lake', photoQuery: 'Herbert Lake Icefields Parkway', time: '10–15 min', rating: '7.6/10',
    timingOptions: [{ label: 'Quick Reflection Photo', min: 10 }],
    parking: 'Small signed pullout just north of Lake Louise on Hwy 93.',
    parkingRating: 'Easy', bestWindow: 'Early morning',
    restrooms: 'Vault toilets', cell: 'Weak', effort: 'Flat shoreline (< 50m)',
    desc: 'A tranquil roadside mirror lake that is an easy first Parkway stop when leaving Lake Louise.',
    todo: 'Quick reflection photo if the water is calm and glassy.',
    reviews: '"A peaceful mirror reflection in the early morning." — Review',
    cut: 'Easy skip if daylight is needed elsewhere.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Lake • Quick'
  },
  vermilion: {
    title: 'Vermilion Lakes', photoQuery: 'Vermilion Lakes Banff sunset', time: '20–40 min', rating: '8.8/10',
    timingOptions: [{ label: 'Docks & Mount Rundle Photo', min: 25 }],
    parking: 'Pullouts along Vermilion Lakes Road just west of Banff.',
    parkingRating: 'Easy', bestWindow: 'Sunset / dusk (Mount Rundle reflection)',
    restrooms: 'None on road', cell: 'Good (LTE)', effort: 'Flat roadside docks',
    desc: 'Classic Mount Rundle reflections over wetland lakes, especially at sunrise or sunset. A strong add-on if the Banff day ends early.',
    todo: 'Drive the lakes road, stop at Dock 2 or 3, and watch the evening light hit Mount Rundle.',
    reviews: '"The wooden docks on Vermilion Lakes are the best sunset spot in all of Banff." — Local Photography Guide',
    cut: 'Skip if Johnston Canyon runs late.',
    official: 'https://www.banfflakelouise.com/', tag: 'Viewpoint • Sunset'
  },
  malignecanyon: {
    title: 'Maligne Canyon', photoQuery: 'Maligne Canyon Jasper', time: '45–75 min', rating: '8.7/10',
    timingOptions: [{ label: 'Bridges 1–3 Loop', min: 45 }, { label: 'Bridges 1–5 Circuit', min: 75 }],
    parking: 'Maligne Canyon day-use lot. Can fill mid-morning.',
    parkingRating: 'Moderate', bestWindow: 'Morning or late afternoon',
    restrooms: 'Flush washrooms at Maligne Canyon Wilderness Kitchen', cell: 'Good (LTE)', effort: 'Paved paths and bridges with stairs',
    desc: 'A deep limestone slot canyon with bridges and waterfalls just outside Jasper. Note: Check current Parks Canada trail advisories.',
    todo: 'Walk bridges 1–3 for dramatic canyon depths if not locked to a cruise time.',
    reviews: '"Breathtaking depths looking straight down into the narrow limestone chasm." — Review',
    cut: 'Drop this before dropping Maligne Lake.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Canyon • Optional'
  },
  tangle: {
    title: 'Tangle Falls', photoQuery: 'Tangle Falls Icefields Parkway', time: '10–15 min', rating: '7.5/10',
    timingOptions: [{ label: 'Roadside Photo', min: 10 }],
    parking: 'Roadside pullout opposite falls; watch highway traffic.',
    parkingRating: 'Small pullout', bestWindow: 'Midday',
    restrooms: 'Vault toilet nearby', cell: 'No Cell Service', effort: 'Steps from car',
    desc: 'A multi-tiered cascading roadside waterfall on the Parkway near the Icefield.',
    todo: 'Quick photo from across the highway.',
    reviews: '"Beautiful multi-step waterfall literally right beside the road." — Review',
    cut: 'Skip if no safe pullout stall.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Falls • Quick'
  },
  weeping: {
    title: 'Weeping Wall', photoQuery: 'Weeping Wall Icefields Parkway', time: '5–10 min', rating: '6.9/10',
    timingOptions: [{ label: 'Roadside Viewpoint', min: 5 }],
    parking: 'Signed viewpoint on the Parkway.',
    parkingRating: 'Easy', bestWindow: 'Midday',
    restrooms: 'None', cell: 'No Cell Service', effort: 'View from car',
    desc: 'A colossal 300-meter cliff face of weeping meltwater springs cascading down Cirrus Mountain.',
    todo: 'Quick photo from the pullout.',
    reviews: '"Impressive wall of water trickling down sheer limestone." — Review',
    cut: 'Easy 2-minute skip.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Viewpoint • Quick'
  },
  canmore: {
    title: 'Calgary Downtown / Prince\'s Island Park', photoQuery: 'Prince\'s Island Park Calgary Alberta', time: '60–90 min', rating: '8.4/10',
    timingOptions: [{ label: 'RiverWalk & Lunch', min: 60 }, { label: 'Island Park + Downtown Stroll', min: 90 }],
    parking: 'Eau Claire Market or city parkade on 2nd Ave SW.',
    parkingRating: 'Easy parkade', bestWindow: '11:00 AM – 01:30 PM (Lunch stop)',
    restrooms: 'Park pavilion and restaurants', cell: 'Excellent (5G)', effort: 'Paved river pathways',
    desc: 'An urban island park on the Bow River in downtown Calgary with scenic footbridges, walking trails, and nearby top-rated lunch spots before your airport return.',
    todo: 'Stroll across the pedestrian bridge to Prince\'s Island Park, grab lunch along 2nd Ave or RiverWalk, and prepare for the short drive to YYC Airport.',
    reviews: '"A lovely green oasis right in downtown Calgary with great food options nearby." — Review',
    cut: 'Shorten if you want extra buffer at the airport.',
    official: 'https://www.calgary.ca/', tag: 'City • Lunch & Rest'
  },
  lakelouisevillage: {
    title: 'Lake Louise Village (Fuel & Services)', photoQuery: 'Lake Louise Village Alberta', time: '15–30 min', rating: '7.7/10',
    timingOptions: [{ label: 'Fuel & Coffee Top-up', min: 15 }],
    parking: 'Samson Mall parking lot.',
    parkingRating: 'Moderate', bestWindow: 'Morning',
    restrooms: 'Public washrooms at visitor center', cell: 'Good (LTE)', effort: 'Flat commercial',
    desc: 'Services hub: fuel stations, washrooms, and bakeries before the Icefields Parkway.',
    todo: 'Fuel up and grab warm drinks before driving north.',
    reviews: '"Last standard gas station before the 230 km Parkway drive." — Review',
    cut: 'Do not linger.',
    official: 'https://www.banfflakelouise.com/', tag: 'Services • Fuel'
  },
  morant: {
    title: 'Morant\'s Curve', photoQuery: 'Morants Curve Banff Alberta train', time: '10–20 min', rating: '8.6/10',
    timingOptions: [{ label: 'Quick Viewpoint Photo', min: 10 }, { label: 'Wait for Train & Stroll', min: 25 }],
    parking: 'Dedicated viewing pullout parking on Bow Valley Parkway (Hwy 1A).',
    parkingRating: 'Easy pullout', bestWindow: 'Mid-morning or early afternoon',
    restrooms: 'None at pullout', cell: 'Moderate (LTE)', effort: 'Steps from car to wooden railing',
    desc: 'The world-famous scenic bend on Bow Valley Parkway where Canadian Pacific freight trains curve beside the turquoise Bow River with Mount Temple soaring in the backdrop.',
    todo: 'Step to the wooden viewing platform overlooking the railway bend and photograph the curve.',
    reviews: '"One of the most famous railway photo spots on earth! Trains pass every 45-60 minutes on average." — Canadian Rockies Photography Guide',
    cut: 'Easy 10-minute stop on Bow Valley Parkway.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Viewpoint • Iconic Rail'
  },
  takakkaw: {
    title: 'Takakkaw Falls (Yoho National Park)', photoQuery: 'Takakkaw Falls Yoho National Park', time: '35–50 min', rating: '9.5/10',
    timingOptions: [{ label: 'Base of Falls Walk (700m)', min: 35 }, { label: 'Bridge & Spray View', min: 50 }],
    parking: 'Large paved parking lot at the end of Yoho Valley Road (~100 stalls).',
    parkingRating: 'Moderate', bestWindow: 'Midday to afternoon (Sun illuminates spray rainbow)',
    restrooms: 'Vault toilets at parking lot', cell: 'No Cell Service', effort: 'Flat paved path (< 350m each way)',
    desc: 'The second highest waterfall in Canada (384 meters total plunge). Fed by the Daly Glacier, the roar and mist crashing down the sheer cliff face is awe-inspiring.',
    todo: 'Walk across the wooden bridge over the Yoho River up to the base of the waterfall to feel the glacial mist and see the Parks Canada red chairs.',
    reviews: '"The sheer height and thunder of this waterfall is breathtaking. The paved trail takes you right to the base where the mist cools you down instantly!" — Yoho Top Review',
    cut: 'Pair with Emerald Lake on Day 5 if running with surplus daylight.',
    official: 'https://parks.canada.ca/pn-np/bc/yoho/activ/randonnee-hiking/courtes-short', tag: 'Waterfall • Yoho Highlight'
  },
  fairview: {
    title: 'Fairview Lookout (Lake Louise)', photoQuery: 'Fairview Lookout Lake Louise Alberta', time: '40–50 min', rating: '8.8/10',
    timingOptions: [{ label: 'Elevated Lookout Hike (2 km return)', min: 45 }],
    parking: 'Accessible directly from Lake Louise lakeshore.',
    parkingRating: 'Shuttle / Lake Louise hub', bestWindow: 'Morning or early afternoon',
    restrooms: 'At Lake Louise promenade', cell: 'Moderate (LTE)', effort: 'Short uphill switchback trail (2 km return, 100m elevation gain)',
    desc: 'A steep but short trail through pine forest leading to a rustic wooden observation platform looking back across the turquoise water at Chateau Lake Louise.',
    todo: 'Ascend the switchbacks from the boathouse to the platform for the classic elevated postcard view of the Chateau with mountains behind.',
    reviews: '"Much shorter and easier than the full Lake Agnes Teahouse hike, but delivers an incredible aerial view of the lake and hotel." — Traveler Tip',
    cut: 'Great add-on if you have 45 min at Lake Louise before the shuttle.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Hike • Viewpoint'
  },
  beehive: {
    title: 'Big Beehive / Lake Agnes Teahouse', photoQuery: 'Big Beehive Lake Louise Agnes', time: '3.0–4.0 hr', rating: '9.3/10',
    timingOptions: [{ label: 'Lake Agnes Teahouse Only', min: 120 }, { label: 'Full Big Beehive Summit Hike', min: 210 }],
    parking: 'Lake Louise shuttle hub.',
    parkingRating: 'Shuttle Required', bestWindow: 'Morning',
    restrooms: 'At Lake Agnes Teahouse and lakeshore', cell: 'No Cell Service at summit', effort: 'Challenging (10.3 km return, 540m elevation gain, switchbacks)',
    desc: 'The definitive high-altitude day hike above Lake Louise. Passes Mirror Lake and the historic 1901 Lake Agnes Teahouse before ascending steep switchbacks to a cliffside gazebo overlooking the entire valley.',
    todo: 'Hike past Lake Agnes, climb the ridge switchbacks, and relax inside the wooden gazebo 500 meters directly above Lake Louise.',
    reviews: '"One of the most rewarding hikes in Banff! The teahouse is charming, and the panoramic view from the Big Beehive gazebo looking down on the electric turquoise lake is unbeatable." — AllTrails 5-Star',
    cut: 'Only attempt if dedicating half a day to serious hiking.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Hike • Epic Alpine'
  },
  hector: {
    title: 'Hector Lake Viewpoint', photoQuery: 'Hector Lake Icefields Parkway', time: '10–15 min', rating: '7.6/10',
    timingOptions: [{ label: 'Roadside Panorama', min: 10 }],
    parking: 'Roadside pullout on Highway 93 (~10 stalls).',
    parkingRating: 'Easy', bestWindow: 'Mid-morning',
    restrooms: 'None', cell: 'No Cell Service', effort: 'View from roadside pullout',
    desc: 'A quiet roadside vantage on the Icefields Parkway overlooking the pristine, undeveloped Hector Lake surrounded by the Waputik Range.',
    todo: 'Short 5-minute photo stop along the northbound Parkway drive.',
    reviews: '"A tranquil viewpoint with deep blue water framed by mountain peaks." — Review',
    cut: 'Easy 5-minute skip.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Viewpoint • Parkway'
  },
  bowglacierfalls: {
    title: 'Bow Glacier Falls Trail', photoQuery: 'Bow Glacier Falls hike Banff', time: '2.5–3.0 hr', rating: '8.7/10',
    timingOptions: [{ label: 'Full 9 km Return Hike', min: 150 }],
    parking: 'Bow Lake day-use parking.',
    parkingRating: 'Easy', bestWindow: 'Late morning',
    restrooms: 'Vault toilets at trailhead', cell: 'No Cell Service', effort: 'Moderate (9 km return, 155m gain, rocky gorge)',
    desc: 'A scenic backcountry trail skirting the eastern shore of Bow Lake, crossing gravel glacial outwash flats and climbing a limestone gorge to the base of Bow Glacier Falls.',
    todo: 'Hike around Bow Lake, navigate the boulder steps in the gorge, and touch the mist of the waterfall fed directly by the Bow Glacier.',
    reviews: '"Awesome hike that takes you along the lake and up through a narrow canyon to a massive glacial cascade." — Review',
    cut: 'Requires 2.5–3 hours; stick to Bow Lake shoreline unless dedicated to hiking.',
    official: 'https://parks.canada.ca/pn-np/ab/banff', tag: 'Hike • Glacier Falls'
  },
  athabascapass: {
    title: 'Athabasca Pass Lookout', photoQuery: 'Athabasca Pass Lookout Jasper', time: '10–15 min', rating: '7.8/10',
    timingOptions: [{ label: 'Monument & Valley View', min: 10 }],
    parking: 'Roadside viewpoint on Highway 93A near Whirlpool River.',
    parkingRating: 'Easy', bestWindow: 'Afternoon',
    restrooms: 'None', cell: 'Weak', effort: 'Steps from car',
    desc: 'A scenic and historical roadside viewpoint commemorating the famous fur trade route through the Rockies, with views toward Mount Edith Cavell and the Whirlpool Valley.',
    todo: 'Quick photo stop and historical marker on Highway 93A.',
    reviews: '"Quiet scenic pullout with great mountain history." — Review',
    cut: 'Optional quick stop near Athabasca Falls.',
    official: 'https://parks.canada.ca/pn-np/ab/jasper', tag: 'Viewpoint • Historical'
  },
  goldenskybridge: {
    title: 'Golden Skybridge (Golden, BC)', photoQuery: 'Golden Skybridge British Columbia suspension bridge', time: '1.5–2.5 hr', rating: '8.5/10',
    timingOptions: [{ label: 'Suspension Bridges & Canyon Walk', min: 90 }, { label: 'Bridges + Mountain Coaster', min: 150 }],
    parking: 'Large paved visitor center parking lot in Golden, BC.',
    parkingRating: 'Ample', bestWindow: 'Midday',
    restrooms: 'Full modern facilities', cell: 'Good (LTE)', effort: 'Walking across high suspension bridges (130m high) and gravel canyon loop',
    desc: 'Canada\'s highest suspension bridges spanning a 130-meter deep gorge with panoramic views of the Columbia Valley and Rocky/Purcell mountain ranges.',
    todo: 'Walk the two massive suspension bridges, view the canyon waterfall, and try the mountain coaster if booked.',
    reviews: '"Incredible adrenaline rush walking 426 feet above the canyon floor! Well-maintained adventure park." — Visitor Review',
    cut: 'Located in Golden, BC (80 km west of Lake Louise). Only do if adding a dedicated Golden day trip.',
    official: 'https://www.banffjaspercollection.com/attractions/golden-skybridge/', tag: 'Adventure • Suspension Bridge'
  }
};

const SPOT_ALIASES = {
  cochrane25: 'cochrane', cochrane26: 'cochrane', cochrane26_dep: 'yycstage', cochrane26_ret: 'cochrane',
  cochrane27: 'cochrane', cochrane29: 'calgaryhotel', cochrane30: 'calgaryhotel',
  castlejunction26_in: 'castlejunction', castlejunction26_out: 'castlejunction',
  hinton27: 'hinton', hinton28a: 'hinton', hinton28b: 'hinton', hinton29: 'hinton',
  beehive: 'beehive', fairview: 'fairview', takakkaw: 'takakkaw', morant: 'morant'
};

const GENERIC_INFO = {
  yycstage: {
    title: 'YYC / Ascent Rental Staging', photoQuery: 'Calgary International Airport YYC', time: 'Departure staging', rating: 'Operational',
    timingOptions: [{ label: 'Depart for Banff', min: 0 }],
    parking: 'Follow the locked Ascent rental handoff instructions around YYC; this is the post-pickup departure point, not a Cochrane hotel.',
    parkingRating: 'Rental handoff', bestWindow: 'Depart around 05:45 after the overnight arrival/pickup transition',
    restrooms: 'Use YYC facilities before the mountain drive if needed', cell: 'Excellent', effort: 'Operational',
    desc: 'The planner staging point after the locked overnight YYC arrival and Ascent rental pickup. It exists only to anchor the Sep 26 drive toward Banff.',
    todo: 'Confirm fuel, offline maps, park-pass receipt, layers and driver readiness before leaving Calgary.',
    reviews: 'Booking-confirmed operational stop; not a sightseeing location.',
    cut: 'Mandatory route origin.',
    official: 'https://www.yyc.com/', tag: 'Airport / Rental • Operational'
  },
  calgaryhotel: {
    title: 'Holiday Inn Calgary-Airport by IHG', photoQuery: 'Holiday Inn Calgary Airport Calgary Alberta', time: 'Overnight Base', rating: 'Locked booking',
    timingOptions: [{ label: 'Overnight rest / flight-day launch', min: 0 }],
    parking: 'Use the hotel parking/access instructions tied to the locked booking at 1250 McKinnon Dr NE, Calgary.',
    parkingRating: 'Hotel parking', bestWindow: 'Sep 29 check-in / Sep 30 departure',
    restrooms: 'Hotel room', cell: 'Excellent', effort: 'Lodging base',
    desc: 'Locked final-night airport-area hotel. This is not the Cochrane base and should not inherit Cochrane hotel information.',
    todo: 'Check in, sleep, then review rental-return and flight timing before Sep 30.',
    reviews: 'Booking-confirmed lodging stop.',
    cut: 'Locked overnight base.',
    official: 'https://www.ihg.com/', tag: 'Hotel Base • Calgary Airport'
  },
  castlejunction: {
    title: 'Castle Junction — Johnston Canyon vehicle access', photoQuery: 'Castle Junction Banff Alberta', time: 'Routing waypoint', rating: 'Operational',
    timingOptions: [{ label: 'Drive-through route waypoint', min: 0 }],
    parking: 'No sightseeing stop is required. This waypoint exists to force the legal Sep 26 vehicle approach/exit for Johnston Canyon.',
    parkingRating: 'Drive-through', bestWindow: 'Sep 26 route enforcement',
    restrooms: 'Do not plan facilities here; use Banff/Johnston facilities as needed.', cell: 'Variable', effort: 'Drive-through',
    desc: 'Parks Canada restricts personal vehicles on the east Bow Valley Parkway from Sep 1 to Oct 6, 2026. Johnston Canyon remains accessible by vehicle via Castle Junction, so the planner routes through this junction both before and after Johnston.',
    todo: 'Stay on Highway 1 to Castle Junction, then use the permitted west section of Bow Valley Parkway to Johnston Canyon. Return the same way.',
    reviews: 'Official 2026 access rule — this is a routing safeguard, not an attraction.',
    cut: 'Do not remove while the Sep 1–Oct 6 personal-vehicle restriction is active.',
    official: 'https://parks.canada.ca/pn-np/ab/banff/bulletins/b9725292-f2ba-41cc-91a5-7816df981ce3', tag: 'Road access • Mandatory waypoint'
  },
  cochrane: {
    title: 'Cochrane Hotel Base (Lodging)', photoQuery: 'Cochrane Alberta Rocky Mountains', time: 'Overnight Base', rating: '9.0/10',
    timingOptions: [{ label: 'Overnight Rest & Breakfast', min: 0 }],
    parking: 'Free hotel self-parking at Super 8 by Wyndham Cochrane.',
    parkingRating: 'Free & Easy', bestWindow: 'Evening check-in / Morning departure',
    restrooms: 'Hotel room', cell: 'Excellent (5G)', effort: 'Lodging base',
    desc: 'A scenic foothills town west of Calgary. Saves 50–70% on lodging with easy highway connections to Banff (45m) and Calgary Airport (35m).',
    todo: 'Check in, sleep comfortably, enjoy free breakfast, and top up gas before mountain drives.',
    reviews: '"Smartest lodging strategy for a budget-friendly Rockies trip. Big modern rooms, free breakfast, and fast highway access." — Trip Strategy',
    cut: 'Dedicated sleep base.',
    official: 'https://www.cochrane.ca/', tag: 'Hotel Base • Cochrane'
  },
  hinton: {
    title: 'Hinton Hotel Base (Lodging)', photoQuery: 'Hinton Alberta Rockies', time: 'Overnight Base', rating: '8.8/10',
    timingOptions: [{ label: 'Overnight Rest & Fuel', min: 0 }],
    parking: 'Free hotel self-parking at Hinton Lodge.',
    parkingRating: 'Free & Easy', bestWindow: 'Evening check-in / Early 06:30 AM departure',
    restrooms: 'Hotel room', cell: 'Excellent (5G)', effort: 'Lodging base',
    desc: 'The gateway town 65 km east of Jasper along Highway 16. Delivers huge savings on 2-queen rooms with full services (restaurants, supermarkets, gas).',
    todo: 'Rest up, fill fuel each morning, and leave early to beat morning crowds into Jasper National Park.',
    reviews: '"Clean, spacious rooms at half the price of Jasper accommodations. The 50-minute drive into Jasper is scenic along the Athabasca River." — Traveler Review',
    cut: 'Dedicated sleep base for Sep 27 & 28.',
    official: 'https://www.hinton.ca/', tag: 'Hotel Base • Hinton'
  },
  airportHotel: {
    title: 'Calgary Airport Hotel (Arrival Night)', photoQuery: 'Calgary airport hotel Alberta', time: 'Overnight Arrival Sleep', rating: '9.2/10',
    timingOptions: [{ label: 'Late Check-in & Rest', min: 0 }],
    parking: 'Free hotel self-parking (Holiday Inn / Sonesta / Comfort Inn).',
    parkingRating: 'Free & Easy', bestWindow: 'Night of Sep 25 arrival',
    restrooms: 'Hotel room', cell: 'Excellent (5G)', effort: 'Lodging base',
    desc: 'Practical, comfortable airport hotel with 2 Queen Beds and 24-hour check-in for late Toronto flight arrivals.',
    todo: 'Check in immediately after airport car pickup, get a solid night of rest, and depart refreshed at 07:30 AM toward Banff.',
    reviews: '"Perfect for late arrivals. Fast check-in, quiet rooms, and easy launch right onto Stoney Trail heading west." — Review',
    cut: 'Arrival night sleep.',
    official: 'https://www.google.com/travel/hotels', tag: 'Hotel Base • Calgary'
  }
};

const CATALOG = [
  { id: 'morant', name: 'Morant\'s Curve (Train Viewpoint)', lat: 51.3995, lng: -116.1287, stayMin: 15, priority: 'nice' },
  { id: 'takakkaw', name: 'Takakkaw Falls (Yoho)', lat: 51.4965, lng: -116.4828, stayMin: 40, priority: 'nice' },
  { id: 'fairview', name: 'Fairview Lookout (Lake Louise)', lat: 51.4135, lng: -116.2220, stayMin: 45, priority: 'nice' },
  { id: 'beehive', name: 'Big Beehive / Lake Agnes', lat: 51.4172, lng: -116.2485, stayMin: 180, priority: 'nice' },
  { id: 'hector', name: 'Hector Lake Viewpoint', lat: 51.5830, lng: -116.3550, stayMin: 10, priority: 'nice' },
  { id: 'bowglacierfalls', name: 'Bow Glacier Falls Hike', lat: 51.6480, lng: -116.5100, stayMin: 150, priority: 'cut' },
  { id: 'athabascapass', name: 'Athabasca Pass Lookout', lat: 52.6840, lng: -117.8820, stayMin: 12, priority: 'nice' },
  { id: 'goldenskybridge', name: 'Golden Skybridge (Golden, BC)', lat: 51.3250, lng: -116.9480, stayMin: 90, priority: 'cut' },
  { id: 'saskcrossing', name: 'Saskatchewan Crossing (fuel & rest)', lat: 51.9744, lng: -116.7456, stayMin: 15, priority: 'must' },
  { id: 'lakelouisevillage', name: 'Lake Louise Village (fuel)', lat: 51.4250, lng: -116.1770, stayMin: 15, priority: 'must' },
  { id: 'crowfoot', name: 'Crowfoot Glacier Viewpoint', lat: 51.6630, lng: -116.4810, stayMin: 12, priority: 'nice' },
  { id: 'herbert', name: 'Herbert Lake', lat: 51.4520, lng: -116.2150, stayMin: 12, priority: 'nice' },
  { id: 'vermilion', name: 'Vermilion Lakes', lat: 51.1810, lng: -115.5950, stayMin: 25, priority: 'nice' },
  { id: 'gondola', name: 'Banff Gondola — Sulphur Mountain', lat: 51.14821, lng: -115.55614, stayMin: 120, priority: 'must' },
  { id: 'hotspringsloc', name: 'Banff Upper Hot Springs', lat: 51.1683, lng: -115.5715, stayMin: 60, priority: 'cut' },
  { id: 'malignecanyon', name: 'Maligne Canyon', lat: 52.9203, lng: -118.0108, stayMin: 50, priority: 'nice' },
  { id: 'valley5', name: 'Valley of the Five Lakes', lat: 52.8450, lng: -118.0550, stayMin: 80, priority: 'nice' },
  { id: 'tangle', name: 'Tangle Falls', lat: 52.2820, lng: -117.2860, stayMin: 12, priority: 'nice' },
  { id: 'weeping', name: 'Weeping Wall', lat: 52.1480, lng: -116.9830, stayMin: 8, priority: 'cut' },
  { id: 'naturalbridge', name: 'Natural Bridge — Kicking Horse River', lat: 51.381632, lng: -116.530455, stayMin: 20, priority: 'nice' },
  { id: 'emerald', name: 'Emerald Lake', lat: 51.44321, lng: -116.53153, stayMin: 60, priority: 'nice' }
];

const GAS_STOPS = [
  { name: 'Cochrane', lat: 51.189, lng: -114.467, note: 'Fill before the Sep 27 northbound leg; Sep 26 ends here after Banff' },
  { name: 'Banff', lat: 51.1784, lng: -115.5708, note: 'Several stations in town' },
  { name: 'Lake Louise Village', lat: 51.425, lng: -116.177, note: 'Last reasonable fuel before the Parkway' },
  { name: 'Saskatchewan River Crossing', lat: 51.9744, lng: -116.7456, note: 'ONLY fuel on Icefields Parkway. Seasonal, expensive.' },
  { name: 'Jasper', lat: 52.8734, lng: -118.0814, note: 'Fill before every Parkway run' },
  { name: 'Hinton', lat: 53.399, lng: -117.586, note: 'Overnight base — fill each morning' },
  { name: 'YYC return', lat: 51.1315, lng: -114.0106, note: 'Fuel before handing the car back' }
];

const PACK_ITEMS = {
  Clothes: [
    { id: 'shell', t: 'Waterproof shell + insulating mid-layer', d: 'Glacier wind can feel near freezing even in sun.' },
    { id: 'hat', t: 'Warm hat and light gloves', d: 'Peyto, Bow Summit and glacier viewpoints.' },
    { id: 'shoes', t: 'Sturdy waterproof walking shoes', d: 'Catwalks, lakeshores and possible morning ice.' },
    { id: 'extra', t: 'One extra warm layer left in the car', d: 'Keep accessible in car trunk.' }
  ],
  Daypack: [
    { id: 'water', t: 'Three water bottles or a 2 L jug', d: 'Long gaps between services on the Parkway.' },
    { id: 'snacks', t: 'Car snacks for both Parkway days', d: 'Crossing food is limited and pricey.' },
    { id: 'sun', t: 'Sunglasses + SPF', d: 'High-altitude glacier glare in September.' },
    { id: 'power', t: 'Power bank + car charger', d: 'No cell, but camera and GPS still drain battery.' },
    { id: 'paper', t: 'Printed shuttle + hotel confirmations', d: 'No reliable signal at Park & Ride or Moraine.' },
    { id: 'first', t: 'Small first-aid and blister kit', d: 'Johnston and Maligne walks.' }
  ],
  Car: [
    { id: 'offline', t: 'Download offline maps: Banff–Jasper corridor', d: 'Icefields Parkway has essentially no cell service.' },
    { id: 'app511', t: '511 Alberta bookmark or app', d: 'Check before every Parkway drive.' },
    { id: 'pass', t: 'Print + display Parks Canada Family/Group pass receipt', d: 'Paid C$73.50 for 3 Family/Group day passes. PRINT the receipt and DISPLAY it on the left-hand side of the vehicle dashboard with the date visible. Check the printed dates cover any Sep 29 park time after 4:00 PM.' },
    { id: 'screen', t: 'Shuttle ticket screenshots on every phone', d: 'Show at the Lake Louise Park & Ride kiosk.' },
    { id: 'fuelplan', t: 'Full tank before every Parkway run', d: 'Only mid-route gas is Saskatchewan Crossing.' }
  ]
};

const BOOK_TASKS = [
  { id: 'shuttle-alarm', title: 'Set the Moraine/Louise shuttle alarm', due: '2026-09-25T08:00:00-06:00', detail: 'Sep 25 at 8:00 AM Mountain / 10:00 AM Toronto. Remaining Parks Canada seats drop 48 hours before departure. Book from Toronto before you fly. Choose Moraine Lake as first destination so you are guaranteed that lake.', link: 'https://reservation.pc.gc.ca/', bookId: 'shuttle' },
  { id: 'rental-info', title: 'Complete Ascent rental file', due: '2026-09-03T18:00:00-04:00', detail: 'Voucher requires driver licence, payment-card and flight-number details within 48 hours or the booking is not guaranteed. Call +1 604 416 4600 or email info@ascentcarrental.com.', link: 'mailto:info@ascentcarrental.com', bookId: 'rental' },
  { id: 'rental-drivers', title: 'Decide additional rental drivers', due: '2026-09-20T18:00:00-04:00', detail: 'Only the booked main driver is guaranteed. Additional drivers cost extra and all added drivers must be present with valid documents at pickup.', link: 'tel:+16044164600', bookId: 'rental' },
  { id: 'yyz-parking-pass', title: 'Save SpotHero pass + review parking instructions', due: '2026-09-24T20:00:00-04:00', detail: 'EZ Airport Parking — Uncovered Self Park is paid. Enter after Sep 25 at 8:00 PM and exit before Oct 1 at 8:00 PM. Review the facility/entry instructions before driving in and keep the pass available offline. Vehicle and plate details stay only in SpotHero.', link: 'https://spothero.com/', bookId: 'yyzParking' },
  { id: 'maligne', title: 'Decide Maligne Lake Cruise', due: '2026-09-14T18:00:00-04:00', detail: 'Default paid highlight (~$348, 2.5 h). If yes, book a morning/midday sailing and protect Maligne Road time.', link: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/' },
  { id: 'parkpass', title: 'Parks Canada Family/Group pass purchased', due: '2026-09-26T10:00:00-06:00', detail: 'Receipt confirms 3 × Family/Group Day Pass = C$73.50 paid on Sep 1. PRINT and DISPLAY the official receipt on the left-hand side of the vehicle dashboard with the date visible. Daily passes are valid until 4:00 PM the following day, so verify the printed dates still cover any Sep 29 park time after 4:00 PM.', link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes', bookId: 'park' }
];

const BASE = {
  settings: { title: 'Banff → Jasper Road Trip', travellers: 3, startDate: '2026-09-25', endDate: '2026-09-30', globalNote: 'Protect the major natural sights first; add paid attractions only when time and weather justify them.', lunchMin: 40, bufferMin: 8 },
  costs: { flight: 'booked-westjet', flightActual: 966.63, flightLocked: true, rental: 403.74, rentalPaid: 32.44, rentalDue: 371.30, rentalLocked: true, rentalDeposit: 1000, yyzParkingActual: 51.74, yyzParkingLocked: true, parkActual: 73.50, parkLocked: true, fuel: 280, food: 540, misc: 80, park: 73.50, shuttle: 41.75 },
  selectedDay: 'Sep 26', showAllDays: false, showFuel: false,
  checklists: {},
  days: [
    {
      date: 'Sep 25', label: 'Toronto → Calgary → Rental pickup • no hotel', start: '00:44', drive: 'Arrival logistics', sleep: 'No hotel — overnight transition',
      note: 'WestJet arrives YYC at 12:44 AM Sep 26 and Ascent pickup is 1:30 AM. No Sep 25 hotel by choice; keep the current south→north→south route.',
      hotel: null,
      stops: [
        { id: 'yyc25', name: 'YYC arrival 12:44 AM → Ascent rental pickup 1:30 AM', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 15, notBefore: '01:30' }
      ]
    },
    {
      date: 'Sep 26', label: 'YYC → Banff Highlights → Cochrane', start: '05:45', drive: 'Via Castle Junction • live road route', sleep: 'Super 8 by Wyndham Cochrane (BOOKED)',
      note: 'No arrival-night hotel. Leave the YYC area around 5:45 AM, keep the Banff-first route, and finish at the booked Super 8 Cochrane.',
      hotel: { name: 'Super 8 by Wyndham Cochrane', lat: 51.189327, lng: -114.488785 },
      stops: [
        { id: 'cochrane26_dep', name: 'YYC / Ascent rental — Depart 05:45 for Banff', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 0 },
        { id: 'minnewanka', name: 'Lake Minnewanka', lat: 51.2483, lng: -115.4979, priority: 'must', stayMin: 40 },
        { id: 'twojack', name: 'Two Jack Lake', lat: 51.2281, lng: -115.4926, priority: 'must', stayMin: 20 },
        { id: 'banff', name: 'Banff Town (Lunch & Walk)', lat: 51.1784, lng: -115.5708, priority: 'nice', stayMin: 60 },
        { id: 'bowfalls', name: 'Bow Falls', lat: 51.1683, lng: -115.5608, priority: 'nice', stayMin: 20 },
        { id: 'surprise', name: 'Surprise Corner Viewpoint', lat: 51.1663, lng: -115.5560, priority: 'nice', stayMin: 15 },
        { id: 'gondola', name: 'Banff Gondola — Sulphur Mountain (weather-gated MUST)', lat: 51.14821, lng: -115.55614, priority: 'must', stayMin: 120, note: 'Strong yes when summit visibility is good. Check forecast/webcam 24–48h before; skip only for poor cloud/visibility.' },
        { id: 'castlejunction26_in', name: 'Castle Junction — Johnston legal-access waypoint', lat: 51.26876, lng: -115.91833, priority: 'must', stayMin: 0, note: '2026 ROUTE: use Castle Junction to reach Johnston Canyon by personal vehicle during the Sep 1–Oct 6 east Bow Valley Parkway restriction.' },
        { id: 'johnston', name: 'Johnston Canyon', lat: 51.2450, lng: -115.8400, priority: 'must', stayMin: 90 },
        { id: 'castlejunction26_out', name: 'Castle Junction — return to Hwy 1', lat: 51.26876, lng: -115.91833, priority: 'must', stayMin: 0, note: 'Return via Castle Junction; do not continue east on the restricted Bow Valley Parkway.' },
        { id: 'cochrane26_ret', name: 'Super 8 by Wyndham Cochrane (Booked • Check-in)', lat: 51.189327, lng: -114.488785, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 27', label: 'Cochrane → Moraine/Louise → Icefields → Hinton', start: '06:00', drive: '~500 km', sleep: 'Hinton Lodge (Night 1 of 2 • BOOKED)',
      note: 'Hardest & most scenic day. Depart the booked Super 8 Cochrane, do Moraine + Louise and the Icefields Parkway northbound, then check into Hinton Lodge.',
      hotel: { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 },
      stops: [
        { id: 'cochrane27', name: 'Super 8 by Wyndham Cochrane (Depart 06:00)', lat: 51.189327, lng: -114.488785, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'parkride', name: 'Lake Louise Park & Ride (Shuttle Hub)', lat: 51.4403, lng: -116.1626, priority: 'must', stayMin: 30 },
        { id: 'moraine', name: 'Moraine Lake & Rockpile', lat: 51.3217, lng: -116.1860, priority: 'must', stayMin: 75 },
        { id: 'louise', name: 'Lake Louise Lakeshore', lat: 51.4167, lng: -116.2120, priority: 'must', stayMin: 60 },
        { id: 'bowlake', name: 'Bow Lake & Crowfoot Glacier', lat: 51.6827, lng: -116.4650, priority: 'must', stayMin: 25 },
        { id: 'peyto', name: 'Peyto Lake (Bow Summit Viewpoint)', lat: 51.7177, lng: -116.5060, priority: 'must', stayMin: 50 },
        { id: 'mistaya', name: 'Mistaya Canyon', lat: 51.9460, lng: -116.7200, priority: 'cut', stayMin: 35 },
        { id: 'saskcrossing', name: 'Saskatchewan Crossing (Fuel & Rest)', lat: 51.9744, lng: -116.7456, priority: 'must', stayMin: 15 },
        { id: 'icefield', name: 'Columbia Icefield (Athabasca Glacier)', lat: 52.2203, lng: -117.2249, priority: 'must', stayMin: 45 },
        { id: 'sunwapta', name: 'Sunwapta Falls', lat: 52.5324, lng: -117.6450, priority: 'must', stayMin: 35 },
        { id: 'athfalls', name: 'Athabasca Falls', lat: 52.6634, lng: -117.8830, priority: 'must', stayMin: 35 },
        { id: 'hinton27', name: 'Hinton Lodge (Booked • Check-in)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 28', label: 'Hinton → Jasper / Maligne Valley → Hinton', start: '07:00', drive: '~270 km', sleep: 'Hinton Lodge (Night 2 of 2 • BOOKED)',
      note: 'Jasper & Maligne core day. Start and finish at the same booked Hinton Lodge room.',
      hotel: { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 },
      stops: [
        { id: 'hinton28a', name: 'Hinton Lodge (Depart 07:00)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'pyramid', name: 'Pyramid Lake & Pyramid Island', lat: 52.9210, lng: -118.1040, priority: 'must', stayMin: 40 },
        { id: 'patricia', name: 'Patricia Lake', lat: 52.9120, lng: -118.0950, priority: 'cut', stayMin: 20 },
        { id: 'jasper', name: 'Jasper Town (Lunch, Fuel & Bakery)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 60 },
        { id: 'medicine', name: 'Medicine Lake Viewpoint', lat: 52.8640, lng: -117.8000, priority: 'must', stayMin: 25 },
        { id: 'maligne', name: 'Maligne Lake & Spirit Island Cruise', lat: 52.7300, lng: -117.6420, priority: 'must', stayMin: 135 },
        { id: 'annette', name: 'Lake Annette & Lake Edith', lat: 52.8840, lng: -118.0450, priority: 'cut', stayMin: 30 },
        { id: 'hinton28b', name: 'Hinton Lodge (Return & Sleep)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 29', label: 'Hinton → Southbound Parkway → Calgary Airport Hotel', start: '06:30', drive: '~540 km', sleep: 'Holiday Inn Calgary-Airport by IHG (BOOKED)',
      note: 'Southbound Icefields Parkway run. Continue to the booked Holiday Inn Calgary-Airport after the final scenic / Yoho choice.',
      hotel: { name: 'Holiday Inn Calgary-Airport by IHG', lat: 51.06593, lng: -114.01186 },
      stops: [
        { id: 'hinton29', name: 'Hinton Lodge (Depart 06:30)', lat: 53.38816, lng: -117.61821, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'jasper29', name: 'Jasper (Southbound Fuel & Snacks)', lat: 52.8734, lng: -118.0814, priority: 'nice', stayMin: 25 },
        { id: 'valley5', name: 'Valley of the Five Lakes', lat: 52.8450, lng: -118.0550, priority: 'nice', stayMin: 80 },
        { id: 'stutfield', name: 'Stutfield Glacier Viewpoint', lat: 52.2620, lng: -117.2860, priority: 'nice', stayMin: 15 },
        { id: 'icefield29', name: 'Columbia Icefield (Second Chance / Adventure)', lat: 52.2203, lng: -117.2249, priority: 'must', stayMin: 60 },
        { id: 'waterfowl', name: 'Waterfowl Lakes', lat: 51.8450, lng: -116.6390, priority: 'nice', stayMin: 15 },
        { id: 'bowlake29', name: 'Bow Lake (Southbound viewpoint)', lat: 51.6827, lng: -116.4650, priority: 'nice', stayMin: 20 },
        { id: 'naturalbridge', name: 'Natural Bridge — Kicking Horse River (Yoho Option)', lat: 51.381632, lng: -116.530455, priority: 'nice', stayMin: 20, choiceGroup: 'sep29bonus', enabled: false },
        { id: 'emerald', name: 'Emerald Lake (Yoho Option)', lat: 51.44321, lng: -116.53153, priority: 'nice', stayMin: 60, choiceGroup: 'sep29bonus', enabled: false },
        { id: 'cochrane29', name: 'Holiday Inn Calgary-Airport by IHG (Booked • Check-in)', lat: 51.06593, lng: -114.01186, priority: 'must', stayMin: 0, isHotel: true }
      ]
    },
    {
      date: 'Sep 30', label: 'Calgary Airport Hotel → Calgary Optional → YYC → Toronto', start: '10:00', drive: '~30 km', sleep: 'Home',
      note: 'Wake up already in Calgary. Keep the 4:45 PM rental-return target for the 7:10 PM WestJet departure.',
      hotel: null,
      stops: [
        { id: 'cochrane30', name: 'Holiday Inn Calgary-Airport by IHG (Depart 10:00)', lat: 51.06593, lng: -114.01186, priority: 'must', stayMin: 0, isHotel: true },
        { id: 'canmore', name: 'Calgary Downtown / Prince\'s Island (Only if time)', lat: 51.0550, lng: -114.0700, priority: 'nice', stayMin: 90, enabled: false },
        { id: 'yyc30', name: 'YYC — Rental Return 4:45 PM + WestJet 7:10 PM', lat: 51.1315, lng: -114.0106, priority: 'must', stayMin: 145, notBefore: '16:45' }
      ]
    }
  ],
  hotels: {
    'Sep 25': { choice: 0, price: 0, locked: true, noHotel: true, priceLabel: 'No hotel', options: [['No hotel — intentional', 'Arrival after midnight • rental pickup 1:30 AM', 'Keep current route; use the pre-dawn window for positioning rather than a hotel night', '']] },
    'Sep 26': { choice: 0, price: 301.28, locked: true, paid: 301.28, priceLabel: 'Booked total • paid', options: [['Super 8 by Wyndham Cochrane', '1 room • 3 adults • 2 Queen Beds', 'Sep 26 → Sep 27 • non-refundable • C$301.28 paid • C$100 property deposit', 'https://www.wyndhamhotels.com/en-ca/super-8/cochrane-alberta/super-8-hotel-and-suites-cochrane/overview']] },
    'Sep 27': { choice: 0, price: 429.07, locked: true, groupTotal: true, priceLabel: '2-night booking total • due at property', options: [['Hinton Lodge', '1 room • 3 adults • Standard Room • 2 Queen Beds • Non Smoking', 'Sep 27 → Sep 29 • 2 nights • C$429.07 due at property • free cancellation until Sep 26 6:00 PM local', 'https://hintonlodge.ca/']] },
    'Sep 28': { choice: 0, price: 0, locked: true, includedWith: 'Sep 27', priceLabel: 'Included in Sep 27–29 booking', options: [['Hinton Lodge — same room', 'Night 2 of the same 2-night booking', 'Already included in the C$429.07 Sep 27–29 reservation', 'https://hintonlodge.ca/']] },
    'Sep 29': { choice: 0, price: 171.42, locked: true, paid: 171.42, priceLabel: 'Booked total • paid', options: [['Holiday Inn Calgary-Airport by IHG', '1 room • 3 adults • Standard Room • 2 Queen Beds (Low Floor)', 'Sep 29 → Sep 30 • C$171.42 paid • free cancellation until Sep 22 6:00 PM local • C$50 stay deposit + C$50/night breakage deposit', 'https://www.ihg.com/holidayinn/hotels/us/en/calgary/yycat/hoteldetail']] }
  },
  attractions: [
    { id: 'maligneCruise', name: 'Maligne Lake Cruise / Spirit Island', day: 'Sep 28', cost: 348, time: 2.5, type: 'paid', rating: '9/10', rec: 'RECOMMENDED #1', selected: true, desc: 'Most unique paid experience on the route.', skip: 'Maligne Lake shoreline is still free.', link: 'https://www.banffjaspercollection.com/attractions/maligne-lake-cruise/' },
    { id: 'banffGondola', name: 'Banff Gondola', day: 'Sep 26', cost: 315, time: 2, type: 'paid', rating: '9/10', rec: 'MUST — IF VISIBILITY IS GOOD', selected: true, desc: 'Strong yes in clear weather: Sulphur Mountain summit + boardwalk. Keep the budget reserved until the 24–48h weather check.', skip: 'Skip only if cloud/fog ruins summit visibility.', link: 'https://www.banffjaspercollection.com/attractions/banff-gondola/' },
    { id: 'icefieldAdventure', name: 'Columbia Icefield Adventure + Skywalk', day: 'Sep 29', cost: 378, time: 2, type: 'paid', rating: '8/10', rec: 'TIME PICK #3', selected: false, desc: 'Ice Explorer onto glacier + Skywalk.', skip: 'Glacier and Icefield viewpoints remain free beyond park entry.', link: 'https://www.banffjaspercollection.com/attractions/columbia-icefield/' },
    { id: 'hotSprings', name: 'Banff Upper Hot Springs', day: 'Sep 26', cost: 59.25, time: 1.5, type: 'paid', rating: '7/10', rec: 'OPTIONAL', selected: false, desc: 'Cheap relaxation at end of day.', skip: 'No scenery lost.', link: 'https://hotsprings.ca/banff/' },
    { id: 'jasperSkytram', name: 'Jasper SkyTram', day: 'Sep 28', cost: 243, time: 2, type: 'paid', rating: '7/10', rec: 'ALTERNATIVE', selected: false, desc: 'Alpine tram views above Jasper.', skip: 'Parkway already provides extensive mountain views.', link: 'https://www.jasperskytram.com/' },
    { id: 'minnewankaCruise', name: 'Lake Minnewanka Cruise', day: 'Sep 26', cost: 234.68, time: 1.5, type: 'paid', rating: '5/10', rec: 'SKIP', selected: false, desc: 'Narrated cruise.', skip: 'Lake shoreline visit remains free.', link: 'https://www.banffjaspercollection.com/attractions/lake-minnewanka-cruise/' },
    { id: 'openTop', name: 'Open Top Touring', day: 'Sep 26', cost: 186, time: 1.5, type: 'paid', rating: '3/10', rec: 'SKIP', selected: false, desc: 'Guided Banff sightseeing.', skip: 'Our self-drive duplicates most value.', link: 'https://www.banffjaspercollection.com/attractions/open-top-touring/' },
    { id: 'skybridge', name: 'Golden Skybridge', day: 'Sep 29', cost: 140.97, time: 2, type: 'paid', rating: '3/10', rec: 'SKIP', selected: false, desc: 'Suspension bridges in Golden.', skip: 'No Banff/Jasper natural sight is lost.', link: 'https://www.banffjaspercollection.com/attractions/golden-skybridge/' },
    { id: 'lakeLouise', name: 'Lake Louise', day: 'Sep 27', cost: 0, time: 1, type: 'free', rating: '10/10', rec: 'MUST DO', selected: true, desc: 'Core trip highlight.', skip: 'Major loss.', link: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise' },
    { id: 'moraineLake', name: 'Moraine Lake', day: 'Sep 27', cost: 0, time: 1, type: 'free', rating: '10/10', rec: 'MUST DO', selected: true, desc: 'Core trip highlight; shuttle required.', skip: 'Major loss.', link: 'https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise' },
    { id: 'peytoLake', name: 'Peyto Lake', day: 'Sep 27', cost: 0, time: 1, type: 'free', rating: '10/10', rec: 'MUST DO', selected: true, desc: 'One of the best viewpoints on the trip.', skip: 'Major loss.', link: 'https://www.google.com/maps/search/Peyto+Lake' },
    { id: 'athabascaFalls', name: 'Athabasca Falls', day: 'Sep 27', cost: 0, time: .6, type: 'free', rating: '10/10', rec: 'MUST DO', selected: true, desc: 'Essential Jasper waterfall.', skip: 'Major loss.', link: 'https://www.google.com/maps/search/Athabasca+Falls' },
    { id: 'johnstonCanyon', name: 'Johnston Canyon', day: 'Sep 26', cost: 0, time: 1.75, type: 'free', rating: '9/10', rec: 'DO', selected: true, desc: 'Canyon catwalks and waterfalls.', skip: 'Lose one of Banff’s best easy walks.', link: 'https://parks.canada.ca/pn-np/ab/banff/activ/randonnee-hiking/johnston' },
    { id: 'maligneShore', name: 'Maligne Lake Shoreline', day: 'Sep 28', cost: 0, time: 1, type: 'free', rating: '10/10', rec: 'MUST DO', selected: true, desc: 'Excellent even without the cruise.', skip: 'Major loss.', link: 'https://www.google.com/maps/search/Maligne+Lake' },
    { id: 'maligneCanyonFree', name: 'Maligne Canyon', day: 'Sep 28', cost: 0, time: 1, type: 'free', rating: '8/10', rec: 'OPTIONAL', selected: false, desc: 'Slot canyon near Jasper.', skip: 'No core lake lost.', link: 'https://www.google.com/maps/search/Maligne+Canyon' }
  ],
  bookings: [
    { id: 'outbound', p: 1, item: 'WestJet • YYZ 10:25 PM → YYC 12:44 AM +1 • Fri Sep 25', estimate: 0, status: 'Paid', actual: '', confirm: '', locked: true, bookingGroup: 'westjet-flights', detail: 'Nonstop • 4h 19m • arrives Sat Sep 26', link: 'https://www.westjet.com/' },
    { id: 'return', p: 2, item: 'WestJet • YYC 7:10 PM → YYZ 1:05 AM +1 • Wed Sep 30', estimate: 0, status: 'Paid', actual: '', confirm: '', locked: true, bookingGroup: 'westjet-flights', detail: 'Nonstop • 3h 55m • arrives Thu Oct 1', link: 'https://www.westjet.com/' },
    { id: 'rental', p: 3, item: 'Ascent Car Rental • Kia K4 or similar • Sep 26 1:30 AM → Sep 30 6:00 PM', estimate: 403.74, status: 'Booked', actual: 32.44, confirm: 'Stored in voucher', locked: true, bookingGroup: 'ascent-rental', detail: 'Confirmed total C$403.74 • C$32.44 paid • C$371.30 due at pickup • C$1,000 refundable deposit • unlimited mileage • full-to-full', link: 'tel:+16044164600' },
    { id: 'yyzParking', p: 4, item: 'SpotHero • EZ Airport Parking — Uncovered Self Park • Sep 25 8:00 PM → Oct 1 8:00 PM', estimate: 51.74, status: 'Paid', actual: 51.74, confirm: 'Stored in SpotHero pass', locked: true, bookingGroup: 'spothero-parking', detail: 'YYZ airport parking • enter after Fri Sep 25 8:00 PM • exit before Thu Oct 1 8:00 PM • review facility instructions before entering', link: 'https://spothero.com/' },
    { id: 'h25', p: 5, item: 'Sep 25 overnight — NO HOTEL (intentional)', estimate: 0, status: 'Done', actual: '', confirm: 'No hotel planned', locked: true, bookingGroup: 'no-hotel', detail: 'Booked flight arrives 12:44 AM Sep 26; Ascent rental pickup is 1:30 AM. Current route is retained without a Sep 25 hotel night.', link: '' },
    { id: 'h26', p: 6, item: 'Super 8 by Wyndham Cochrane • Sep 26 → Sep 27 • 2 Queen Beds', estimate: 301.28, status: 'Paid', actual: 301.28, confirm: 'Stored in Hotels.com email', locked: true, bookingGroup: 'hotel-super8-cochrane', detail: '1 room • 3 adults • C$301.28 paid • non-refundable • C$100 deposit at property • check-out 11:00 AM', link: 'https://www.wyndhamhotels.com/en-ca/super-8/cochrane-alberta/super-8-hotel-and-suites-cochrane/overview' },
    { id: 'h27', p: 7, item: 'Hinton Lodge • Sep 27 → Sep 29 • 2 nights • 2 Queen Beds', estimate: 429.07, status: 'Booked', actual: '', confirm: 'Stored in Hotels.com email', locked: true, bookingGroup: 'hotel-hinton-lodge', detail: '1 room • 3 adults • Standard Room • Non Smoking • C$429.07 due at property • free cancellation until Sep 26 6:00 PM local', link: 'https://hintonlodge.ca/' },
    { id: 'h28', p: 8, item: 'Hinton Lodge • Sep 28 night (included in Sep 27–29 booking)', estimate: 0, status: 'Booked', actual: '', confirm: 'Same reservation as Sep 27', locked: true, bookingGroup: 'hotel-hinton-lodge', detail: 'Night 2 of the same room • included in C$429.07 two-night total', link: 'https://hintonlodge.ca/' },
    { id: 'h29', p: 9, item: 'Holiday Inn Calgary-Airport by IHG • Sep 29 → Sep 30 • 2 Queen Beds', estimate: 171.42, status: 'Paid', actual: 171.42, confirm: 'Stored in Hotels.com email', locked: true, bookingGroup: 'hotel-holidayinn-yyc', detail: '1 room • 3 adults • Standard Room (Low Floor) • C$171.42 paid • free cancellation until Sep 22 6:00 PM local • check-out 11:00 AM', link: 'https://www.ihg.com/holidayinn/hotels/us/en/calgary/yycat/hoteldetail' },
    { id: 'park', p: 9, item: 'Parks Canada • Family/Group Day Pass • 3 days', estimate: 73.50, status: 'Paid', actual: 73.50, confirm: 'Receipt stored in email', locked: true, bookingGroup: 'parks-canada-pass', detail: '3 × Family/Group Day Pass • C$73.50 paid Sep 1 • PRINT + DISPLAY receipt on left-hand side of vehicle dashboard with date visible • verify printed dates cover any Sep 29 park time after 4:00 PM', link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes' },
    { id: 'shuttle', p: 10, item: 'Lake Louise + Moraine shuttle (book Sep 25 8:00 AM MDT)', estimate: 41.75, status: 'Waiting window', actual: '', confirm: '', link: 'https://reservation.pc.gc.ca/' }
  ]
};

let overviewDay = 'Sep 26', modalSpotId = null, modalMiniMap = null, photoCache = {}, legCache = {};
let pendingLatLng = null, placeTimer = null, weatherCache = null, filter = 'all';
let map, markerLayer, routeLayer, hotelLayer, allDayLayer, fuelLayer;
let dragSource = null, undoStack = [], lastSnap = null, S;

function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
function mergeBase(base, user) {
  for (const k in user) {
    if (user[k] && typeof user[k] === 'object' && !Array.isArray(user[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = mergeBase(base[k], user[k]);
    else base[k] = user[k];
  }
  return base;
}
function loadState() {
  try {
    const v6 = localStorage.getItem(STORE_V6);
    if (v6) return mergeBase(deepClone(BASE), JSON.parse(v6));
    const v5 = localStorage.getItem(STORE_V5);
    const v4 = localStorage.getItem(STORE_V4);
    const v3 = localStorage.getItem(STORE_V3);
    const raw = v5 || v4 || v3;
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = deepClone(BASE);
      if (parsed.bookings) {
        parsed.bookings.forEach(pb => {
          const b = state.bookings.find(x => x.id === pb.id);
          if (b) { b.status = pb.status; b.actual = pb.actual; b.confirm = pb.confirm; }
        });
      }
      if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
      if (parsed.costs) state.costs = { ...state.costs, ...parsed.costs };
      if (parsed.checklists) state.checklists = parsed.checklists;
      return state;
    }
    return deepClone(BASE);
  } catch (e) { return deepClone(BASE); }
}
function persist() {
  lastSnap = JSON.stringify(S);
  localStorage.setItem(STORE_V6, lastSnap);
}
function save() {
  if (lastSnap) {
    undoStack.push(lastSnap);
    if (undoStack.length > 40) undoStack.shift();
  }
  persist();
  renderAll();
}
function undoLast() {
  if (!undoStack.length) { toast('Nothing to undo'); return; }
  S = JSON.parse(undoStack.pop());
  persist();
  renderAll();
  toast('Undid last change');
}

S = loadState();
if (!S.checklists) S.checklists = {};
if (S.costs.food == null) S.costs.food = BASE.costs.food;
if (S.settings.lunchMin == null) S.settings.lunchMin = 40;
if (S.settings.bufferMin == null) S.settings.bufferMin = 8;

function applyLockedWestJetFlights(state) {
  if (!state) return;
  state.costs = state.costs || {};
  state.costs.flight = 'booked-westjet';
  state.costs.flightActual = 966.63;
  state.costs.flightLocked = true;

  const facts = {
    outbound: {
      p: 1,
      item: 'WestJet • YYZ 10:25 PM → YYC 12:44 AM +1 • Fri Sep 25',
      detail: 'Nonstop • 4h 19m • arrives Sat Sep 26',
      link: 'https://www.westjet.com/'
    },
    return: {
      p: 2,
      item: 'WestJet • YYC 7:10 PM → YYZ 1:05 AM +1 • Wed Sep 30',
      detail: 'Nonstop • 3h 55m • arrives Thu Oct 1',
      link: 'https://www.westjet.com/'
    }
  };

  Object.entries(facts).forEach(([id, fact]) => {
    let b = (state.bookings || []).find(x => x.id === id);
    if (!b) {
      b = { id, estimate: 0, actual: '', confirm: '' };
      state.bookings = state.bookings || [];
      state.bookings.push(b);
    }
    Object.assign(b, fact, {
      status: 'Paid',
      estimate: 0,
      locked: true,
      bookingGroup: 'westjet-flights'
    });
  });

  // Keep the route clock synchronized with the booked flight times.
  const d25 = (state.days || []).find(d => d.date === 'Sep 25');
  if (d25) {
    d25.label = 'Toronto → Calgary → Rental pickup • no hotel';
    d25.start = '00:44';
    d25.note = 'Booked WestJet arrives YYC at 12:44 AM on Sat Sep 26. No arrival-night hotel is planned; Ascent rental pickup is the next locked step.';
    const yyc = d25.stops && d25.stops.find(s => s.id === 'yyc25');
    if (yyc) {
      yyc.name = 'Calgary International Airport — WestJet arrival 12:44 AM';
      yyc.stayMin = 60;
    }
  }

  const d26 = (state.days || []).find(d => d.date === 'Sep 26');
  if (d26) {
    d26.start = '05:45';
    d26.note = 'No Sep 25 hotel. Use the pre-dawn YYC window as buffer/rest time, then keep the Banff-first sightseeing order and finish at the booked Sep 26 Cochrane hotel.';
    const dep = d26.stops && d26.stops.find(s => s.id === 'cochrane26_dep');
    if (dep) {
      dep.name = 'YYC / Ascent rental — Depart 05:45 for Banff';
      dep.lat = 51.1315; dep.lng = -114.0106; dep.isHotel = false;
    }
  }

  const d30 = (state.days || []).find(d => d.date === 'Sep 30');
  if (d30) {
    d30.label = 'Calgary Airport Hotel → Calgary Optional → YYC → Toronto';
    d30.note = 'Booked WestJet departs YYC at 7:10 PM. The final hotel is already in Calgary; target rental return at about 4:45 PM, then keep the airport/terminal block through departure. Toronto arrival is 1:05 AM on Oct 1.';
    const yyc = d30.stops && d30.stops.find(s => s.id === 'yyc30');
    if (yyc) {
      yyc.name = 'YYC — Rental Return 4:45 PM + WestJet 7:10 PM';
      yyc.notBefore = '16:45';
      yyc.stayMin = 145;
    }
  }
}

applyLockedWestJetFlights(S);

function applyLockedAscentRental(state) {
  if (!state) return;
  state.costs = state.costs || {};
  state.costs.rental = 403.74;
  state.costs.rentalPaid = 32.44;
  state.costs.rentalDue = 371.30;
  state.costs.rentalLocked = true;
  state.costs.rentalDeposit = 1000;

  state.bookings = state.bookings || [];
  let b = state.bookings.find(x => x.id === 'rental');
  if (!b) {
    b = { id: 'rental', p: 3, actual: '' };
    state.bookings.push(b);
  }
  Object.assign(b, {
    item: 'Ascent Car Rental • Kia K4 or similar • Sep 26 1:30 AM → Sep 30 6:00 PM',
    estimate: 403.74,
    status: 'Booked',
    actual: 32.44,
    confirm: 'Stored in voucher',
    locked: true,
    bookingGroup: 'ascent-rental',
    detail: 'Confirmed total C$403.74 • C$32.44 paid • C$371.30 due at pickup • C$1,000 refundable deposit • unlimited mileage • full-to-full',
    link: 'tel:+16044164600'
  });

  const d25 = (state.days || []).find(d => d.date === 'Sep 25');
  if (d25) {
    d25.note = 'WestJet arrives YYC at 12:44 AM Sep 26. Ascent rental pickup is booked for 1:30 AM at the YYC Economy Parking Lot (outside terminal). Pickup must be completed by 2:28 AM unless Ascent agrees to hold it longer. No Sep 25 hotel is planned; the early-morning gap is intentionally kept as a YYC-area buffer/rest window.';
    const yyc = d25.stops && d25.stops.find(s => s.id === 'yyc25');
    if (yyc) {
      yyc.name = 'YYC arrival 12:44 AM → Ascent rental pickup 1:30 AM';
      yyc.notBefore = '01:30';
      yyc.stayMin = 15;
      yyc.note = 'Outside-terminal pickup at YYC Economy Parking Lot. Supplier is listed 24/7. Contact Ascent if delayed; voucher says pickup deadline is 2:28 AM.';
    }
  }

  const d30 = (state.days || []).find(d => d.date === 'Sep 30');
  if (d30) {
    d30.note = 'Ascent booking lists a 6:00 PM drop-off, but the WestJet flight leaves at 7:10 PM. Keep the operational target at 4:45 PM and confirm early-return/drop-off instructions with Ascent at pickup.';
    const yyc = d30.stops && d30.stops.find(s => s.id === 'yyc30');
    if (yyc) {
      yyc.name = 'Ascent rental return target 4:45 PM → WestJet 7:10 PM';
      yyc.notBefore = '16:45';
      yyc.stayMin = 145;
      yyc.note = 'Voucher scheduled drop-off is 6:00 PM. Planner intentionally targets 4:45 PM for airport buffer; confirm early-return procedure at pickup.';
    }
  }
}

function applyLockedSpotHeroParking(state) {
  if (!state) return;
  state.costs = state.costs || {};
  state.costs.yyzParkingActual = 51.74;
  state.costs.yyzParkingLocked = true;

  state.bookings = state.bookings || [];
  let b = state.bookings.find(x => x.id === 'yyzParking');
  if (!b) {
    b = { id: 'yyzParking' };
    const rentalIndex = state.bookings.findIndex(x => x.id === 'rental');
    state.bookings.splice(rentalIndex >= 0 ? rentalIndex + 1 : state.bookings.length, 0, b);
  }
  Object.assign(b, {
    item: 'SpotHero • EZ Airport Parking — Uncovered Self Park • Sep 25 8:00 PM → Oct 1 8:00 PM',
    estimate: 51.74,
    status: 'Paid',
    actual: 51.74,
    confirm: 'Stored in SpotHero pass',
    locked: true,
    bookingGroup: 'spothero-parking',
    detail: 'YYZ airport parking • enter after Fri Sep 25 8:00 PM • exit before Thu Oct 1 8:00 PM • review facility instructions before entering',
    link: 'https://spothero.com/'
  });

  // Keep the visible booking sequence stable for existing browser saves that
  // predate this newly inserted authoritative booking.
  state.bookings.forEach((booking, index) => { booking.p = index + 1; });
}

applyLockedAscentRental(S);
applyLockedSpotHeroParking(S);

function applyLockedHotelBookings(state) {
  if (!state) return;
  state.hotels = state.hotels || {};
  state.bookings = state.bookings || [];

  state.hotels['Sep 25'] = {
    choice: 0, price: 0, locked: true, noHotel: true, priceLabel: 'No hotel',
    options: [['No hotel — intentional', 'Arrival after midnight • rental pickup 1:30 AM', 'Keep current route; use the pre-dawn window for positioning rather than a hotel night', '']]
  };
  state.hotels['Sep 26'] = {
    choice: 0, price: 301.28, locked: true, paid: 301.28, priceLabel: 'Booked total • paid',
    options: [['Super 8 by Wyndham Cochrane', '1 room • 3 adults • 2 Queen Beds', 'Sep 26 → Sep 27 • non-refundable • C$301.28 paid • C$100 property deposit', 'https://www.wyndhamhotels.com/en-ca/super-8/cochrane-alberta/super-8-hotel-and-suites-cochrane/overview']]
  };
  state.hotels['Sep 27'] = {
    choice: 0, price: 429.07, locked: true, groupTotal: true, priceLabel: '2-night booking total • due at property',
    options: [['Hinton Lodge', '1 room • 3 adults • Standard Room • 2 Queen Beds • Non Smoking', 'Sep 27 → Sep 29 • 2 nights • C$429.07 due at property • free cancellation until Sep 26 6:00 PM local', 'https://hintonlodge.ca/']]
  };
  state.hotels['Sep 28'] = {
    choice: 0, price: 0, locked: true, includedWith: 'Sep 27', priceLabel: 'Included in Sep 27–29 booking',
    options: [['Hinton Lodge — same room', 'Night 2 of the same 2-night booking', 'Already included in the C$429.07 Sep 27–29 reservation', 'https://hintonlodge.ca/']]
  };
  state.hotels['Sep 29'] = {
    choice: 0, price: 171.42, locked: true, paid: 171.42, priceLabel: 'Booked total • paid',
    options: [['Holiday Inn Calgary-Airport by IHG', '1 room • 3 adults • Standard Room • 2 Queen Beds (Low Floor)', 'Sep 29 → Sep 30 • C$171.42 paid • free cancellation until Sep 22 6:00 PM local • C$50 stay deposit + C$50/night breakage deposit', 'https://www.ihg.com/holidayinn/hotels/us/en/calgary/yycat/hoteldetail']]
  };

  const facts = {
    h25: {
      item: 'Sep 25 overnight — NO HOTEL (intentional)', estimate: 0, status: 'Done', actual: '',
      confirm: 'No hotel planned', bookingGroup: 'no-hotel',
      detail: 'Booked flight arrives 12:44 AM Sep 26; Ascent rental pickup is 1:30 AM. Current route is retained without a Sep 25 hotel night.', link: ''
    },
    h26: {
      item: 'Super 8 by Wyndham Cochrane • Sep 26 → Sep 27 • 2 Queen Beds', estimate: 301.28, status: 'Paid', actual: 301.28,
      confirm: 'Stored in Hotels.com email', bookingGroup: 'hotel-super8-cochrane',
      detail: '1 room • 3 adults • C$301.28 paid • non-refundable • C$100 deposit at property • check-out 11:00 AM',
      link: 'https://www.wyndhamhotels.com/en-ca/super-8/cochrane-alberta/super-8-hotel-and-suites-cochrane/overview'
    },
    h27: {
      item: 'Hinton Lodge • Sep 27 → Sep 29 • 2 nights • 2 Queen Beds', estimate: 429.07, status: 'Booked', actual: '',
      confirm: 'Stored in Hotels.com email', bookingGroup: 'hotel-hinton-lodge',
      detail: '1 room • 3 adults • Standard Room • Non Smoking • C$429.07 due at property • free cancellation until Sep 26 6:00 PM local',
      link: 'https://hintonlodge.ca/'
    },
    h28: {
      item: 'Hinton Lodge • Sep 28 night (included in Sep 27–29 booking)', estimate: 0, status: 'Booked', actual: '',
      confirm: 'Same reservation as Sep 27', bookingGroup: 'hotel-hinton-lodge',
      detail: 'Night 2 of the same room • included in C$429.07 two-night total',
      link: 'https://hintonlodge.ca/'
    },
    h29: {
      item: 'Holiday Inn Calgary-Airport by IHG • Sep 29 → Sep 30 • 2 Queen Beds', estimate: 171.42, status: 'Paid', actual: 171.42,
      confirm: 'Stored in Hotels.com email', bookingGroup: 'hotel-holidayinn-yyc',
      detail: '1 room • 3 adults • Standard Room (Low Floor) • C$171.42 paid • free cancellation until Sep 22 6:00 PM local • check-out 11:00 AM',
      link: 'https://www.ihg.com/holidayinn/hotels/us/en/calgary/yycat/hoteldetail'
    }
  };

  Object.entries(facts).forEach(([id, fact]) => {
    let b = state.bookings.find(x => x.id === id);
    if (!b) {
      b = { id };
      state.bookings.push(b);
    }
    Object.assign(b, fact, { locked: true });
  });

  // Current route stays south → north → south. Only the arrival-night logistics change.
  const d25 = (state.days || []).find(d => d.date === 'Sep 25');
  if (d25) {
    d25.label = 'Toronto → Calgary → Rental pickup • no hotel';
    d25.sleep = 'No hotel — overnight transition';
    d25.hotel = null;
    d25.note = 'WestJet arrives YYC at 12:44 AM Sep 26 and Ascent pickup is 1:30 AM. No Sep 25 hotel by choice. Keep the current south→north→south trip; use the pre-dawn window for positioning before the Banff day.';
    d25.stops = (d25.stops || []).filter(s => s.id !== 'cochrane25');
  }

  const d26 = (state.days || []).find(d => d.date === 'Sep 26');
  if (d26) {
    d26.label = 'YYC → Banff First-Timer Highlights → Cochrane';
    d26.start = '05:45';
    d26.sleep = 'Super 8 by Wyndham Cochrane (BOOKED)';
    d26.hotel = { name: 'Super 8 by Wyndham Cochrane', lat: 51.189327, lng: -114.488785 };
    d26.note = 'No arrival-night hotel. Keep the original Banff-first route: leave the YYC area around 5:45 AM, reach the Banff/Minnewanka area around sunrise, keep Minnewanka + Two Jack + Johnston Upper Falls as the core, then finish at the booked Super 8 Cochrane.';
    const dep = (d26.stops || []).find(s => s.id === 'cochrane26_dep');
    if (dep) {
      dep.name = 'YYC / Ascent rental — Depart 05:45 for Banff';
      dep.lat = 51.1315; dep.lng = -114.0106; dep.isHotel = false;
    }
    const ret = (d26.stops || []).find(s => s.id === 'cochrane26_ret');
    if (ret) {
      ret.name = 'Super 8 by Wyndham Cochrane (Booked • Check-in)';
      ret.lat = 51.189327; ret.lng = -114.488785; ret.isHotel = true;
    }
  }

  const d27 = (state.days || []).find(d => d.date === 'Sep 27');
  if (d27) {
    const dep = (d27.stops || []).find(s => s.id === 'cochrane27');
    if (dep) { dep.name = 'Super 8 by Wyndham Cochrane (Depart 06:00)'; dep.lat = 51.189327; dep.lng = -114.488785; }
    d27.sleep = 'Hinton Lodge (Night 1 of 2 • BOOKED)';
    d27.hotel = { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 };
    const end = (d27.stops || []).find(s => s.id === 'hinton27');
    if (end) { end.name = 'Hinton Lodge (Booked • Check-in)'; end.lat = 53.38816; end.lng = -117.61821; end.isHotel = true; }
  }

  const d28 = (state.days || []).find(d => d.date === 'Sep 28');
  if (d28) {
    d28.sleep = 'Hinton Lodge (Night 2 of 2 • BOOKED)';
    d28.hotel = { name: 'Hinton Lodge', lat: 53.38816, lng: -117.61821 };
    ['hinton28a','hinton28b'].forEach(id => {
      const st = (d28.stops || []).find(s => s.id === id);
      if (st) {
        st.name = id === 'hinton28a' ? 'Hinton Lodge (Depart 07:00)' : 'Hinton Lodge (Return & Sleep)';
        st.lat = 53.38816; st.lng = -117.61821; st.isHotel = true;
      }
    });
  }

  const d29 = (state.days || []).find(d => d.date === 'Sep 29');
  if (d29) {
    const dep = (d29.stops || []).find(s => s.id === 'hinton29');
    if (dep) { dep.name = 'Hinton Lodge (Depart 06:30)'; dep.lat = 53.38816; dep.lng = -117.61821; dep.isHotel = true; }
    d29.label = 'Hinton → Jasper / Parkway South → Yoho Option → Calgary Airport Hotel';
    d29.drive = '~540 km';
    d29.sleep = 'Holiday Inn Calgary-Airport by IHG (BOOKED)';
    d29.hotel = { name: 'Holiday Inn Calgary-Airport by IHG', lat: 51.06593, lng: -114.01186 };
    d29.note = 'Current southbound plan stays intact. After the Parkway / optional Yoho stop, continue to the booked Holiday Inn Calgary-Airport instead of Cochrane. This adds some driving on Sep 29 but makes Sep 30 much easier.';
    const end = (d29.stops || []).find(s => s.id === 'cochrane29');
    if (end) {
      end.name = 'Holiday Inn Calgary-Airport by IHG (Booked • Check-in)';
      end.lat = 51.06593; end.lng = -114.01186; end.isHotel = true;
    }
  }

  const d30 = (state.days || []).find(d => d.date === 'Sep 30');
  if (d30) {
    d30.label = 'Calgary Airport Hotel → Calgary Optional → YYC → Toronto';
    d30.drive = '~30 km';
    d30.note = 'Wake up already in Calgary at the booked Holiday Inn Calgary-Airport. Calgary sightseeing remains optional. Keep the Ascent rental return target at 4:45 PM for the 7:10 PM WestJet departure.';
    const start = (d30.stops || []).find(s => s.id === 'cochrane30');
    if (start) {
      start.name = 'Holiday Inn Calgary-Airport by IHG (Depart 10:00)';
      start.lat = 51.06593; start.lng = -114.01186; start.isHotel = true;
    }
  }

  state.bookings.forEach((booking, index) => { booking.p = index + 1; });
}

function applyLockedParkPass(state) {
  if (!state) return;
  state.costs = state.costs || {};
  state.costs.park = 73.50;
  state.costs.parkActual = 73.50;
  state.costs.parkLocked = true;

  state.bookings = state.bookings || [];
  let b = state.bookings.find(x => x.id === 'park');
  if (!b) {
    b = { id: 'park' };
    state.bookings.push(b);
  }
  Object.assign(b, {
    item: 'Parks Canada • Family/Group Day Pass • 3 days',
    estimate: 73.50,
    status: 'Paid',
    actual: 73.50,
    confirm: 'Receipt stored in email',
    locked: true,
    bookingGroup: 'parks-canada-pass',
    detail: '3 × Family/Group Day Pass • C$73.50 paid Sep 1 • PRINT + DISPLAY receipt on left-hand side of vehicle dashboard with date visible • verify printed dates cover any Sep 29 park time after 4:00 PM',
    link: 'https://parks.canada.ca/pn-np/ab/banff/visit/passer-passes'
  });
  state.bookings.forEach((booking, index) => { booking.p = index + 1; });
}

applyLockedHotelBookings(S);
applyLockedParkPass(S);
lastSnap = JSON.stringify(S);
persist();

function toast(msg) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])); }
function escapeAttr(s) { return escapeHtml(s); }

const GOOGLE_MAP_QUERIES = {
  yyc25: 'Calgary International Airport YYC, 2000 Airport Rd NE, Calgary, AB',
  cochrane26_dep: 'Calgary International Airport YYC Economy Parking Lot, Calgary, AB',
  minnewanka: 'Lake Minnewanka, Banff National Park, Alberta',
  twojack: 'Two Jack Lake, Banff National Park, Alberta',
  banff: 'Banff Avenue, Banff, Alberta',
  bowfalls: 'Bow Falls, Banff, Alberta',
  surprise: 'Surprise Corner Viewpoint, Banff, Alberta',
  gondola: 'Banff Gondola, 100 Mountain Ave, Banff, AB',
  castlejunction26_in: 'Castle Junction, Banff National Park, Alberta',
  castlejunction26_out: 'Castle Junction, Banff National Park, Alberta',
  johnston: 'Johnston Canyon, Bow Valley Parkway, Banff National Park, Alberta',
  cochrane26_ret: 'Super 8 by Wyndham Cochrane, 11 West Side Dr, Cochrane, AB',
  cochrane27: 'Super 8 by Wyndham Cochrane, 11 West Side Dr, Cochrane, AB',
  parkride: 'Lake Louise Ski Resort Park and Ride, 1 Whitehorn Rd, Lake Louise, AB',
  parkride_return: 'Lake Louise Ski Resort Park and Ride, 1 Whitehorn Rd, Lake Louise, AB',
  moraine: 'Moraine Lake, Banff National Park, Alberta',
  louise: 'Lake Louise Lakeshore, Lake Louise, Alberta',
  bowlake: 'Bow Lake, Banff National Park, Alberta',
  bowlake29: 'Bow Lake, Banff National Park, Alberta',
  peyto: 'Peyto Lake Viewpoint, Icefields Parkway, Alberta',
  mistaya: 'Mistaya Canyon Trailhead, Icefields Parkway, Alberta',
  saskcrossing: 'The Crossing Resort, Saskatchewan River Crossing, Alberta',
  icefield: 'Athabasca Glacier, Icefields Parkway, Alberta',
  icefield29: 'Athabasca Glacier, Icefields Parkway, Alberta',
  sunwapta: 'Sunwapta Falls, Jasper National Park, Alberta',
  athfalls: 'Athabasca Falls, Jasper National Park, Alberta',
  hinton27: 'Hinton Lodge, 752 Carmichael Lane, Hinton, AB',
  hinton28a: 'Hinton Lodge, 752 Carmichael Lane, Hinton, AB',
  hinton28b: 'Hinton Lodge, 752 Carmichael Lane, Hinton, AB',
  hinton29: 'Hinton Lodge, 752 Carmichael Lane, Hinton, AB',
  pyramid: 'Pyramid Island, Jasper National Park, Alberta',
  patricia: 'Patricia Lake, Jasper National Park, Alberta',
  jasper: 'Jasper, Alberta',
  jasper29: 'Jasper, Alberta',
  medicine: 'Medicine Lake, Jasper National Park, Alberta',
  maligne: 'Maligne Lake, Jasper National Park, Alberta',
  annette: 'Lake Annette, Jasper National Park, Alberta',
  valley5: 'Valley of the Five Lakes Trailhead, Jasper National Park, Alberta',
  stutfield: 'Stutfield Glacier Viewpoint, Icefields Parkway, Alberta',
  waterfowl: 'Waterfowl Lakes, Banff National Park, Alberta',
  emerald: 'Emerald Lake, Yoho National Park, British Columbia',
  naturalbridge: 'Natural Bridge, Yoho National Park, British Columbia',
  cochrane29: 'Holiday Inn Calgary-Airport by IHG, 1250 McKinnon Dr NE, Calgary, AB',
  cochrane30: 'Holiday Inn Calgary-Airport by IHG, 1250 McKinnon Dr NE, Calgary, AB',
  canmore: "Prince's Island Park, Calgary, AB",
  yyc30: 'Calgary International Airport YYC, 2000 Airport Rd NE, Calgary, AB'
};

const CURATED_COMMONS_FILES = {
  banff: ['Cascade Mountain Banff Avenue.jpg', 'Banff Avenue - Cascade Mountain.jpg'],
  bowfalls: ['Bow Falls, Alberta.jpg', 'Bow falls Banff national park (12078491613).jpg'],
  surprise: ['Surprise Corner (2407226128).jpg'],
  minnewanka: ['Lake Minnewanka Panorama.jpg', 'Lake Minnewanka 11092005.jpg'],
  twojack: ['Two Jack Lake - Banff.jpg', 'Two Jack Lake Banff.jpg'],
  gondola: ['Gondola Lift -- Sulphur Mountain Banff, Alberta Province (CA) September 2019 (49278742638).jpg', 'Banff from Sulphur Mountain 2020.jpg'],
  castlejunction: ['Alberta Highway 1A northwest of Castle Junction.jpg', 'Castle Junction from Silverton Falls, Banff, Alberta, 2025-07-11.jpg'],
  johnston: ['Johnston Canyon, Banff National Park, Alberta, 2025-07-12 05.jpg', 'Johnston Canyon Trail, Johnston Canyon, Banff National Park, Alberta, 2025-07-12 02.jpg'],
  moraine: ['1 moraine lake pano 2019.jpg'],
  louise: ['Lake Louise Canada Banff.JPG'],
  bowlake: ['Bow Lake -- Banff National Park, Alberta Province, Canada September 2019 (49396463706).jpg', 'Bow Lake in Banff National Park (49380878573).jpg'],
  bowlake29: ['Bow Lake -- Banff National Park, Alberta Province, Canada September 2019 (49396463706).jpg'],
  peyto: ['Peyto Lake, Banff National Park, Alberta, Canada.jpg', 'Classic view of a cloudfree Peyto Lake, Banff National Park, Alberta, Canada (4110933448).jpg'],
  icefield: ['Athabasca Glacier, Jasper National Park (7780237404).jpg'],
  icefield29: ['Athabasca Glacier, Jasper National Park (7780237404).jpg'],
  mistaya: ['Mistaya canyon.jpg'],
  sunwapta: ['Sunwapta Falls Jasper National Park Canada.jpg', 'The Sunwapta Falls.jpg'],
  athfalls: ['Jasper Athabasca Falls.jpg'],
  pyramid: ['Pyramid Lake (Alberta).jpg', 'Pyramid Lake 01.jpg'],
  patricia: ['Patricia Lake.jpg', 'Patricia Lake, Jasper (7743170566).jpg'],
  jasper: ['Jasper town from top of the mountain!.jpg'],
  jasper29: ['Jasper town from top of the mountain!.jpg'],
  annette: ['Lake Edith Jasper.jpg'],
  medicine: ['Medicine Lake, Jasper National Park, Canada (54880322287).jpg', 'Medicine Lake Alberta (1).jpg'],
  maligne: ['Spirit Island on Maligne Lake.jpg', 'Spirit Island, Maligne Lake, Jasper NP.jpg'],
  valley5: ['Valley of the Five Lakes - No.4 - Jasper National Park.jpg'],
  stutfield: ['Stutfield Glacier from Icefields Parkway.jpg', 'MK04426-27 Stutfield Glacier.jpg'],
  waterfowl: ['Banff national park lake.jpg'],
  emerald: ['Emerald Lake - Yoho National Park, BC, Canada.jpg', 'Emerald Lake-Yoho.jpg'],
  naturalbridge: ['Natural Bridge, Yoho NP, west view 20240825 3.jpg', 'Natural Bridge in Yoho National Park.jpg'],
  canmore: ["Prince's Island Park, Calgary (48708020643).jpg"]
};

function googleMapsQueryForStop(s) {
  if (!s) return '';
  if (s.mapQuery) return s.mapQuery;
  return GOOGLE_MAP_QUERIES[s.id] || String(s.name || '').replace(/\s*\([^)]*\)/g, '').replace(/\s*[—•].*$/, '').trim();
}
function googleMapsForStop(s) {
  const q = googleMapsQueryForStop(s);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || (s.lat + ',' + s.lng))}`;
}
function googleMapsDirectionsToStop(s) {
  const q = googleMapsQueryForStop(s);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q || (s.lat + ',' + s.lng))}&travelmode=driving`;
}
function getSpotInfo(stop) {
  const k = SPOT_ALIASES[stop.id] || stop.id;
  const info = SPOT_INFO[k] || GENERIC_INFO[k];
  if (info) return Object.assign({ _key: k }, info);
  return { _key: k, title: stop.name, photoQuery: stop.name + ' Alberta Canada', time: 'Flexible', parking: 'Use signed/designated parking and follow local restrictions.', desc: 'A custom stop in your itinerary. You can rename, move or reprioritize it from the map editor.', todo: 'Review the map position and decide how long you want to spend here.', cut: 'Treat as optional unless you mark it Must.', official: googleMapsForStop(stop), tag: 'Custom stop' };
}
function findStop(date, id) { const d = S.days.find(x => x.date === date); if (!d) return null; return { day: d, stop: d.stops.find(x => x.id === id), index: d.stops.findIndex(x => x.id === id) }; }
function commonsSearchUrl(q) { return 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(q) + '&title=Special:MediaSearch&type=image'; }
function stripTags(v) { const d = document.createElement('div'); d.innerHTML = v || ''; return d.textContent || d.innerText || ''; }
function commonsPhotoFromPage(p) {
  const ii = p && p.imageinfo && p.imageinfo[0];
  if (!ii) return null;
  const m = ii.extmetadata || {};
  return { src: ii.thumburl || ii.url, full: ii.url, title: String(p.title || '').replace(/^File:/, ''), artist: stripTags(m.Artist?.value || m.Credit?.value || ''), license: m.LicenseShortName?.value || '', source: ii.descriptionurl || ii.url };
}
async function getCommonsFiles(fileNames) {
  const names = (fileNames || []).filter(Boolean);
  if (!names.length) return [];
  const key = 'files|' + names.join('|');
  if (photoCache[key]) return photoCache[key];
  const titles = names.map(x => 'File:' + x).join('|');
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent(titles) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1100&format=json&origin=*';
  try {
    const r = await fetch(u);
    const j = await r.json();
    const pages = Object.values(j.query?.pages || {}).filter(x => x.imageinfo?.[0]);
    const byTitle = new Map(pages.map(p => [String(p.title || '').replace(/^File:/, ''), commonsPhotoFromPage(p)]));
    const arr = names.map(name => byTitle.get(name)).filter(Boolean);
    photoCache[key] = arr;
    return arr;
  } catch (e) { return []; }
}
async function getCommonsPhotos(q, limit = 4) {
  const key = q + '|' + limit;
  if (photoCache[key]) return photoCache[key];
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=' + Math.max(limit, 8) + '&gsrsearch=' + encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1100&format=json&origin=*';
  try {
    const r = await fetch(u);
    const j = await r.json();
    const pages = Object.values(j.query?.pages || {}).filter(x => x.imageinfo?.[0]);
    const words = String(q || '').toLowerCase().split(/\s+/).filter(x => x.length > 3);
    const ranked = pages.map(p => {
      const title = String(p.title || '').toLowerCase();
      const score = words.reduce((n, w) => n + (title.includes(w) ? 1 : 0), 0);
      return { score, photo: commonsPhotoFromPage(p) };
    }).filter(x => x.photo).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.photo);
    photoCache[key] = ranked;
    return ranked;
  } catch (e) { return []; }
}
async function getSpotPhotos(inf, limit = 4) {
  const curated = CURATED_COMMONS_FILES[inf && inf._key] || [];
  if (curated.length) {
    const exact = await getCommonsFiles(curated);
    if (exact.length) return exact.slice(0, limit);
  }
  return getCommonsPhotos(inf.photoQuery, limit);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function getDefaultStayMin(stop) {
  if (stop.stayMin !== undefined && stop.stayMin !== null && stop.stayMin !== '') return Number(stop.stayMin);
  const inf = getSpotInfo(stop);
  const t = inf.time || '';
  if (/1\.5–2 hr|1\.5–2h|2 hr/i.test(t)) return 90;
  if (/45–90 min|45–75 min|45–60 min|1 hr/i.test(t)) return 60;
  if (/30–45 min|30–60 min/i.test(t)) return 40;
  if (/20–30 min|20–40 min/i.test(t)) return 25;
  if (/15–25 min|10–20 min/i.test(t)) return 20;
  if (/10–15 min/i.test(t)) return 15;
  if (/Arrival \/ rental pickup|Return car/i.test(t)) return 45;
  if (/Overnight|Transit/i.test(t)) return 0;
  return 30;
}
function parseTimeToMinutes(tStr) {
  if (!tStr) return 450;
  const m = String(tStr).match(/(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (/after work/i.test(tStr)) return 18 * 60;
  if (/flexible/i.test(tStr)) return 9 * 60;
  return 450;
}
function formatMinutesToTime(totalMin) {
  let m = Math.round(totalMin) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const hours24 = Math.floor(m / 60);
  const mins = Math.floor(m % 60);
  const minsStr = mins < 10 ? '0' + mins : mins;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = (hours24 % 12) === 0 ? 12 : (hours24 % 12);
  const h24Str = hours24 < 10 ? '0' + hours24 : hours24;
  return { time24: `${h24Str}:${minsStr}`, time12: `${hours12}:${minsStr} ${ampm}`, display: `${hours12}:${minsStr} ${ampm}` };
}
function formatDuration(mins) {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}
function getLeg(s1, s2) {
  const key = `${s1.lng.toFixed(5)},${s1.lat.toFixed(5)}_${s2.lng.toFixed(5)},${s2.lat.toFixed(5)}`;
  if (legCache[key]) return legCache[key];
  const distKm = haversineDistance(s1.lat, s1.lng, s2.lat, s2.lng) * 1.25;
  const durMin = Math.max(2, Math.round((distKm / 75) * 60));
  const fallback = { distance: distKm * 1000, duration: durMin * 60, coordinates: [[s1.lng, s1.lat], [s2.lng, s2.lat]], status: 'pending' };
  legCache[key] = fallback;
  const url = `https://router.project-osrm.org/route/v1/driving/${s1.lng},${s1.lat};${s2.lng},${s2.lat}?overview=full&geometries=geojson`;
  fetch(url).then(r => r.json()).then(data => {
    if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
      const r = data.routes[0];
      legCache[key] = { distance: r.distance, duration: r.duration, coordinates: r.geometry.coordinates, status: 'ready' };
      if (map) {
        renderRouteLayer();
        const active = document.activeElement;
        const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
        if (!typing) {
          renderDayEditor();
          renderOverview();
          renderDayCards();
          renderHero();
          if (typeof window.renderProductPlan === 'function') {
            const planView = document.getElementById('planview');
            if (planView && planView.classList.contains('on')) window.renderProductPlan();
          }
        }
      }
    }
  }).catch(() => {});
  return fallback;
}
function computeDayTimeline(d) {
  const items = [];
  const startMin = parseTimeToMinutes(d.start);
  let currMin = startMin;
  let totalDistM = 0, totalDriveSec = 0, totalStayMin = 0, lunchAdded = false;
  const lunchMin = /Sep 25|Sep 30/.test(d.date) ? 0 : Number(S.settings.lunchMin || 0);
  const bufferMin = Number(S.settings.bufferMin || 0);
  let lunchAt = null;
  let prevActiveStop = null;

  for (let i = 0; i < d.stops.length; i++) {
    const st = d.stops[i];
    const isCut = !isStopActive(st);
    const plannedStay = getDefaultStayMin(st);

    if (isCut) {
      items.push({
        stop: st,
        index: i,
        isCut: true,
        stayMin: 0,
        plannedStayMin: plannedStay,
        arrMin: null,
        depMin: null,
        arrTime: { display: 'Bypassed' },
        depTime: { display: 'Bypassed' },
        waitBeforeMin: 0,
        prevLeg: null
      });
      continue;
    }

    const stayMin = plannedStay;
    totalStayMin += stayMin;
    let prevLeg = null;

    if (prevActiveStop) {
      const leg = getLeg(prevActiveStop, st);
      const driveMin = Math.max(1, Math.round(leg.duration / 60));
      const distKm = (leg.distance / 1000).toFixed(1);
      totalDistM += leg.distance;
      totalDriveSec += leg.duration;
      currMin += driveMin + bufferMin;
      prevLeg = { distKm, driveMin, durText: formatDuration(driveMin), coordinates: leg.coordinates, fromName: prevActiveStop.name };
    }

    if (!lunchAdded && lunchMin > 0 && prevActiveStop && currMin >= 12 * 60 && startMin < 11 * 60) {
      currMin += lunchMin;
      lunchAdded = true;
      lunchAt = formatMinutesToTime(currMin - lunchMin).display;
    }

    let waitBeforeMin = 0;
    if (st.notBefore) {
      const notBeforeMin = parseTimeToMinutes(st.notBefore);
      if (Number.isFinite(notBeforeMin) && currMin < notBeforeMin) {
        waitBeforeMin = notBeforeMin - currMin;
        currMin = notBeforeMin;
      }
    }

    const arrMin = currMin;
    const depMin = currMin + stayMin;
    currMin = depMin;

    items.push({
      stop: st,
      index: i,
      isCut: false,
      stayMin,
      plannedStayMin: stayMin,
      arrMin,
      depMin,
      arrTime: formatMinutesToTime(arrMin),
      depTime: formatMinutesToTime(depMin),
      waitBeforeMin,
      prevLeg
    });

    prevActiveStop = st;
  }

  const sun = SUN[d.date];
  const sunsetMin = sun ? parseTimeToMinutes(sun.set) : 19 * 60 + 30;
  const sunriseMin = sun ? parseTimeToMinutes(sun.rise) : 7 * 60 + 35;
  return {
    items,
    activeCount: d.stops.filter(isStopActive).length,
    cutCount: d.stops.filter(s => !isStopActive(s)).length,
    totalDistKm: (totalDistM / 1000).toFixed(1),
    totalDriveMin: Math.round(totalDriveSec / 60),
    totalStayMin,
    finishMin: currMin,
    finishTime: formatMinutesToTime(currMin),
    startMin,
    sunsetMin,
    sunriseMin,
    afterSunset: currMin > sunsetMin + 10,
    beforeSunrise: startMin < sunriseMin,
    lunchAt,
    lunchMin: lunchAdded ? lunchMin : 0,
    usedMin: currMin - startMin,
    availableMin: Math.max(60, sunsetMin - startMin)
  };
}

function tripPhase() {
  const t = new Date(); t.setHours(12, 0, 0, 0);
  const start = new Date(S.settings.startDate + 'T12:00:00');
  const end = new Date(S.settings.endDate + 'T12:00:00');
  if (t < start) return 'before';
  if (t > end) return 'after';
  return 'during';
}
function todayLabel() {
  const t = new Date();
  const iso = t.toISOString().slice(0, 10);
  return Object.keys(DATE_ISO).find(k => DATE_ISO[k] === iso) || null;
}
function daysUntil(iso, hh = 0, mm = 0) {
  const tgt = new Date(iso + 'T00:00:00');
  tgt.setHours(hh, mm, 0, 0);
  return tgt - Date.now();
}
function fmtCountdown(ms) {
  if (ms < 0) return 'now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 2) return `${d} days`;
  if (d >= 1) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 1) return `${h}h ${m}m`;
  return `${m} min`;
}
function isBooked(id) {
  const b = S.bookings.find(x => x.id === id);
  return b && ['Booked', 'Paid', 'Done'].includes(b.status);
}
function hotelTotal() { return Object.values(S.hotels).reduce((n, h) => n + Number(h.price || 0), 0); }
function attractionCost() { return S.attractions.filter(a => a.type === 'paid' && a.selected).reduce((n, a) => n + Number(a.cost || 0), 0); }
function attractionHours() { return S.attractions.filter(a => a.type === 'paid' && a.selected).reduce((n, a) => n + Number(a.time || 0), 0); }
function flightTotal() { if (S.costs.flightLocked && S.costs.flightActual != null) return Number(S.costs.flightActual || 0); return S.costs.flight === 'mixed' ? 1128 : 1353; }
function total() { return flightTotal() + hotelTotal() + Number(S.costs.rental || 0) + Number(S.costs.fuel || 0) + Number(S.costs.food || 0) + Number(S.costs.misc || 0) + Number(S.costs.park || 0) + Number(S.costs.shuttle || 0) + attractionCost(); }
function paid() { const lockedFlights = S.costs.flightLocked ? Number(S.costs.flightActual || 0) : 0; return lockedFlights + S.bookings.filter(b => !S.costs.flightLocked || !['outbound','return'].includes(b.id)).reduce((n, b) => n + Number(b.actual || 0), 0); }
function ready() { const core = S.bookings; const n = core.filter(b => ['Booked', 'Paid', 'Done'].includes(b.status)).length; return core.length ? n / core.length : 0; }
function tripDriveKm() { return S.days.reduce((n, d) => n + Number(computeDayTimeline(d).totalDistKm || 0), 0); }
function fuelSuggest() { const km = tripDriveKm(); return Math.round(km * 0.12 * 1.75 + 45); }

function getDay() { return S.days.find(d => d.date === S.selectedDay) || S.days[0]; }
function dayColor(date) { return { 'Sep 25': '#8dd3ff', 'Sep 26': '#56c6a5', 'Sep 27': '#f0c36a', 'Sep 28': '#c5a6ff', 'Sep 29': '#ff9fa0', 'Sep 30': '#8dd3ff' }[date] || '#68b9ff'; }
function tripStopCode(dayOrDate, stopOrIndex) {
  const day = typeof dayOrDate === 'string' ? S.days.find(d => d.date === dayOrDate) : dayOrDate;
  if (!day) return 'D?-?';
  const dayIdx = S.days.indexOf(day);
  let stopIdx = typeof stopOrIndex === 'number' ? stopOrIndex : day.stops.indexOf(stopOrIndex);
  if (stopIdx < 0 && stopOrIndex && stopOrIndex.id) stopIdx = day.stops.findIndex(s => s.id === stopOrIndex.id);
  return `D${dayIdx + 1}-${stopIdx + 1}`;
}
function isStopEnabled(stop) {
  if (!stop) return false;
  if (stop.enabled === false) return false;
  if (stop.choiceGroup === 'sep29bonus' && (!S.decisions || S.decisions.sep29bonus === 'pending') && stop.enabled !== true) return false;
  return true;
}
function isStopActive(stop) {
  return !!stop && stop.priority !== 'cut' && isStopEnabled(stop);
}
function setOptionalStopEnabled(date, id, enabled) {
  const found = findStop(date, id);
  if (!found || !found.stop || found.stop.priority !== 'nice') return;

  const stop = found.stop;
  stop.enabled = !!enabled;

  // A choice group stays NICE. Turning one on only disables sibling NICE
  // alternatives so the route remains efficient. This is a planning toggle,
  // not a final MCQ lock decision.
  if (stop.choiceGroup && enabled) {
    found.day.stops.forEach(function (other) {
      if (other !== stop && other.priority === 'nice' && other.choiceGroup === stop.choiceGroup) {
        other.enabled = false;
      }
    });
  }

  save();
}
function markerOffsetMap(stops) {
  const groups = new Map();
  (stops || []).forEach(stop => {
    const key = Number(stop.lat).toFixed(5) + ',' + Number(stop.lng).toFixed(5);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(stop);
  });
  const offsets = new Map();
  groups.forEach(group => {
    const spacing = 46;
    group.forEach((stop, i) => offsets.set(stop, (i - (group.length - 1) / 2) * spacing));
  });
  return offsets;
}
function sameMapPoint(a, b) {
  return !!a && !!b && Math.abs(Number(a.lat) - Number(b.lat)) < 0.00001 && Math.abs(Number(a.lng) - Number(b.lng)) < 0.00001;
}
function dayHasStopAt(day, point) {
  return !!day && !!point && (day.stops || []).some(stop => sameMapPoint(stop, point));
}
function divIcon(stop, label, isCut = false, xOffset = 0) {
  const isHotel = stop.isHotel || /hotel|transit \/ overnight|Airport/i.test(getSpotInfo(stop).tag || '');
  const disabledNice = stop.priority === 'nice' && !isStopEnabled(stop);
  const actualCut = stop.priority === 'cut';
  const c = actualCut ? '#384754' : (disabledNice ? '#536a78' : (isHotel ? COLORS.hotel : (COLORS[stop.priority] || COLORS.nice)));
  const border = actualCut ? '2px dashed #f0c36a' : (disabledNice ? '2px solid #7e95a2' : '2px solid #07131d');
  const textColor = actualCut ? '#f0c36a' : (disabledNice ? '#e1e9ed' : (isHotel ? '#ffffff' : '#07131d'));
  const dim = stop.done ? 'opacity:.45;' : ((actualCut || disabledNice) ? 'opacity:.68;' : '');
  const txt = typeof label === 'number' ? (label + 1) : String(label);
  const coded = /^D\d+-\d+$/.test(txt);
  const width = coded ? Math.max(40, 14 + txt.length * 6) : 26;
  const radius = coded ? 9 : 13;
  const fontSize = coded ? '9px' : (txt.length > 2 ? '8.5px' : '10px');
  return L.divIcon({
    className: '',
    html: `<div style="width:${width}px;height:26px;border-radius:${radius}px;background:${c};border:${border};color:${textColor};font-weight:900;display:grid;place-items:center;font-size:${fontSize};box-shadow:0 4px 12px #0007;${dim}">${txt}</div>`,
    iconSize: [width, 26],
    iconAnchor: [width / 2 + xOffset, 13]
  });
}

function googleRouteUrl(stops) {
  const active = stops.filter(isStopActive);
  if (!active.length) return '';
  const origin = googleMapsQueryForStop(active[0]) || `${active[0].lat},${active[0].lng}`;
  const dest = googleMapsQueryForStop(active[active.length - 1]) || `${active[active.length - 1].lat},${active[active.length - 1].lng}`;
  const mids = active.slice(1, -1);
  const capped = mids.slice(0, 10);
  let u = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  if (capped.length) u += `&waypoints=${encodeURIComponent(capped.map(s => googleMapsQueryForStop(s) || `${s.lat},${s.lng}`).join('|'))}`;
  return u;
}

function initMap() {
  map = L.map('map', { doubleClickZoom: false }).setView([52.15, -116.55], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  hotelLayer = L.layerGroup().addTo(map);
  allDayLayer = L.layerGroup().addTo(map);
  fuelLayer = L.layerGroup().addTo(map);
  poiLayer = L.layerGroup().addTo(map);
  map.on('dblclick', e => {
    pendingLatLng = e.latlng;
    openAddStopModal();
  });
  setTimeout(() => { renderMap(); fitSelectedDay(); }, 120);
}

function renderRouteLayer() {
  if (!map) return;
  routeLayer.clearLayers();

  if (S.selectedDay === 'all') {
    S.days.forEach((day, dayIdx) => {
      const activeStops = S.filterMustOnly
        ? day.stops.filter(s => s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''))
        : day.stops.filter(isStopActive);

      for (let i = 0; i < activeStops.length - 1; i++) {
        const s1 = activeStops[i], s2 = activeStops[i + 1];
        const leg = getLeg(s1, s2);
        const distKm = (leg.distance / 1000).toFixed(1);
        const durMin = Math.max(1, Math.round(leg.duration / 60));
        const polyPts = leg.coordinates.map(c => [c[1], c[0]]);
        L.polyline(polyPts, { color: '#05111a', weight: 7, opacity: 0.75, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
        const poly = L.polyline(polyPts, { color: dayColor(day.date), weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
        poly.bindTooltip(`<div style="font-family:Inter,sans-serif;"><div style="font-weight:750;font-size:12px;color:#fff;margin-bottom:2px;"><b>Day ${dayIdx + 1} (${day.date}):</b> ${escapeHtml(s1.name)} → ${escapeHtml(s2.name)}</div><div style="font-size:11px;color:#56c6a5;font-weight:700;">${distKm} km • ~${formatDuration(durMin)} drive</div></div>`, { sticky: true, className: 'route-tooltip', direction: 'top', offset: [0, -10] });
        poly.on('mouseover', function () { this.setStyle({ weight: 8, color: '#ffffff', opacity: 1 }); });
        poly.on('mouseout', function () { this.setStyle({ weight: 5, color: dayColor(day.date), opacity: 0.95 }); });
      }
    });
    return;
  }

  const d = getDay();
  const activeStops = S.filterMustOnly
    ? d.stops.filter(s => s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''))
    : d.stops.filter(isStopActive);

  for (let i = 0; i < activeStops.length - 1; i++) {
    const s1 = activeStops[i], s2 = activeStops[i + 1];
    const leg = getLeg(s1, s2);
    const distKm = (leg.distance / 1000).toFixed(1);
    const durMin = Math.max(1, Math.round(leg.duration / 60));
    const polyPts = leg.coordinates.map(c => [c[1], c[0]]);
    L.polyline(polyPts, { color: '#05111a', weight: 8, opacity: 0.75, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    const poly = L.polyline(polyPts, { color: dayColor(d.date), weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    poly.bindTooltip(`<div style="font-family:Inter,sans-serif;"><div style="font-weight:750;font-size:12px;color:#fff;margin-bottom:2px;">${escapeHtml(s1.name)} → ${escapeHtml(s2.name)}</div><div style="font-size:11px;color:#56c6a5;font-weight:700;">${distKm} km • ~${formatDuration(durMin)}</div></div>`, { sticky: true, className: 'route-tooltip', direction: 'top', offset: [0, -10] });
    poly.on('mouseover', function () { this.setStyle({ weight: 7, color: '#ffffff', opacity: 1 }); });
    poly.on('mouseout', function () { this.setStyle({ weight: 5, color: dayColor(d.date), opacity: 0.95 }); });
  }
}

function renderFuelLayer() {
  if (!map || !fuelLayer) return;
  fuelLayer.clearLayers();
  if (!S.showFuel) return;
  GAS_STOPS.forEach(g => {
    L.circleMarker([g.lat, g.lng], { radius: 7, color: '#07131d', weight: 2, fillColor: '#f0c36a', fillOpacity: 1 })
      .addTo(fuelLayer)
      .bindPopup(`<b>Fuel: ${escapeHtml(g.name)}</b><br>${escapeHtml(g.note)}`);
  });
}

function renderPOILayer() {
  if (!map || !poiLayer) return;
  poiLayer.clearLayers();
  if (!S.showPOIs) return;
  const d = getDay();
  const currentStopIds = new Set(d.stops.map(s => s.id));
  
  CATALOG.forEach(c => {
    if (currentStopIds.has(c.id)) return;
    const inf = getSpotInfo(c);
    const marker = L.circleMarker([c.lat, c.lng], {
      radius: 8,
      color: '#081a27',
      weight: 2,
      fillColor: '#56c6a5',
      fillOpacity: 0.95
    }).addTo(poiLayer);
    
    marker.bindTooltip(`<b>📍 ${escapeHtml(c.name)}</b><br><span style="color:#ffd768;">⭐ ${inf.rating || '8.5/10'}</span> • ${c.stayMin}m stay`, { direction: 'top', offset: [0, -10], className: 'route-tooltip' });
    
    marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:210px;">
        <b style="font-size:13px;color:#fff;">📍 ${escapeHtml(c.name)}</b><br>
        <span class="rating-pill" style="margin:4px 0;display:inline-block;">⭐ <b>${inf.rating || '8.5/10'}</b></span> • <span style="font-size:11px;color:#8ba4b6;">${c.stayMin} min</span>
        <p style="font-size:11px;margin:6px 0;line-height:1.4;color:#cad5e2;">${escapeHtml(inf.desc || '')}</p>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="btn small primary" onclick="addCatalogStop('${c.id}')">+ Add to ${d.date}</button>
          <button class="btn small" onclick="openSpotModal('${d.date}','${c.id}')">Intel ↗</button>
        </div>
      </div>
    `);
  });
}

function renderMap() {
  if (!map) return;
  markerLayer.clearLayers();
  hotelLayer.clearLayers();
  allDayLayer.clearLayers();

  const isAllDays = S.selectedDay === 'all';
  const d = getDay();

  renderRouteLayer();
  renderFuelLayer();
  renderPOILayer();

  if (isAllDays) {
    const allVisibleStops = S.days.flatMap(day => S.filterMustOnly
      ? day.stops.filter(s => s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''))
      : day.stops);
    const allMarkerOffsets = markerOffsetMap(allVisibleStops);
    S.days.forEach((day, dayIdx) => {
      const stopsToRender = S.filterMustOnly
        ? day.stops.filter(s => s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''))
        : day.stops;

      stopsToRender.forEach((s, sIdx) => {
        const inf = getSpotInfo(s);
        const isCut = !isStopActive(s);
        const label = tripStopCode(day, s);
        const m = L.marker([s.lat, s.lng], { icon: divIcon(s, label, isCut, allMarkerOffsets.get(s) || 0), draggable: false }).addTo(markerLayer);

        m.bindTooltip(`<b>${tripStopCode(day, s)} • ${day.date}: ${escapeHtml(s.name)}</b><br><span style="color:#ffd768;">⭐ ${inf.rating || '8.5/10'}</span> • <span class="badge ${s.priority}">${s.priority.toUpperCase()}</span>`, { direction: 'top', offset: [0, -14], className: 'route-tooltip' });

        m.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:220px;">
            <div style="font-size:10px;color:#8ba4b6;text-transform:uppercase;font-weight:700;">${tripStopCode(day, s)} • ${day.date}</div>
            <b style="font-size:14px;color:#fff;display:block;margin:2px 0 4px;">${escapeHtml(s.name)}</b>
            <span class="rating-pill" style="margin:2px 0;display:inline-block;">⭐ <b>${inf.rating || '8.5/10'}</b></span>
            <span class="badge ${s.priority}" style="margin-left:4px;">${s.priority.toUpperCase()}</span>
            <p style="font-size:11px;color:#c0d1dc;margin:6px 0;line-height:1.4;">${escapeHtml(inf.desc || '')}</p>
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="btn small primary" onclick="chooseDay('${day.date}')">Open Day ${dayIdx + 1} ↗</button>
              <button class="btn small" onclick="openSpotModal('${day.date}','${s.id}')">Photos ↗</button>
            </div>
          </div>
        `);
      });

      if (day.hotel && !dayHasStopAt(day, day.hotel)) {
        L.circleMarker([day.hotel.lat, day.hotel.lng], { radius: 8, color: '#07131d', weight: 2, fillColor: COLORS.hotel, fillOpacity: 1 })
          .addTo(hotelLayer)
          .bindPopup(`<b>Day ${dayIdx + 1} Base: ${escapeHtml(day.sleep)}</b><br>${escapeHtml(day.hotel.name)}<br><button class="btn small primary" style="margin-top:6px;" onclick="chooseDay('${day.date}')">Switch to Day ${dayIdx + 1}</button>`);
      }
    });
  } else {
    const tl = computeDayTimeline(d);
    const singleVisibleStops = tl.items
      .map(it => it.stop)
      .filter(s => !S.filterMustOnly || s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''));
    const singleMarkerOffsets = markerOffsetMap(singleVisibleStops);
    if (S.showAllDays) {
      S.days.forEach(day => {
        if (day.date === d.date) return;
        const active = day.stops.filter(isStopActive);
        for (let i = 0; i < active.length - 1; i++) {
          const s1 = active[i], s2 = active[i + 1];
          const leg = getLeg(s1, s2);
          const poly = L.polyline(leg.coordinates.map(c => [c[1], c[0]]), { color: dayColor(day.date), weight: 3, opacity: 0.45, dashArray: '5 7' }).addTo(allDayLayer);
          poly.bindTooltip(`<b>${day.date}: ${day.label}</b><br>${s1.name} → ${s2.name}`, { sticky: true, className: 'route-tooltip' });
        }
      });
    }

    tl.items.forEach((it, i) => {
      const s = it.stop;
      const isCut = it.isCut;
      if (S.filterMustOnly && s.priority !== 'must' && !s.isHotel && !/hotel|airport/i.test(getSpotInfo(s).tag || '')) return;
      const inf = getSpotInfo(s);
      const m = L.marker([s.lat, s.lng], { icon: divIcon(s, tripStopCode(d, s), isCut, singleMarkerOffsets.get(s) || 0), draggable: true }).addTo(markerLayer);
      if (isCut) {
        m.bindTooltip(`<b>${tripStopCode(d, s)}: ${escapeHtml(s.name)}</b><br><span style="color:#f0c36a;">✂️ Bypassed from route (Cut)</span> • ⭐ ${inf.rating || '8.5/10'}`, { direction: 'top', offset: [0, -14], className: 'route-tooltip' });
        m.bindPopup(`<b>${escapeHtml(s.name)}</b><br><span class="badge cut">CUT (BYPASSED)</span> • ${tripStopCode(d, s)} • ${i + 1} of ${d.stops.length} • ⭐ <b>${inf.rating || '8.5/10'}</b><div style="margin:8px 0;padding:6px 8px;background:#081a27;border-radius:7px;font-size:11px;line-height:1.45;color:#f0c36a;">⚠️ <b>This stop is currently bypassed from the driving route and timeline calculations.</b> Change priority to <b>Must</b> or <b>Nice</b> in the left panel to route through it.</div><div style="margin-top:6px;"><a href="#" onclick="openSpotModal('${d.date}','${s.id}');return false">Photos + spot details ↗</a><br><a href="${googleMapsForStop(s)}" target="_blank">Open Google Maps ↗</a></div>`);
      } else {
        m.bindTooltip(`<b>${tripStopCode(d, s)}: ${escapeHtml(s.name)}</b><br><span style="color:#56c6a5;">Arr ${it.arrTime.display} • Dep ${it.depTime.display}</span> (${it.stayMin}m stay) • ⭐ ${inf.rating || '8.5/10'}`, { direction: 'top', offset: [0, -14], className: 'route-tooltip' });
        m.bindPopup(`<b>${escapeHtml(s.name)}</b><br><span class="badge ${s.priority}">${s.priority.toUpperCase()}</span> • ${tripStopCode(d, s)} • ${i + 1} of ${d.stops.length} • ⭐ <b>${inf.rating || '8.5/10'}</b><div style="margin:8px 0;padding:6px 8px;background:#081a27;border-radius:7px;font-size:11px;line-height:1.45;">🕒 <b>Arrival:</b> ${it.arrTime.display}<br>🚪 <b>Departure:</b> ${it.depTime.display}<br>⏱️ <b>Est. Stay:</b> ${it.stayMin} min<br>${it.prevLeg ? `🚗 <b>Drive:</b> ${it.prevLeg.distKm} km (~${it.prevLeg.durText}) from ${escapeHtml(it.prevLeg.fromName || 'prev')}<br>` : '🚩 <b>Starting location</b><br>'}${s.note ? `📝 ${escapeHtml(s.note)}` : ''}</div><div style="margin-top:6px;"><a href="#" onclick="openSpotModal('${d.date}','${s.id}');return false">Photos + spot details ↗</a><br><a href="${googleMapsForStop(s)}" target="_blank">Open Google Maps ↗</a></div><small style="color:var(--muted);display:block;margin-top:5px;">Drag marker to fine-tune location.</small>`);
      }
      m.on('dragend', ev => {
        const p = ev.target.getLatLng();
        s.lat = +p.lat.toFixed(6);
        s.lng = +p.lng.toFixed(6);
        save();
      });
    });
    if (d.hotel && !dayHasStopAt(d, d.hotel)) {
      L.circleMarker([d.hotel.lat, d.hotel.lng], { radius: 8, color: '#07131d', weight: 2, fillColor: COLORS.hotel, fillOpacity: 1 }).addTo(hotelLayer).bindPopup(`<b>Sleep: ${escapeHtml(d.sleep)}</b><br>${escapeHtml(d.hotel.name)}`);
    }
  }

  const mustBtn = document.getElementById('mustFilterBtn');
  if (mustBtn) {
    mustBtn.classList.toggle('primary', !!S.filterMustOnly);
    mustBtn.textContent = S.filterMustOnly ? '✓ Musts only' : '⭐ Musts only';
  }
  const poiBtn = document.getElementById('poiBtn');
  if (poiBtn) poiBtn.textContent = S.showPOIs ? 'Hide extra spots' : 'Explore all spots';
  const allBtn = document.getElementById('allDaysBtn');
  if (allBtn) allBtn.textContent = S.showAllDays ? 'Hide other days' : 'Show all days';
  const fuelBtn = document.getElementById('fuelBtn');
  if (fuelBtn) fuelBtn.textContent = S.showFuel ? 'Hide fuel' : 'Fuel stops';
}

function fitSelectedDay() {
  if (!map) return;
  if (S.selectedDay === 'all') { fitWholeTrip(); return; }
  const pts = getDay().stops.map(s => [s.lat, s.lng]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(.14));
}
function fitWholeTrip() {
  if (!map) return;
  const pts = S.days.flatMap(d => d.stops.map(s => [s.lat, s.lng]));
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(.06));
}
function toggleMustFilter() {
  S.filterMustOnly = !S.filterMustOnly;
  save();
  renderAll(false);
  toast(S.filterMustOnly ? '⭐ Showing Must-Do locations only' : 'Showing all stops');
}
function togglePOIs() { S.showPOIs = !S.showPOIs; save(); toast(S.showPOIs ? '📍 Showing all catalog spots on map' : 'Hidden catalog spots'); }
function toggleAllDays() { S.showAllDays = !S.showAllDays; save(); }
function toggleFuel() { S.showFuel = !S.showFuel; save(); }
function openGoogleRoute() {
  if (S.selectedDay === 'all') {
    const mustStops = S.days.flatMap(d => d.stops.filter(s => s.priority === 'must'));
    if (!mustStops.length) return;
    window.open(googleRouteUrl(mustStops), '_blank');
    return;
  }
  const d = getDay();
  if (!d.stops.length) return;
  window.open(googleRouteUrl(d.stops), '_blank');
}

function setView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === id));
  if (id === 'mapview' && map) setTimeout(() => { map.invalidateSize(); fitSelectedDay(); }, 80);
  if (id === 'overview') renderOverview();
  if (id === 'planview') renderPlan();
  if (id === 'packview') renderPack();
  if (id === 'fieldview') renderField();
  if (id === 'settings') refreshRawJson();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setView(b.dataset.view));

function chooseDay(date) {
  S.selectedDay = date;
  persist();
  setView('mapview');
  renderAll(false);
  if (date === 'all') {
    setTimeout(fitWholeTrip, 60);
  } else {
    setTimeout(fitSelectedDay, 40);
  }
}
function openDayGuide(date) {
  overviewDay = date;
  S.selectedDay = date;
  persist();
  setView('overview');
  renderAll(false);
}
function nextDay(dir) {
  const i = S.days.findIndex(d => d.date === S.selectedDay);
  const n = S.days[(i + dir + S.days.length) % S.days.length];
  S.selectedDay = n.date;
  persist();
  renderAll();
  if (map) setTimeout(fitSelectedDay, 40);
}

function insertStop(stop) {
  const d = getDay();
  const last = d.stops[d.stops.length - 1];
  const idx = last && getDefaultStayMin(last) === 0 ? d.stops.length - 1 : d.stops.length;
  d.stops.splice(idx, 0, stop);
}

function renderDayEditor() {
  const isAllDays = S.selectedDay === 'all';
  const today = todayLabel();

  let daySwitchHtml = `<button class="daybtn ${isAllDays ? 'on' : ''}" onclick="chooseDay('all')" title="Full 6-day trip route">🌍 All Days</button>`;
  daySwitchHtml += S.days.map(x => `<button class="daybtn ${x.date === S.selectedDay ? 'on' : ''} ${x.date === today ? 'today' : ''}" onclick="chooseDay('${x.date}')" ondblclick="openDayGuide('${x.date}')" title="Click for map • Double-click for day guide">${x.date}</button>`).join('');
  document.getElementById('daySwitch').innerHTML = daySwitchHtml;

  const sidebar = document.querySelector('#mapview .sidebar');
  const sideEy = sidebar && sidebar.querySelector('.sidehead .ey');
  if (sidebar) sidebar.classList.toggle('all-days-mode', isAllDays);
  if (sideEy) sideEy.textContent = isAllDays ? 'Trip overview' : 'Day editor';

  if (isAllDays) {
    document.getElementById('sideTitle').textContent = 'Whole trip';
    document.getElementById('dayLabel').value = '6-day Banff → Jasper route';
    document.getElementById('dayStart').value = 'Sep 25 – Sep 30';
    document.getElementById('dayNote').value = 'Click a stop to focus its pin. Open a day to edit its route, timing, priorities or dwell times.';

    let totalKm = 0;
    let totalDriveMin = 0;
    let totalMust = 0;
    let totalStops = 0;
    S.days.forEach(x => {
      const tl = computeDayTimeline(x);
      totalKm += Number(tl.totalDistKm || 0);
      totalDriveMin += Number(tl.totalDriveMin || 0);
      totalMust += x.stops.filter(s => s.priority === 'must' && !s.isHotel).length;
      totalStops += x.stops.filter(isStopActive).length;
    });

    const filterMust = S.filterMustOnly;
    document.getElementById('daySummary').innerHTML =
      `<span><b>~${Math.round(totalKm)} km</b> • ${formatDuration(totalDriveMin)} driving</span><span><b>${totalMust}</b> musts • <b>${totalStops}</b> active stops</span>`;

    const banner = document.getElementById('attBanner');
    if (banner) banner.classList.add('hidden');

    const list = document.getElementById('stopList');
    let html = '';

    S.days.forEach((d, dayIdx) => {
      const dayColorCode = dayColor(d.date);
      const dTl = computeDayTimeline(d);
      const activeStops = d.stops.filter(isStopActive);
      const displayStops = filterMust
        ? d.stops.filter(s => s.priority === 'must' || s.isHotel || /hotel|airport/i.test(getSpotInfo(s).tag || ''))
        : d.stops;

      if (displayStops.length === 0) return;

      html += `<section class="alltrip-day" style="--day-color:${dayColorCode}">
        <div class="alltrip-day-head">
          <button class="alltrip-day-main" onclick="chooseDay('${d.date}')">
            <span class="alltrip-day-code">D${dayIdx + 1}</span>
            <span class="alltrip-day-copy">
              <b>${escapeHtml(d.date)} • ${escapeHtml(d.label)}</b>
              <small>${escapeHtml(d.start)} → ~${escapeHtml(dTl.finishTime.display)} • ${escapeHtml(String(dTl.totalDistKm))} km • ${escapeHtml(formatDuration(dTl.totalDriveMin))} drive • ${activeStops.length} active</small>
            </span>
          </button>
          <button class="alltrip-open" onclick="chooseDay('${d.date}')" title="Open this day">Open</button>
        </div>
        <div class="alltrip-stops">`;

      displayStops.forEach(s => {
        const inf = getSpotInfo(s);
        const isCut = !isStopActive(s);
        const isHotel = s.isHotel || /hotel|transit \/ overnight|Airport/i.test(inf.tag || '');
        const code = tripStopCode(d, s);
        const disabledNice = s.priority === 'nice' && !isStopEnabled(s);
        const stateLabel = isHotel ? 'BASE' : (disabledNice ? 'NICE OFF' : s.priority.toUpperCase());
        const dwell = getDefaultStayMin(s);

        html += `<div class="alltrip-stop ${isCut ? 'is-cut' : ''}">
          <button class="alltrip-stop-main" onclick="focusStopOnMap(${s.lat},${s.lng})" title="Focus ${escapeAttr(code)} on map">
            <span class="alltrip-stop-code">${escapeHtml(code)}</span>
            <span class="alltrip-stop-name">${escapeHtml(inf.title || s.name)}</span>
            <span class="alltrip-stop-meta">${dwell ? escapeHtml(formatDuration(dwell)) : '—'}</span>
            <span class="alltrip-stop-state ${isHotel ? 'hotel' : s.priority}">${stateLabel}</span>
          </button>
          <button class="alltrip-info" onclick="openSpotModal('${d.date}','${s.id}')" title="Place details">i</button>
          <a class="alltrip-info" href="${googleMapsForStop(s)}" target="_blank" rel="noopener" title="Open exact place in Google Maps">↗</a>
        </div>`;
      });

      html += `</div></section>`;
    });

    list.innerHTML = html;
    return;
  }

  // Single Day Rendering
  const d = getDay();
  const tl = computeDayTimeline(d);
  const sun = SUN[d.date];
  document.getElementById('sideTitle').textContent = d.date;
  document.getElementById('dayLabel').value = d.label;
  document.getElementById('dayStart').value = d.start;
  document.getElementById('dayNote').value = d.note || '';
  const warn = tl.afterSunset ? ` <span class="timeline-warn">• finishes after sunset (${formatMinutesToTime(tl.sunsetMin).display})</span>` : '';
  const dark = tl.beforeSunrise ? ' • starts in the dark' : '';
  const lunch = tl.lunchAt ? ` • lunch ~${tl.lunchAt}` : '';
  document.getElementById('daySummary').innerHTML = `<b>🚗 ${tl.totalDistKm} km (~${formatDuration(tl.totalDriveMin)})</b> • ⏱️ Stay: ${formatDuration(tl.totalStayMin)} • 🏁 Finish ~${tl.finishTime.display}${warn}${dark}${lunch}`;
  document.getElementById('dayLabel').onchange = e => { d.label = e.target.value; save(); };
  document.getElementById('dayStart').onchange = e => { d.start = e.target.value; save(); };
  document.getElementById('dayNote').onchange = e => { d.note = e.target.value; save(); };

  const paidToday = S.attractions.filter(a => a.type === 'paid' && a.selected && a.day === d.date);
  const banner = document.getElementById('attBanner');
  if (banner) {
    if (paidToday.length) {
      banner.classList.remove('hidden');
      banner.innerHTML = `Paid today: ${paidToday.map(a => escapeHtml(a.name)).join(' • ')}. Make sure the matching stop has enough stay time.`;
    } else banner.classList.add('hidden');
  }

  const list = document.getElementById('stopList');
  const stayOptions = [0, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180];
  let html = '';
  if (sun) html += `<div class="sun-line">Sunrise ${sun.rise} • Sunset ${sun.set} MDT${tl.afterSunset ? ' <span class="timeline-warn">— this day overruns daylight</span>' : ''}</div>`;
  tl.items.forEach((it, i) => {
    const s = it.stop;
    const isCut = it.isCut;
    const disabledNice = s.priority === 'nice' && !isStopEnabled(s);
    const inf = getSpotInfo(s);
    if (i > 0 && it.prevLeg) {
      html += `<div class="leg-bridge"><span>🚗 <b>${it.prevLeg.distKm} km</b></span><span>• ~<b>${it.prevLeg.durText}</b> drive from ${escapeHtml(it.prevLeg.fromName || 'prev')}</span></div>`;
    }
    const isHotel = s.isHotel || /hotel|transit \/ overnight|Airport/i.test(inf.tag || '');
    const badgeColor = disabledNice ? '#536a78' : (isCut ? '#384754' : (isHotel ? COLORS.hotel : (COLORS[s.priority] || COLORS.nice)));
    html += `<div class="stoprow ${s.done ? 'done' : ''} ${isCut ? 'is-cut' : ''}" draggable="true" data-i="${i}">
      <div class="stoprow-top">
        <div class="grip" title="Drag to reorder">☰</div>
        <div class="stop-num-badge" style="background:${badgeColor};" onclick="focusStopOnMap(${s.lat}, ${s.lng})" title="Map pin ${tripStopCode(d, s)} (Click to focus on map)">${tripStopCode(d, s)}</div>
        <input class="stopname" value="${escapeAttr(s.name)}" onchange="renameStop(${i},this.value)">
        <select class="priority ${s.priority}" onchange="setPriority(${i},this.value)">
          <option value="must" ${s.priority === 'must' ? 'selected' : ''}>Must</option>
          <option value="nice" ${s.priority === 'nice' ? 'selected' : ''}>Nice</option>
          <option value="cut" ${s.priority === 'cut' ? 'selected' : ''}>Cut</option>
        </select>
        <button class="iconbtn infoBtn" onclick="openSpotModal('${d.date}','${s.id}')" title="Photos and details">i</button>
        <a class="iconbtn" href="${googleMapsForStop(s)}" target="_blank" rel="noopener" title="Open exact place in Google Maps">↗</a>
        <button class="iconbtn" onclick="toggleStopDone(${i})" title="Mark visited">${s.done ? '✓' : '○'}</button>
        <button class="iconbtn" onclick="removeStop(${i})" title="Remove">×</button>
      </div>
      <div class="stoprow-sched">
        ${isCut 
          ? (disabledNice ? `<span class="bypassed-pill nice-off-pill">NICE OFF • excluded from route</span>` : `<span class="bypassed-pill">CUT • bypassed from route</span>`) 
          : `<span class="time-pill">🕒 ${it.arrTime.display} → 🚪 ${it.depTime.display}</span>`
        }
        <span class="rating-pill" title="Visitor recommendation rating">⭐ ${inf.rating || '8.5/10'}</span>
        <div class="stay-ctl">
          <span>Stay:</span>
          <select class="stay-select" onchange="setStopStay(${i},this.value)" ${isCut ? 'disabled' : ''}>
            ${stayOptions.map(m => `<option value="${m}" ${it.plannedStayMin === m ? 'selected' : ''}>${m === 0 ? 'Pass' : m < 60 ? m + 'm' : (m / 60) + 'h'}</option>`).join('')}
            ${!stayOptions.includes(it.plannedStayMin) ? `<option value="${it.plannedStayMin}" selected>${it.plannedStayMin}m</option>` : ''}
          </select>
        </div>
      </div>
      <input class="stop-note" placeholder="Note (parking, booking, photo idea…)" value="${escapeAttr(s.note || '')}" onchange="setStopNote(${i},this.value)">
    </div>`;
  });
  list.innerHTML = html;
  list.querySelectorAll('.stoprow').forEach(el => {
    el.addEventListener('dragstart', () => { dragSource = +el.dataset.i; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      const to = +el.dataset.i;
      if (dragSource === null || dragSource === to) return;
      const [m] = d.stops.splice(dragSource, 1);
      d.stops.splice(to, 0, m);
      dragSource = null;
      save();
    });
  });
}

function focusStopOnMap(lat, lng) {
  if (!map) return;
  map.setView([lat, lng], 13, { animate: true });
  toast('Focused marker on map');
}

function renameStop(i, v) { getDay().stops[i].name = v; save(); }
function setPriority(i, v) { const s = getDay().stops[i]; s.priority = v; if (v !== 'nice') delete s.enabled; save(); }
function removeStop(i) { if (confirm('Remove this stop?')) { getDay().stops.splice(i, 1); save(); } }
function setStopStay(a, b, c) {
  if (c !== undefined) {
    const f = findStop(a, b);
    if (!f || !f.stop) return;
    f.stop.stayMin = Number(c);
    save();
    if (modalSpotId === b && !document.getElementById('spotModal').classList.contains('hidden')) {
      openSpotModal(a, b);
    }
    toast(`⏱️ Updated stay to ${c} min`);
  } else {
    const d = getDay();
    if (d && d.stops[a]) {
      d.stops[a].stayMin = Number(b);
      save();
    }
  }
}
function setStopNote(i, v) { getDay().stops[i].note = v; save(); }
function toggleStopDone(i) { const s = getDay().stops[i]; s.done = !s.done; save(); }
function addBlankStop() {
  const center = pendingLatLng || (map ? map.getCenter() : { lat: 52, lng: -116 });
  insertStop({ id: 'blank_' + Date.now(), name: 'New stop', lat: +center.lat.toFixed(6), lng: +center.lng.toFixed(6), priority: 'nice', stayMin: 30 });
  pendingLatLng = null;
  save();
}

function renderDayCards() {
  document.getElementById('dayCards').innerHTML = S.days.filter(d => !/Sep 25|Sep 30/.test(d.date)).map(d => {
    const tl = computeDayTimeline(d);
    const extra = S.attractions.filter(a => a.type === 'paid' && a.day === d.date && a.selected).reduce((s, a) => s + a.time, 0);
    const pct = Math.min(130, ((tl.usedMin + extra * 60) / tl.availableMin) * 100);
    const label = pct > 100 ? 'OVERLOADED' : pct > 85 ? 'PACKED' : 'COMFORTABLE';
    const cl = pct > 100 ? 'warn' : '';
    const cuts = d.stops.filter(s => s.priority === 'cut').map(s => s.name).join(' • ') || 'None';
    const sun = SUN[d.date];
    return `<div class="card" onclick="chooseDay('${d.date}')" ondblclick="openDayGuide('${d.date}')" style="cursor:pointer;" title="Click for map • Double-click for overview"><div class="row"><div><div class="date">${d.date}</div><h3>${escapeHtml(d.label)}</h3></div><span class="badge ${pct > 85 ? 'warn' : 'must'}">${label}</span></div><div class="date">Start ${escapeHtml(d.start)} → ~${tl.finishTime.display} • ${tl.totalDistKm} km${sun ? ` • sunset ${sun.set}` : ''}</div><div class="progress" style="margin:9px 0"><i style="width:${Math.min(100, pct)}%;background:${pct > 100 ? 'var(--bad)' : pct > 85 ? 'var(--warn)' : 'var(--ok)'}"></i></div><div class="note ${cl}"><b>Cut first:</b> ${escapeHtml(cuts)}</div><div class="actions" style="margin-top:8px"><button class="btn small" onclick="event.stopPropagation();chooseDay('${d.date}')">Show on map</button><button class="btn primary small" onclick="event.stopPropagation();openDayGuide('${d.date}')">Day overview</button></div></div>`;
  }).join('');
}

function bookingEstimate(b) {
  if ((b.id === 'outbound' || b.id === 'return') && S.costs.flightLocked) return 0;
  if (b.id === 'outbound') return S.costs.flight === 'mixed' ? 477 : 702;
  if (b.id === 'return') return 651;
  if (b.id === 'rental') return Number(S.costs.rental || 0);
  const hm = { h25: 'Sep 25', h26: 'Sep 26', h27: 'Sep 27', h28: 'Sep 28', h29: 'Sep 29' };
  if (hm[b.id]) return Number(S.hotels[hm[b.id]].price || 0);
  return b.estimate;
}
function renderBookings() {
  const statuses = ['Not started', 'Ready to book', 'Decide', 'Waiting window', 'Booked', 'Paid', 'Done', 'Skip'];
  document.getElementById('bookingRows').innerHTML = S.bookings.map((b, i) => {
    const lockedFlight = b.locked && b.bookingGroup === 'westjet-flights';
    const lockedRental = b.locked && b.bookingGroup === 'ascent-rental';
    const lockedParking = b.locked && b.bookingGroup === 'spothero-parking';
    const lockedHotel = b.locked && /^hotel-/.test(b.bookingGroup || '');
    const lockedPark = b.locked && b.bookingGroup === 'parks-canada-pass';
    const noHotel = b.locked && b.bookingGroup === 'no-hotel';
    const lockedBooking = lockedFlight || lockedRental || lockedParking || lockedHotel || lockedPark || noHotel;

    let statusCell;
    if (lockedFlight || lockedParking || lockedPark || (lockedHotel && b.status === 'Paid')) statusCell = '<span class="badge must">PAID • LOCKED</span>';
    else if (lockedRental || lockedHotel) statusCell = '<span class="badge must">BOOKED • LOCKED</span>';
    else if (noHotel) statusCell = '<span class="badge">NO HOTEL • LOCKED</span>';
    else statusCell = `<select class="select" onchange="updateBooking(${i},'status',this.value)">${statuses.map(x => `<option ${b.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;

    let estimateCell;
    if (lockedFlight) estimateCell = b.id === 'outbound' ? '<b>C$966.63 total</b>' : '<span class="date">included</span>';
    else if (lockedRental) estimateCell = '<b>C$403.74 total</b><small style="display:block;color:var(--muted)">C$371.30 due at pickup</small>';
    else if (lockedParking) estimateCell = '<b>C$51.74 paid</b>';
    else if (b.id === 'h26' && lockedHotel) estimateCell = '<b>C$301.28 paid</b>';
    else if (b.id === 'h27' && lockedHotel) estimateCell = '<b>C$429.07 total</b><small style="display:block;color:var(--muted)">2 nights • due at property</small>';
    else if (b.id === 'h28' && lockedHotel) estimateCell = '<span class="date">included</span>';
    else if (b.id === 'h29' && lockedHotel) estimateCell = '<b>C$171.42 paid</b>';
    else if (noHotel) estimateCell = '<b>C$0</b>';
    else estimateCell = money(bookingEstimate(b));

    let actualCell;
    if (lockedFlight) actualCell = '<span class="date">combined fare</span>';
    else if (lockedRental) actualCell = '<b>C$32.44 paid</b>';
    else if (lockedParking) actualCell = '<b>C$51.74</b>';
    else if (b.id === 'h26' && lockedHotel) actualCell = '<b>C$301.28</b>';
    else if (b.id === 'h27' && lockedHotel) actualCell = '<span class="date">due at property</span>';
    else if (b.id === 'h28' && lockedHotel) actualCell = '<span class="date">same reservation</span>';
    else if (b.id === 'h29' && lockedHotel) actualCell = '<b>C$171.42</b>';
    else if (noHotel) actualCell = '<span class="date">—</span>';
    else actualCell = `<input class="input" type="number" value="${b.actual || ''}" placeholder="0" onchange="updateBooking(${i},'actual',this.value)">`;

    const confirmCell = lockedBooking
      ? `<span class="date">${lockedRental ? 'confirmation in voucher' : (lockedParking ? 'stored in SpotHero pass' : (lockedHotel ? 'stored in Hotels.com email' : (noHotel ? 'intentional' : 'Booked')))}</span>`
      : `<input class="input" value="${escapeAttr(b.confirm || '')}" placeholder="Confirmation #" onchange="updateBooking(${i},'confirm',this.value)">`;

    const actionLabel = lockedRental ? 'Call supplier' : (lockedParking ? 'SpotHero' : (lockedHotel ? 'Hotel' : 'Airline'));
    const action = b.link ? `<a class="btn small" href="${b.link}" target="_blank">${actionLabel}</a>` : '<span></span>';
    return `<div class="bookrow ${lockedBooking ? 'locked-booking' : ''}"><div>${b.p}</div><div><b>${escapeHtml(b.item)}</b>${b.detail ? `<small style="display:block;color:var(--muted);margin-top:2px">${escapeHtml(b.detail)}</small>` : ''}</div>${statusCell}<div>${estimateCell}</div>${actualCell}${confirmCell}${action}</div>`;
  }).join('');
}
function updateBooking(i, k, v) {
  if (S.bookings[i] && S.bookings[i].locked) {
    toast('This booking is locked.');
    renderBookings();
    return;
  }
  S.bookings[i][k] = v;
  save();
}
function resetBookings() {
  if (confirm('Reset booking statuses, actual paid amounts and confirmations? Locked flights, rental, YYZ parking, park pass and booked hotels will stay fixed.')) {
    S.bookings = deepClone(BASE.bookings);
    applyLockedWestJetFlights(S);
    applyLockedAscentRental(S);
    applyLockedSpotHeroParking(S);
    applyLockedHotelBookings(S);
    applyLockedParkPass(S);
    save();
  }
}

function renderHotels() {
  document.getElementById('hotelGrid').innerHTML = Object.entries(S.hotels).map(([date, h]) => {
    const title = h.noHotel ? 'No hotel' : (date === 'Sep 27' || date === 'Sep 28' ? 'Hinton' : (date === 'Sep 29' ? 'Calgary Airport' : 'Cochrane'));
    const badge = h.noHotel ? 'NO HOTEL' : (h.locked ? 'BOOKED' : '2 QUEENS');
    const options = h.options.map((o, i) => {
      const clickable = h.locked ? '' : `onclick="chooseHotel('${date}',${i})"`;
      const link = o[3] ? `<a class="btn small" style="margin-top:7px" href="${o[3]}" target="_blank" onclick="event.stopPropagation()">${h.locked ? 'Hotel' : 'Verify exact room'}</a>` : '';
      return `<div class="card hotelopt ${h.choice === i ? 'sel' : ''}" style="margin-top:8px" ${clickable}><div class="row"><b>${escapeHtml(o[0])}</b><span>${h.choice === i ? '✓' : ''}</span></div><small>${escapeHtml(o[1])}<br>${escapeHtml(o[2])}</small>${link}</div>`;
    }).join('');
    const price = h.locked
      ? `<div class="hotelprice"><span>${escapeHtml(h.priceLabel || 'Booked total')}</span><b>${h.noHotel ? 'C$0' : (h.includedWith ? 'Included' : money(h.price))}</b></div>`
      : `<div class="hotelprice"><span>Final/estimated night total</span><input class="input" type="number" value="${h.price}" onchange="setHotelPrice('${date}',this.value)"></div>`;
    return `<div class="card"><div class="row"><div><div class="date">${date}</div><h3>${title}</h3></div><span class="badge ${h.locked && !h.noHotel ? 'must' : ''}">${badge}</span></div>${options}${price}</div>`;
  }).join('');
}
function chooseHotel(date, i) {
  if (S.hotels[date] && S.hotels[date].locked) { toast('This hotel choice is booked and locked.'); renderHotels(); return; }
  S.hotels[date].choice = i;
  const opt = S.hotels[date].options[i];
  const mapIds = { 'Sep 25': 'h25', 'Sep 26': 'h26', 'Sep 27': 'h27', 'Sep 28': 'h28', 'Sep 29': 'h29' };
  const b = S.bookings.find(x => x.id === mapIds[date]);
  if (b) { b.item = `Hotel ${date} — ${opt[0]}`; b.link = opt[3]; }
  const day = S.days.find(d => d.date === date);
  if (day && day.hotel) day.hotel.name = opt[0];
  save();
}
function setHotelPrice(date, v) { if (S.hotels[date] && S.hotels[date].locked) { toast('This hotel price is booked and locked.'); renderHotels(); return; } S.hotels[date].price = Number(v || 0); save(); }

function filterAtt(a) {
  if (filter === 'all') return true;
  if (filter === 'paid' || filter === 'free') return a.type === filter;
  if (filter === 'must') return /MUST|RECOMMENDED|WEATHER|TIME|DO/.test(a.rec);
  if (filter === 'skip') return /SKIP/.test(a.rec);
  return true;
}
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; renderAttractions(); });
function renderAttractions() {
  document.getElementById('attGrid').innerHTML = S.attractions.filter(filterAtt).map(a => `<div class="card att ${a.type === 'free' ? 'free' : ''} ${a.type === 'paid' && a.selected ? 'selected' : ''}"><div class="row"><span class="badge">${a.day}</span><span class="badge">${a.rating}</span></div><h3>${escapeHtml(a.name)}</h3><div class="cost">${a.type === 'free' ? '$0' : money(a.cost)}</div><div class="date">~${a.time}h practical time</div><p>${escapeHtml(a.desc)}</p><p><b>If skipped:</b> ${escapeHtml(a.skip)}</p><div class="rec">${escapeHtml(a.rec)}</div><div class="row" style="margin-top:9px"><a class="btn small" href="${a.link}" target="_blank">Details</a>${a.type === 'paid' ? `<label class="switch"><input type="checkbox" ${a.selected ? 'checked' : ''} onchange="toggleAtt('${a.id}',this.checked)"><span class="slider"></span></label>` : '<span class="badge must">IN PLAN</span>'}</div></div>`).join('');
}
const PAID_CRUISE_IDS = ['maligneCruise', 'minnewankaCruise'];
function setPaidAttractionSelection(id, selected) {
  const a = S.attractions.find(x => x.id === id);
  if (!a) return;
  if (selected && PAID_CRUISE_IDS.includes(id)) {
    S.attractions.forEach(other => {
      if (other.id !== id && PAID_CRUISE_IDS.includes(other.id)) other.selected = false;
    });
  }
  a.selected = !!selected;
}
function toggleAtt(id, v) {
  setPaidAttractionSelection(id, v);
  if (id === 'maligneCruise' && S.decisions) S.decisions.maligne = v ? 'book' : 'skip';
  if (id === 'minnewankaCruise' && v && S.decisions) S.decisions.maligne = 'skip';
  if (id === 'maligneCruise') {
    const st = S.days.find(d => d.date === 'Sep 28')?.stops.find(s => s.id === 'maligne');
    if (st) st.stayMin = v ? 150 : 60;
  }
  if (id === 'icefieldAdventure') {
    const st = S.days.find(d => d.date === 'Sep 29')?.stops.find(s => s.id === 'icefield29');
    if (st) st.stayMin = v ? 150 : 60;
  }
  if (id === 'banffGondola') {
    const day = S.days.find(d => d.date === 'Sep 26');
    if (day) {
      let st = day.stops.find(s => s.id === 'gondola');
      if (!st && v) {
        st = { id: 'gondola', name: 'Banff Gondola — Sulphur Mountain (weather-gated MUST)', lat: 51.14821, lng: -115.55614, priority: 'must', stayMin: 120, note: 'Strong yes when summit visibility is good. Check forecast/webcam 24–48h before; skip only for poor cloud/visibility.' };
        const johnstonIndex = day.stops.findIndex(s => s.id === 'johnston');
        day.stops.splice(johnstonIndex >= 0 ? johnstonIndex : day.stops.length - 1, 0, st);
      }
      if (st) st.priority = v ? 'must' : 'cut';
    }
    if (S.decisions) S.decisions.gondola = v ? 'yes' : 'no';
  }
  save();
}

function renderBudget() {
  const selectedPaid = S.attractions.filter(a => a.type === 'paid' && a.selected);
  const paidRows = selectedPaid.length
    ? selectedPaid.map(a => ['Paid attraction • ' + a.name, Number(a.cost || 0)])
    : [['Paid attractions', 0]];
  const rows = [['Flights', flightTotal()], ['Hotels', hotelTotal()], ['Rental car • confirmed total', S.costs.rental], ['Park admission', S.costs.park], ['Moraine/Louise shuttle', S.costs.shuttle], ['Fuel + parking', S.costs.fuel], ['Food', S.costs.food], ...paidRows, ['Misc', S.costs.misc]];
  document.getElementById('budgetRows').innerHTML = rows.map(x => `<tr><td>${x[0]}</td><td>${money(x[1])}</td></tr>`).join('');
  document.getElementById('budgetTotal').textContent = money(total());
  document.getElementById('budgetPP').textContent = money(total() / Math.max(1, S.settings.travellers));
  document.getElementById('flightChoice').value = S.costs.flight;
  document.getElementById('flightChoice').disabled = !!S.costs.flightLocked;
  document.getElementById('rentalCost').value = S.costs.rental;
  document.getElementById('rentalCost').disabled = !!S.costs.rentalLocked;
  document.getElementById('fuelCost').value = S.costs.fuel;
  document.getElementById('miscCost').value = S.costs.misc;
  const food = document.getElementById('foodCost');
  if (food) food.value = S.costs.food;
  const hint = document.getElementById('fuelHint');
  if (hint) hint.textContent = `Route currently ~${tripDriveKm().toFixed(0)} km. Rental is a standard gasoline sedan (Kia K4 or similar); fuel budget remains conservative until the exact vehicle is assigned.`;
  const bh = document.getElementById('budgetHint');
  if (bh) bh.textContent = `Actuals entered in Book: ${money(paid())}. Remaining vs estimate: ${money(Math.max(0, total() - paid()))}.` + (S.costs.rentalLocked ? ' Rental confirmed total is C$403.74: C$32.44 already paid and C$371.30 due at pickup. The refundable C$1,000 deposit is not a trip cost; a possible 2.4% credit-card fee is not included.' : '') + (S.costs.yyzParkingLocked ? ' SpotHero YYZ parking is paid at C$51.74 and is already covered inside the Fuel + parking budget rather than added again.' : '');
}
document.getElementById('flightChoice').onchange = e => { if (S.costs.flightLocked) { e.target.value = 'booked-westjet'; toast('Flights are booked and locked.'); return; } S.costs.flight = e.target.value; save(); };
document.getElementById('rentalCost').onchange = e => { if (S.costs.rentalLocked) { e.target.value = S.costs.rental; toast('Rental is booked and locked.'); return; } S.costs.rental = Number(e.target.value || 0); save(); };
document.getElementById('fuelCost').onchange = e => { S.costs.fuel = Number(e.target.value || 0); save(); };
document.getElementById('miscCost').onchange = e => { S.costs.misc = Number(e.target.value || 0); save(); };
const foodEl = document.getElementById('foodCost');
if (foodEl) foodEl.onchange = e => { S.costs.food = Number(e.target.value || 0); save(); };

function renderHero() {
  const phase = tripPhase();
  const startMs = daysUntil(S.settings.startDate);
  const shuttleMs = new Date('2026-09-25T08:00:00-06:00') - Date.now();
  const tot = total();
  const pp = tot / Math.max(1, S.settings.travellers);
  const rdy = ready();
  const rdyPct = Math.round(rdy * 100);

  // Top Nav quick stats
  const navCountdown = document.getElementById('navCountdown');
  if (navCountdown) {
    navCountdown.textContent = phase === 'before' ? `${fmtCountdown(startMs)} to go` : (phase === 'during' ? 'On trip!' : 'Trip done');
  }
  const navCost = document.getElementById('navCost');
  if (navCost) navCost.textContent = money(tot);
  const navCostPP = document.getElementById('navCostPP');
  if (navCostPP) navCostPP.textContent = `(${money(pp)}/p)`;
  const navReady = document.getElementById('navReady');
  if (navReady) navReady.textContent = `${rdyPct}% locked`;
  const navReadyBar = document.getElementById('navReadyBar');
  if (navReadyBar) navReadyBar.style.width = `${rdyPct}%`;

  // Plan view hero metrics
  const heroTotal = document.getElementById('heroTotal');
  if (heroTotal) heroTotal.textContent = money(tot);
  const heroPP = document.getElementById('heroPP');
  if (heroPP) heroPP.textContent = money(pp);
  const heroReady = document.getElementById('heroReady');
  if (heroReady) heroReady.textContent = rdyPct + '%';
  const readyBar = document.getElementById('readyBar');
  if (readyBar) readyBar.style.width = (rdy * 100) + '%';
  
  const hoursLabel = document.getElementById('heroHoursLabel');
  const hoursVal = document.getElementById('heroHours');
  if (hoursLabel && hoursVal) {
    if (phase === 'before') {
      hoursLabel.textContent = 'Trip starts in';
      hoursVal.textContent = fmtCountdown(startMs);
    } else if (phase === 'during') {
      hoursLabel.textContent = 'Today';
      hoursVal.textContent = todayLabel() || 'On trip';
    } else {
      hoursLabel.textContent = 'Paid attraction time';
      hoursVal.textContent = attractionHours().toFixed(1) + 'h';
    }
  }
  
  const title = document.getElementById('heroTitle');
  const lead = document.getElementById('heroLead');
  if (title && lead) {
    if (phase === 'before') {
      title.textContent = `${fmtCountdown(startMs)} to go. Book the hard things first.`;
      lead.textContent = shuttleMs > 0 && !isBooked('shuttle')
        ? `The Moraine/Louise shuttle rolling window opens ${fmtCountdown(shuttleMs)} (Sep 25, 8:00 AM Mountain / 10:00 AM Toronto). Hotels, flights and the rental should already be in motion.`
        : 'Use Plan for the remaining lock-ins, Map to shape each day, Field for fuel/cell/emergency, Pack before you leave.';
    } else if (phase === 'during') {
      const d = S.days.find(x => x.date === todayLabel()) || getDay();
      title.textContent = `Today: ${d.label}`;
      lead.textContent = d.note || 'Follow the day timeline, mark stops done as you go, and cut the yellow ones first if you slip.';
    } else {
      title.textContent = 'Trip complete — keep the notes.';
      lead.textContent = 'Export JSON or print if you want a copy of what you actually did.';
    }
  }

  const chips = [
    `${S.settings.startDate} → ${S.settings.endDate}`,
    `${S.settings.travellers} adults`,
    '1 room • 2 queen beds',
    '4 park days',
    isBooked('shuttle') ? 'Shuttle booked' : 'Shuttle not booked',
    'Saved in this browser'
  ];
  const chipsEl = document.getElementById('heroChips');
  if (chipsEl) {
    chipsEl.innerHTML = chips.map((c, i) => `<span class="chip ${!isBooked('shuttle') && i === 4 ? 'pulse' : ''}">${escapeHtml(c)}</span>`).join('');
  }
  const brandSub = document.getElementById('brandSub');
  if (brandSub) {
    brandSub.textContent = `${S.settings.startDate} → ${S.settings.endDate} • ${S.settings.travellers} adults`;
  }
}

function openTripHealthModal() {
  renderDayCards();
  const m = document.getElementById('tripHealthModal');
  if (m) m.classList.remove('hidden');
}
function closeTripHealthModal() {
  const m = document.getElementById('tripHealthModal');
  if (m) m.classList.add('hidden');
}

function renderSettings() {
  document.getElementById('tripTitleInput').value = S.settings.title;
  document.getElementById('travellersInput').value = S.settings.travellers;
  document.getElementById('startDateInput').value = S.settings.startDate;
  document.getElementById('endDateInput').value = S.settings.endDate;
  document.getElementById('globalNoteInput').value = S.settings.globalNote;
  const l = document.getElementById('lunchInput');
  const b = document.getElementById('bufferInput');
  if (l) l.value = S.settings.lunchMin;
  if (b) b.value = S.settings.bufferMin;
  refreshRawJson();
}
function saveSettings() {
  S.settings.title = document.getElementById('tripTitleInput').value;
  S.settings.travellers = Number(document.getElementById('travellersInput').value || 3);
  S.settings.startDate = document.getElementById('startDateInput').value;
  S.settings.endDate = document.getElementById('endDateInput').value;
  S.settings.globalNote = document.getElementById('globalNoteInput').value;
  const l = document.getElementById('lunchInput');
  const b = document.getElementById('bufferInput');
  if (l) S.settings.lunchMin = Number(l.value || 0);
  if (b) S.settings.bufferMin = Number(b.value || 0);
  save();
  toast('Settings saved');
}
function refreshRawJson() { document.getElementById('rawJson').value = JSON.stringify(S, null, 2); }
function applyRawJson() {
  try {
    const x = JSON.parse(document.getElementById('rawJson').value);
    S = mergeBase(deepClone(S || BASE), x);
    persist();
    renderAll();
    toast('✅ Trip data applied successfully!');
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

function planText() {
  const chosen = S.attractions.filter(a => a.type === 'paid' && a.selected).map(a => a.name);
  const hotels = Object.entries(S.hotels).map(([d, h]) => `• ${d}: ${h.options[h.choice][0]} — ${money(h.price)}`).join('\n');
  const days = S.days.map(d => {
    const tl = computeDayTimeline(d);
    return `• ${d.date} ${d.start} → ~${tl.finishTime.display}: ${d.label}\n  ${d.stops.map(s => s.name).join(' → ')}`;
  }).join('\n');
  return `${S.settings.title.toUpperCase()}\n${S.settings.startDate} → ${S.settings.endDate} • ${S.settings.travellers} adults\n\nBUDGET\nSelected estimate: ${money(total())}\nPer person: ${money(total() / Math.max(1, S.settings.travellers))}\nActual paid entered: ${money(paid())}\nBooking readiness: ${Math.round(ready() * 100)}%\n\nHOTELS\n${hotels}\n\nPAID ATTRACTIONS SELECTED\n${chosen.length ? chosen.map(x => '• ' + x).join('\n') : '• None'}\n\nITINERARY\n${days}\n\nREQUIRED ACCESS\n• Parks Canada Family/Group Day Pass: PAID C$73.50 for 3 days. Print/display receipt; verify printed dates cover any Sep 29 park time after 4:00 PM.\n• Lake Louise / Moraine Parks Canada shuttle (book Sep 25 8:00 AM MDT rolling window)\n\nPLANNING NOTE\n${S.settings.globalNote}`;
}
function renderSummary() { document.getElementById('finalSummary').textContent = planText(); }
function exportState() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = 'banff-jasper-plan.json'; a.click(); URL.revokeObjectURL(u);
}
function copyFullPlan() { navigator.clipboard.writeText(planText()).then(() => toast('Plan copied')).catch(() => toast('Could not copy')); }
function copyDayText() {
  const d = getDay();
  const tl = computeDayTimeline(d);
  const lines = [`${d.date} ${d.label}`, `Start ${d.start} → finish ~${tl.finishTime.display} • ${tl.totalDistKm} km`, d.note || '', ...tl.items.map(it => `${it.arrTime.display}  ${it.stop.name}  (${it.stayMin}m)${it.prevLeg ? `  ← ${it.prevLeg.distKm} km` : ''}`), googleRouteUrl(d.stops)];
  navigator.clipboard.writeText(lines.filter(Boolean).join('\n')).then(() => toast('Day copied')).catch(() => toast('Could not copy'));
}
function exportICS() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rockies Trip//Planner//EN'];
  S.days.forEach(d => {
    const iso = (DATE_ISO[d.date] || S.settings.startDate).replace(/-/g, '');
    const start = parseTimeToMinutes(d.start);
    const tl = computeDayTimeline(d);
    const sH = String(Math.floor(start / 60)).padStart(2, '0') + String(start % 60).padStart(2, '0') + '00';
    const eH = String(Math.floor(tl.finishMin / 60) % 24).padStart(2, '0') + String(Math.round(tl.finishMin) % 60).padStart(2, '0') + '00';
    const desc = d.stops.map(s => s.name).join(' → ').replace(/,/g, '\\,');
    lines.push('BEGIN:VEVENT', `DTSTART;TZID=America/Edmonton:${iso}T${sH}`, `DTEND;TZID=America/Edmonton:${iso}T${eH}`, `SUMMARY:${d.date} ${d.label}`, `DESCRIPTION:${desc}`, 'END:VEVENT');
  });
lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = 'banff-jasper-days.ics'; a.click(); URL.revokeObjectURL(u);
}
document.getElementById('importFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { S = mergeBase(deepClone(BASE), JSON.parse(r.result)); applyLockedWestJetFlights(S); applyLockedAscentRental(S); applyLockedSpotHeroParking(S); applyLockedHotelBookings(S); applyLockedParkPass(S); persist(); renderAll(); toast('Trip imported. Locked bookings were preserved.'); } catch (x) { alert('Could not import file.'); } };
  r.readAsText(f);
};
function resetAll() {
  if (confirm('Reset all itinerary edits, markers, hotels, attractions and booking progress?')) {
    S = deepClone(BASE);
    localStorage.removeItem(STORE_V3);
    localStorage.removeItem(STORE_V4);
    undoStack = [];
    persist();
    renderAll();
    fitWholeTrip();
  }
}

function renderOverview() {
  const d = S.days.find(x => x.date === overviewDay) || S.days[0];
  overviewDay = d.date;
  const tl = computeDayTimeline(d);
  const dayList = document.getElementById('overviewDayList');
  if (dayList) {
    dayList.innerHTML = S.days.map(x => {
      const xTl = computeDayTimeline(x);
      const startHotel = x.stops[0] ? x.stops[0].name.replace(/\s*\(Depart.*?\)/i, '') : 'Start';
      const endHotel = x.stops[x.stops.length - 1] ? x.stops[x.stops.length - 1].name.replace(/\s*\(Sleep.*?\)/i, '') : x.sleep;
      return `<button class="overview-daycard ${x.date === overviewDay ? 'active' : ''}" onclick="chooseOverviewDay('${x.date}')">
        <div class="daycard-header"><span class="badge ${x.date === overviewDay ? 'must' : 'nice'}">${x.date}</span><span class="date">${x.stops.length} stops</span></div>
        <h4>${escapeHtml(x.label)}</h4>
        <div class="overview-meta">🚗 <b>${xTl.totalDistKm} km</b> • ~<b>${formatDuration(xTl.totalDriveMin)}</b> drive</div>
        <div class="overview-meta" style="margin-top:2px;font-size:11px;color:#8ba4b6;">🏨 ${escapeHtml(startHotel)} → ${escapeHtml(endHotel)}</div>
      </button>`;
    }).join('');
  }
  const badge = document.getElementById('overviewDateBadge');
  if (badge) badge.textContent = `${d.date} • Start ${d.start} → Finish ~${tl.finishTime.display}`;
  const title = document.getElementById('overviewTitle');
  if (title) title.textContent = d.label;
  const note = document.getElementById('overviewNote');
  if (note) note.textContent = d.note || '';
  const chips = document.getElementById('overviewChips');
  const sun = SUN[d.date];
  if (chips) chips.innerHTML = [
    `🚗 ${tl.totalDistKm} km driving (~${formatDuration(tl.totalDriveMin)})`,
    `🏔️ ${formatDuration(tl.totalStayMin)} sightseeing & dwell`,
    tl.lunchMin ? `🥪 ${tl.lunchMin}m lunch @ ${tl.lunchAt || '12:30'}` : '',
    sun ? `☀️ Daylight: ${sun.rise}–${sun.set}` : '',
    '🏨 Sleep: ' + d.sleep,
    d.stops.length + ' stops' + (tl.cutCount ? ` (${tl.cutCount} cut/bypassed)` : ''),
    tl.afterSunset ? '⚠️ Finishes after sunset' : '✅ Day ends before dark'
  ].filter(Boolean).map(x => `<span class="chip">${escapeHtml(x)}</span>`).join('');
  
  const grid = document.getElementById('overviewSpotGrid');
  if (grid) {
    grid.innerHTML = tl.items.map((it, i) => {
      const st = it.stop;
      const inf = getSpotInfo(st);
      const isHotel = st.isHotel || /hotel|transit \/ overnight|Airport/i.test(inf.tag || '');
      const isCut = it.isCut;
      const badgePills = [];
      if (inf.rating) badgePills.push(`<span class="rating-pill">⭐ ${escapeHtml(inf.rating)}</span>`);
      if (inf.parkingRating) badgePills.push(`<span class="badge-pill">🚗 ${escapeHtml(inf.parkingRating)}</span>`);
      if (inf.effort) badgePills.push(`<span class="badge-pill ${inf.effort.toLowerCase().includes('easy') ? 'easy' : 'warn'}">🥾 ${escapeHtml(inf.effort.split('(')[0].trim())}</span>`);
      if (inf.cell) badgePills.push(`<span class="badge-pill ${inf.cell.toLowerCase().includes('no') ? 'hot' : 'blue'}">📶 ${escapeHtml(inf.cell)}</span>`);
      
      const timingBtns = (inf.timingOptions || [{ label: '15m', min: 15 }, { label: '30m', min: 30 }, { label: '60m', min: 60 }]).slice(0, 3).map(opt => {
        const isActive = it.plannedStayMin === opt.min;
        return `<button class="dwell-btn ${isActive ? 'active' : ''}" onclick="event.stopPropagation();setStopStay('${d.date}','${st.id}',${opt.min})">${opt.min}m</button>`;
      }).join('');

      return `<article class="card spot-card ${st.done ? 'done' : ''} ${isHotel ? 'hotel-card' : ''} ${isCut ? 'is-cut' : ''}" onclick="openSpotModal('${d.date}','${st.id}')">
        <div class="spot-img" id="thumb_${st.id}"><div class="fallback">${isHotel ? '🏨 ' + escapeHtml(inf.title) : 'Loading photo…'}</div></div>
        <div class="spot-body">
          <div class="row">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="badge ${isHotel ? 'hotel' : st.priority}">${isHotel ? 'LODGING BASE' : (isCut ? 'CUT (BYPASSED)' : st.priority.toUpperCase())}</span>
              <span class="rating-pill">⭐ ${inf.rating || '8.5/10'}</span>
            </div>
            <span class="date">${isHotel ? (i === 0 ? '🚩 Day Departure' : '🏁 Night Base') : tripStopCode(d, st)}</span>
          </div>
          <h3>${escapeHtml(inf.title)}</h3>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin:5px 0;">${badgePills.join('')}</div>
          <p style="margin:4px 0 8px;">${escapeHtml(inf.desc)}</p>
          ${inf.reviews ? `<div class="review-card" style="margin:6px 0;padding:6px 9px;font-size:11px;"><b>Visitor Intel:</b> <span class="review-quote">${escapeHtml(inf.reviews)}</span></div>` : ''}
          ${isCut ? `
            <div class="overview-schedule" style="border-color:#7a5a22;background:#181308;">
              <div style="color:#ffd768;font-size:11px;font-weight:750;">✂️ Bypassed from active route & timeline</div>
              <div class="dwell" style="color:#b09b68;">Excluded from drive km and timeline. Set priority to Must or Nice to route to this spot.</div>
            </div>
          ` : `
            <div class="overview-schedule">
              <div class="times"><span>🕒 Arr: <b>${it.arrTime.display}</b></span><span>🚪 Dep: <b>${it.depTime.display}</b></span></div>
              <div class="dwell" style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <span>Est. Stay: <b>${it.stayMin} min</b></span>
                <div class="dwell-picker" style="margin:0;">${timingBtns}</div>
              </div>
              ${it.prevLeg ? `<div class="overview-drive-tag">🚗 Drive: <b>${it.prevLeg.distKm} km</b> • ~<b>${it.prevLeg.durText}</b> from ${escapeHtml(it.prevLeg.fromName || 'prev')}</div>` : '<div class="overview-drive-tag">🚩 Starting departure point</div>'}
            </div>
          `}
          <div class="spot-actions">
            <button class="btn small primary" onclick="event.stopPropagation();openSpotModal('${d.date}','${st.id}')">Details & Intel ↗</button>
            <a class="quick-map" href="${googleMapsForStop(st)}" target="_blank" onclick="event.stopPropagation()">Google Maps ↗</a>
          </div>
        </div>
      </article>`;
    }).join('');
  }
  hydrateDayThumbs(d);
}
function chooseOverviewDay(date) { overviewDay = date; renderOverview(); }
function switchDayAndGoToMap(date) { chooseDay(date); }
function openGoogleRouteForOverview() {
  const d = S.days.find(x => x.date === overviewDay) || getDay();
  if (!d || !d.stops.length) return;
  window.open(googleRouteUrl(d.stops), '_blank');
}

function openSpotModal(date, id) {
  const f = findStop(date, id);
  if (!f || !f.stop) return;
  const { day, stop, index } = f, inf = getSpotInfo(stop);
  modalSpotId = id;
  overviewDay = date;
  const tl = computeDayTimeline(day);
  const it = tl.items[index] || { arrTime: { display: '--' }, depTime: { display: '--' }, stayMin: getDefaultStayMin(stop), prevLeg: null };
  document.getElementById('modalDayLabel').textContent = `${day.date} • Stop ${index + 1} of ${day.stops.length} (${stop.priority.toUpperCase()})`;
  document.getElementById('modalTitle').textContent = inf.title;

  const mobileModal = window.matchMedia('(max-width: 768px)').matches;
  const headerMeta = document.getElementById('modalHeaderMeta');
  if (headerMeta) {
    const routeState = it.isCut ? 'CUT' : stop.priority.toUpperCase();
    headerMeta.textContent = `${routeState} • ${it.arrTime.display}–${it.depTime.display} • ${it.stayMin} min`;
  }
  const essentials = document.getElementById('modalEssentials');
  if (essentials) essentials.open = !mobileModal;
  const essentialsSummary = document.getElementById('modalEssentialsSummary');
  if (essentialsSummary) {
    const parts = [];
    if (inf.rating) parts.push('⭐ ' + inf.rating);
    if (inf.parkingRating) parts.push('🚗 ' + inf.parkingRating);
    if (inf.cell) parts.push('📶 ' + inf.cell);
    essentialsSummary.textContent = parts.join(' • ');
  }

  // Render Logistics Badges
  const logEl = document.getElementById('modalLogistics');
  if (logEl) {
    const badges = [];
    if (inf.rating) badges.push(`<span class="rating-pill" style="font-size:12px;padding:3px 9px;">⭐ Recommendation: <b>${escapeHtml(inf.rating)}</b></span>`);
    if (inf.parkingRating) badges.push(`<span class="badge-pill">🚗 Parking: <b>${escapeHtml(inf.parkingRating)}</b></span>`);
    if (inf.bestWindow) badges.push(`<span class="badge-pill blue">🕒 Best: <b>${escapeHtml(inf.bestWindow)}</b></span>`);
    if (inf.restrooms) badges.push(`<span class="badge-pill">🚻 <b>${escapeHtml(inf.restrooms)}</b></span>`);
    if (inf.cell) badges.push(`<span class="badge-pill ${inf.cell.toLowerCase().includes('no') ? 'hot' : 'blue'}">📶 Cell: <b>${escapeHtml(inf.cell)}</b></span>`);
    if (inf.effort) badges.push(`<span class="badge-pill ${inf.effort.toLowerCase().includes('easy') ? 'easy' : 'warn'}">🥾 Effort: <b>${escapeHtml(inf.effort)}</b></span>`);
    logEl.innerHTML = badges.join('');
  }

  // Render Dwell Options / Trail Depth Selector
  const dwellEl = document.getElementById('modalDwellControls');
  if (dwellEl) {
    const opts = inf.timingOptions || [
      { label: 'Quick View (15m)', min: 15 },
      { label: 'Standard (30m)', min: 30 },
      { label: 'Extended (60m)', min: 60 },
      { label: 'Deep Exploration (90m)', min: 90 }
    ];
    dwellEl.innerHTML = opts.map(opt => {
      const isActive = it.plannedStayMin === opt.min;
      return `<button class="dwell-btn ${isActive ? 'active' : ''}" onclick="setStopStay('${day.date}','${stop.id}',${opt.min})"><b>${opt.min} min</b> — ${escapeHtml(opt.label)}</button>`;
    }).join('') + `<button class="dwell-btn" onclick="const m=prompt('Enter custom stay minutes:', '${it.stayMin}');if(m)setStopStay('${day.date}','${stop.id}',Number(m))">Custom min ✏️</button>`;
  }

  // Render Visitor Reviews
  const revEl = document.getElementById('modalReviews');
  if (revEl) {
    revEl.innerHTML = inf.reviews
      ? `<b>💬 Traveler & Review Intel:</b><div class="review-quote">${escapeHtml(inf.reviews)}</div>`
      : `<b>💡 Essential Tip:</b><div class="review-quote">Follow park regulations, stay on marked trails, and keep bear spray accessible.</div>`;
  }

  document.getElementById('modalDescription').textContent = inf.desc + (stop.note ? `\n\nYour note: ${stop.note}` : '');
  document.getElementById('modalFacts').innerHTML = `
    <div class="fact"><small>Visitor Rating</small><b style="color:#ffd768;">⭐ ${inf.rating || '8.5/10'}</b></div>
    <div class="fact"><small>Status / Route</small><b>${it.isCut ? '<span style="color:#f0c36a;">✂️ Bypassed (Cut)</span>' : '<span style="color:#56c6a5;">Active Route</span>'}</b></div>
    <div class="fact"><small>Arrival Time</small><b style="color:#56c6a5;">🕒 ${it.arrTime.display}</b></div>
    <div class="fact"><small>Departure Time</small><b style="color:#56c6a5;">🚪 ${it.depTime.display}</b></div>
    <div class="fact"><small>Est. Time Spent</small><b>⏱️ ${it.stayMin} min <span style="font-size:10px;color:var(--muted)">(${escapeHtml(inf.time)})</span></b></div>
    <div class="fact"><small>Drive from Prev</small><b>${it.prevLeg ? '🚗 ' + it.prevLeg.distKm + ' km (~' + it.prevLeg.durText + ')' : (it.isCut ? 'Bypassed' : '🚩 Start point')}</b></div>
    <div class="fact"><small>Priority</small><b>${stop.priority.toUpperCase()}</b></div>
    <div class="fact"><small>Coordinates</small><b>${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</b></div>`;
  document.getElementById('modalDo').textContent = inf.todo;
  document.getElementById('modalCut').textContent = inf.cut;
  document.getElementById('modalParking').textContent = inf.parking;
  document.getElementById('modalTopActions').innerHTML = `
    <a class="btn primary small" href="${googleMapsForStop(stop)}" target="_blank">Open in Google Maps</a>
    <a class="btn small" href="${googleMapsDirectionsToStop(stop)}" target="_blank">Directions here</a>
    <a class="btn small" href="${inf.official}" target="_blank">Official / Info</a>`;
  document.getElementById('modalMapActions').innerHTML = `
    <a class="btn primary small" href="${googleMapsForStop(stop)}" target="_blank">Google Maps</a>
    <button class="btn small" onclick="closeSpotModal();switchDayAndGoToMap('${day.date}')">Edit on Map</button>`;
  const prev = day.stops[index - 1], next = day.stops[index + 1];
  const pb = document.getElementById('modalPrevBtn'), nb = document.getElementById('modalNextBtn');
  pb.disabled = !prev;
  nb.disabled = !next;
  pb.onclick = () => prev && openSpotModal(day.date, prev.id);
  nb.onclick = () => next && openSpotModal(day.date, next.id);
  pb.textContent = prev ? '← ' + getSpotInfo(prev).title : '← Previous';
  nb.textContent = next ? getSpotInfo(next).title + ' →' : 'Next →';
  renderModalPhotos(inf);
  const spotModal = document.getElementById('spotModal');
  spotModal.classList.remove('hidden');
  const modalBody = spotModal.querySelector('.modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  setTimeout(() => renderModalMiniMap(stop), 60);
}
function closeSpotModal() {
  document.getElementById('spotModal').classList.add('hidden');
  if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
}
async function renderModalPhotos(inf) {
  const grid = document.getElementById('modalPhotoGrid');
  grid.innerHTML = Array.from({ length: 4 }, () => '<div class="photo"><div class="pholder">Loading curated real location photo…</div></div>').join('');
  const curated = CURATED_COMMONS_FILES[inf._key] || [];
  document.getElementById('modalPhotoSource').innerHTML = curated.length
    ? 'Photos: hand-picked real images from Wikimedia Commons — no generated imagery.'
    : `Photos: real Wikimedia Commons results for <a class="info-link" target="_blank" href="${commonsSearchUrl(inf.photoQuery)}">${escapeHtml(inf.photoQuery)}</a>`;
  const photos = await getSpotPhotos(inf, 4);
  grid.innerHTML = (photos.length ? photos : [null, null, null, null]).map(p => p
    ? `<a class="photo" href="${p.source}" target="_blank"><img src="${p.src}" alt="${escapeAttr(inf.title)}" loading="lazy"><div class="photo-credit">${escapeHtml(p.artist || 'Wikimedia Commons')}${p.license ? ' • ' + escapeHtml(p.license) : ''}</div></a>`
    : `<div class="photo"><div class="pholder">No verified real photo loaded.<br>Use the source link instead.</div></div>`).join('');
}
function renderModalMiniMap(stop) {
  if (modalMiniMap) { modalMiniMap.remove(); modalMiniMap = null; }
  const el = document.getElementById('modalMiniMap');
  if (!el) return;
  modalMiniMap = L.map(el, { scrollWheelZoom: false }).setView([stop.lat, stop.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(modalMiniMap);
  L.marker([stop.lat, stop.lng]).addTo(modalMiniMap).bindPopup(`<b>${escapeHtml(stop.name)}</b><br><a href="${googleMapsForStop(stop)}" target="_blank">Open Google Maps</a>`).openPopup();
}
async function hydrateDayThumbs(d) {
  for (const st of d.stops) {
    const el = document.getElementById('thumb_' + st.id);
    if (!el) continue;
    const inf = getSpotInfo(st);
    if (/hotel|transit \/ overnight|Airport|Fuel/i.test(inf.tag || '')) {
      el.innerHTML = `<div class="fallback">${escapeHtml(inf.title)}</div>`;
      continue;
    }
    const p = await getSpotPhotos(inf, 1);
    if (document.getElementById('thumb_' + st.id)) {
      el.innerHTML = p[0] ? `<img src="${p[0].src}" alt="${escapeAttr(inf.title)}"><div class="photo-credit">${escapeHtml(p[0].artist || 'Wikimedia Commons')} • ${escapeHtml(p[0].license)}</div>` : `<div class="fallback">Photo gallery available in popup</div>`;
    }
  }
}

function checked(id) { return !!S.checklists[id]; }
function toggleCheck(id) { S.checklists[id] = !S.checklists[id]; save(); }
function checkListHtml(items) {
  return `<div class="check-list">${items.map(it => `<label class="check-item ${checked(it.id) ? 'done' : ''}"><input type="checkbox" ${checked(it.id) ? 'checked' : ''} onchange="toggleCheck('${it.id}')"><span><b>${escapeHtml(it.t)}</b>${it.d ? `<small>${escapeHtml(it.d)}</small>` : ''}</span></label>`).join('')}</div>`;
}

function renderPlan() {
  const root = document.getElementById('planRoot');
  if (!root) return;
  const shuttleBooked = isBooked('shuttle');
  const shuttleMs = new Date('2026-09-25T08:00:00-06:00') - Date.now();
  const startMs = daysUntil(S.settings.startDate);
  const phase = tripPhase();
  const today = todayLabel();
  let banner = '';
  if (!shuttleBooked && shuttleMs > 0) {
    banner = `<div class="alert-banner urgent"><div class="alert-ico">🚨</div><div><h3>Shuttle seats drop Sep 25 at 8:00 AM Mountain</h3><p>That is <b class="countdown">${fmtCountdown(shuttleMs)}</b> from now — 10:00 AM in Toronto, before you fly. Remaining Parks Canada seats for Sep 27 release 48 hours ahead. Book Moraine Lake as the first destination. Screenshot the ticket before the trip; Moraine Lake has no cell or Wi-Fi and Parkway coverage is unreliable.</p><div class="actions" style="margin-top:8px"><a class="btn primary small" href="https://reservation.pc.gc.ca/" target="_blank">Open Parks Canada reservations</a><a class="btn small" href="https://parks.canada.ca/pn-np/ab/banff/visit/parkbus/louise" target="_blank">How the shuttle works</a></div></div></div>`;
  } else if (shuttleBooked) {
    banner = `<div class="alert-banner ok"><div class="alert-ico">✓</div><div><h3>Shuttle marked booked</h3><p>Still screenshot the confirmation onto every phone and a paper copy. Check-in is at Lake Louise Park &amp; Ride (ski resort), not the lakeshore.</p></div></div>`;
  } else {
    banner = `<div class="alert-banner"><div class="alert-ico">🚌</div><div><h3>Shuttle window has opened</h3><p>If you do not have seats yet, try Parks Canada now and keep a private operator (Moraine Lake Bus) as backup. Do not drive to Moraine — personal vehicles are banned.</p><div class="actions" style="margin-top:8px"><a class="btn primary small" href="https://reservation.pc.gc.ca/" target="_blank">Parks Canada</a><a class="btn small" href="https://morainelakebus.com/" target="_blank">Private backup</a></div></div></div>`;
  }

  const actions = BOOK_TASKS.map(t => {
    const due = new Date(t.due);
    const ms = due - Date.now();
    const done = t.bookId ? isBooked(t.bookId) || checked(t.id) : checked(t.id);
    const dueCls = done ? 'ok' : (ms < 86400000 * 3 ? 'soon' : '');
    const dueTxt = done ? 'Done' : (ms < 0 ? 'Overdue' : 'Due ' + due.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }));
    return `<div class="action-card ${done ? 'done' : ''}">
      <input type="checkbox" ${done && !t.bookId ? 'checked' : ''} ${t.bookId ? 'disabled' : ''} onchange="toggleCheck('${t.id}')">
      <div><b>${escapeHtml(t.title)}</b><div class="date" style="margin-top:3px;line-height:1.45">${escapeHtml(t.detail)}</div>${t.link ? `<a class="btn small" style="margin-top:7px" href="${t.link}" target="_blank">Open</a>` : ''}</div>
      <div class="due ${dueCls}">${dueTxt}</div>
    </div>`;
  }).join('');

  const strip = S.days.map(d => {
    const tl = computeDayTimeline(d);
    const sun = SUN[d.date];
    const pct = Math.min(100, (tl.usedMin / tl.availableMin) * 100);
    return `<button class="day-mini ${d.date === today ? 'today' : ''}" onclick="openDayGuide('${d.date}')">
      <div class="row"><b>${d.date}</b><span class="badge ${pct > 90 ? 'warn' : 'must'}">${tl.afterSunset ? 'DARK' : Math.round(pct) + '%'}</span></div>
      <div style="font-size:12px;margin-top:4px">${escapeHtml(d.label)}</div>
      <div class="sun">${d.start} → ~${tl.finishTime.display}${sun ? ` • set ${sun.set}` : ''}</div>
    </button>`;
  }).join('');

  const wx = weatherCache
    ? weatherCache.map(w => `<div class="wx-card"><small>${escapeHtml(w.date)}</small><b>${w.max}° / ${w.min}°C</b><div class="date">${w.summary}</div></div>`).join('')
    : `<div class="wx-card"><small>Late-Sep climate • Banff</small><b>12–15° / 0–3°C</b><div class="date">Possible snow at elevation. Icefield much colder and windier.</div></div>
       <div class="wx-card"><small>Columbia Icefield</small><b>~5° / −5°C</b><div class="date">Hat, gloves, shell. Viewpoint is a different season from Banff town.</div></div>
       <div class="note" style="grid-column:1/-1">A live 16-day forecast will appear here once we are inside the window (from about Sep 9). Until then use climate + Environment Canada closer to the date.</div>`;

  root.innerHTML = `
    ${banner}
    <div class="plan-grid">
      <div class="glass panel">
        <div class="ph"><div><div class="ey">${phase === 'before' ? 'Lock these in' : 'Trip board'}</div><h2>${phase === 'before' ? 'Next decisions' : 'On-trip board'}</h2><p>${phase === 'before' ? `Trip starts in ${fmtCountdown(startMs)}. Tickets and rooms disappear before scenery does.` : 'Mark bookings done in the Book tab as confirmations arrive.'}</p></div></div>
        <div class="action-list">${actions}</div>
      </div>
      <div>
        <div class="glass panel">
          <div class="ph"><div><div class="ey">Weather</div><h2>What September feels like</h2></div></div>
          <div class="wx-grid" id="wxGrid">${wx}</div>
          <div class="actions" style="margin-top:10px">
            <a class="btn small" target="_blank" href="https://weather.gc.ca/city/pages/ab-49_metric_e.html">Banff forecast</a>
            <a class="btn small" target="_blank" href="https://weather.gc.ca/city/pages/ab-70_metric_e.html">Jasper forecast</a>
            <a class="btn small" target="_blank" href="https://511.alberta.ca">511 Alberta roads</a>
          </div>
        </div>
        <div class="glass panel">
          <div class="ph"><div><div class="ey">Rules that save the trip</div><h2>Do not negotiate these</h2></div></div>
          <div class="note"><b>Hotels:</b> 1 room • 3 adults • 2 Queen Beds on the checkout screen. Walk away from “assigned at check-in.”</div>
          <div class="note" style="margin-top:8px"><b>Moraine Lake:</b> no private cars. Shuttle from Lake Louise Park &amp; Ride. One reservation covers both lakes + the connector.</div>
          <div class="note warn" style="margin-top:8px"><b>Sep 27:</b> 06:00 start, ~500 km, no cell on the Parkway. Cut Mistaya first if you slip. Never cut Louise/Moraine/Peyto/Athabasca.</div>
        </div>
      </div>
    </div>
    <div class="glass panel">
      <div class="ph"><div><div class="ey">Six days</div><h2>Load vs daylight</h2><p>Open a day to see the stop-by-stop plan. Yellow = packed. Red/DARK = finishes after sunset.</p></div></div>
      <div class="day-strip">${strip}</div>
    </div>`;
}

function renderPack() {
  const root = document.getElementById('packRoot');
  if (!root) return;
  const cols = Object.entries(PACK_ITEMS).map(([k, items]) => {
    return `<div class="glass panel"><div class="ph"><div><div class="ey">Reference only</div><h2>${escapeHtml(k)}</h2></div></div><div class="check-list">${items.map(it => `<div class="check-item"><span><b>${escapeHtml(it.t)}</b>${it.d ? `<small>${escapeHtml(it.d)}</small>` : ''}</span></div>`).join('')}</div></div>`;
  }).join('');
  root.innerHTML = `<div class="note" style="margin-bottom:10px"><b>Tracking moved to Master Checklist.</b> This tab stays as a packing reference so checkboxes are not duplicated around the app. <button class="btn small" style="margin-left:6px" onclick="setView('checklistview');setChecklistCategory('gear')">Open Gear checklist →</button></div>
    <div class="pack-cols">${cols}</div>
    <div class="glass panel"><div class="ph"><div><div class="ey">September-specific</div><h2>What people underestimate</h2></div></div>
      <div class="g2">
        <div class="note warn"><b>Icefield temperature shock.</b> Banff town can feel mild while the glacier is near freezing and windy. Keep the extra layer in the car cabin.</div>
        <div class="note"><b>Wet / muddy trails.</b> Parks Canada currently reports wet or muddy sections on multiple Banff trails. Waterproof footwear is useful.</div>
        <div class="note"><b>No cell.</b> Moraine Lake has no cell/Wi-Fi and the Icefields Parkway has no dependable coverage. Test offline maps before leaving.</div>
        <div class="note"><b>Park pass receipt.</b> PRINT and DISPLAY the official receipt on the left side of the vehicle dashboard with the date visible.</div>
      </div>
    </div>`;
}

function renderField() {
  const root = document.getElementById('fieldRoot');
  if (!root) return;
  const gas = GAS_STOPS.map(g => `<div class="gas-row"><div><b>${escapeHtml(g.name)}</b><div class="date">${escapeHtml(g.note)}</div></div><a class="btn small" href="${googleMapsForStop(g)}" target="_blank">Map</a></div>`).join('');
  root.innerHTML = `
    <div class="note warn" style="margin-bottom:10px"><b>Sep 26 Johnston Canyon access:</b> Parks Canada restricts personal vehicles on the east Bow Valley Parkway from Sep 1–Oct 6, 2026. Drive to Johnston Canyon via <b>Castle Junction</b>. <button class="btn small" style="margin-left:6px" onclick="setView('checklistview');setChecklistCategory('road')">Road checklist →</button></div>
    <div class="field-grid">
      <div class="glass panel">
        <div class="ph"><div><div class="ey">Fuel</div><h2>Where you can actually fill up</h2><p>Parks Canada describes the Icefields Parkway as remote with sparse seasonal services.</p></div><button class="btn small" onclick="showFuelOnMap()">Show on map</button></div>
        ${gas}
      </div>
      <div class="glass panel">
        <div class="ph"><div><div class="ey">No signal</div><h2>Assume you are offline</h2></div><button class="btn small" onclick="setView('checklistview');setChecklistCategory('digital')">Offline checklist</button></div>
        <div class="note warn">Parks Canada says there is no dependable cell coverage on the Icefields Parkway. Moraine Lake has no cell service or Wi-Fi. Download and test offline maps before the mountain days.</div>
        <div class="note" style="margin-top:8px"><b>Before each Parkway drive:</b> 511 Alberta, Parks Canada trail/road alerts, full tank, warm layers, water/snacks and offline confirmations.</div>
        <div class="actions" style="margin-top:10px">
          <a class="btn primary small" target="_blank" href="https://511.alberta.ca">511 Alberta</a>
          <a class="btn small" target="_blank" href="https://parks.canada.ca/pn-np/ab/banff/bulletins">Banff bulletins</a>
          <a class="btn small" target="_blank" href="https://parks.canada.ca/pn-np/ab/jasper/visit/ouvert-fermee-open-closed">Jasper open / closed</a>
        </div>
      </div>
      <div class="glass panel">
        <div class="ph"><div><div class="ey">Emergency</div><h2>Who to call</h2></div></div>
        <div class="emerg">
          <div class="fact"><small>Police / fire / ambulance / search & rescue</small><b>911</b></div>
          <div class="fact"><small>Banff / Yoho backcountry emergency</small><b>403-762-4506</b></div>
          <div class="fact"><small>Jasper backcountry emergency</small><b>1-877-852-3100</b></div>
          <div class="fact"><small>Banff non-emergency wildlife</small><b>403-762-1470</b></div>
          <div class="fact"><small>Jasper wildlife reporting</small><b>780-852-6155</b></div>
          <div class="fact"><small>Road report</small><b>511</b></div>
        </div>
        <div class="note" style="margin-top:10px">Wildlife jams are common. Never stop in a live lane; use legal pullouts and give wildlife space.</div>
      </div>
      <div class="glass panel">
        <div class="ph"><div><div class="ey">Park access</div><h2>Paid pass + shuttle facts for this trip</h2></div><button class="btn small" onclick="setView('checklistview');setChecklistCategory('documents')">Pass checklist</button></div>
        <div class="note"><b>Parks admission is already paid:</b> 3 × Family/Group Day Pass = C$73.50. The receipt says to <b>PRINT and DISPLAY</b> it on the left-hand side of the vehicle dashboard with the date visible.</div>
        <div class="note warn" style="margin-top:8px"><b>Verify printed validity dates.</b> Parks Canada daily passes are valid until 4 PM the following day. Confirm whether Sep 29 park time after 4 PM needs another day.</div>
        <div class="note" style="margin-top:8px"><b>2026 Moraine/Louise shuttle:</b> regular service starts at Lake Louise Park & Ride, 1 Whitehorn Rd. 60% of seats release at 8 AM Mountain two days before. Reservation includes initial lake, Lake Connector, return and Park & Ride parking.</div>
        <div class="note warn" style="margin-top:8px"><b>Moraine Lake Road:</b> personal vehicles are not permitted. Use Parks Canada shuttle/transit or an authorized commercial operator.</div>
      </div>
    </div>`;
}

function openAddStopModal() {
  document.getElementById('addStopModal').classList.remove('hidden');
  document.getElementById('catalogGrid').innerHTML = CATALOG.map(c => `<button class="catalog-item" onclick="addCatalogStop('${c.id}')"><b>${escapeHtml(c.name)}</b><div class="date">${c.stayMin} min • ${c.priority}</div></button>`).join('');
  const input = document.getElementById('placeSearch');
  input.value = '';
  document.getElementById('placeResults').innerHTML = pendingLatLng ? `<div class="date">Map pin waiting at ${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)}</div>` : '';
  setTimeout(() => input.focus(), 50);
}
function closeAddStopModal() { document.getElementById('addStopModal').classList.add('hidden'); pendingLatLng = null; }
function addCatalogStop(id) {
  const c = CATALOG.find(x => x.id === id);
  if (!c) return;
  const d = getDay();
  if (d.stops.some(s => s.id === id || s.name === c.name)) { toast('Already on this day'); return; }
  insertStop({ id: c.id, name: c.name, lat: c.lat, lng: c.lng, priority: c.priority, stayMin: c.stayMin });
  closeAddStopModal();
  save();
  toast('Added ' + c.name);
}
function addNamedCustomStop() {
  const name = document.getElementById('customStopName').value.trim() || 'Custom stop';
  const stay = Number(document.getElementById('customStay').value || 30);
  const center = pendingLatLng || (map ? map.getCenter() : { lat: 52, lng: -116 });
  insertStop({ id: 'custom_' + Date.now(), name, lat: +center.lat.toFixed(6), lng: +center.lng.toFixed(6), priority: 'nice', stayMin: stay });
  closeAddStopModal();
  save();
}
let lastHits = [];
function addSearchHit(i) {
  const h = lastHits[i];
  if (!h) return;
  insertStop({ id: 'search_' + Date.now(), name: h.name, lat: +h.lat.toFixed(6), lng: +h.lng.toFixed(6), priority: 'nice', stayMin: 30 });
  closeAddStopModal();
  save();
  toast('Added ' + h.name);
}
function showFuelOnMap() {
  S.showFuel = true;
  save();
  setView('mapview');
}
function searchPlaces(q) {
  const box = document.getElementById('placeResults');
  if (!q || q.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="date">Searching…</div>';
  fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=51.8&lon=-116.5&limit=6`)
    .then(r => r.json())
    .then(j => {
      lastHits = (j.features || []).map(f => ({ name: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', '), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }));
      box.innerHTML = lastHits.length
        ? lastHits.map((h, i) => `<button class="search-hit" onclick="addSearchHit(${i})"><b>${escapeHtml(h.name)}</b><div class="date">${h.lat.toFixed(3)}, ${h.lng.toFixed(3)}</div></button>`).join('')
        : '<div class="date">No results</div>';
    })
    .catch(() => { box.innerHTML = '<div class="date">Search unavailable (needs network)</div>'; });
}

function renderAll() {
  document.title = S.settings.title + ' — Trip Planner';
  renderHero();
  renderDayEditor();
  renderMap();
  renderDayCards();
  renderBookings();
  renderHotels();
  renderAttractions();
  renderBudget();
  renderSettings();
  renderSummary();
  renderOverview();
  if (document.getElementById('planview').classList.contains('on')) renderPlan();
  if (document.getElementById('packview').classList.contains('on')) renderPack();
  if (document.getElementById('fieldview').classList.contains('on')) renderField();
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSpotModal(); closeAddStopModal(); closeTripHealthModal(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoLast(); return; }
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === ']' || e.key === '.') nextDay(1);
  if (e.key === '[' || e.key === ',') nextDay(-1);
});

window.addEventListener('resize', () => {
  if (map) map.invalidateSize();
});

document.getElementById('placeSearch').addEventListener('input', e => {
  clearTimeout(placeTimer);
  placeTimer = setTimeout(() => searchPlaces(e.target.value.trim()), 280);
});

async function tryWeather() {
  try {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=51.1784&longitude=-115.5708&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&timezone=America/Edmonton&forecast_days=16';
    const j = await (await fetch(u)).json();
    const days = j.daily?.time || [];
    const wanted = Object.values(DATE_ISO);
    const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 51: 'Drizzle', 61: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Showers', 95: 'Thunder' };
    const rows = [];
    days.forEach((iso, i) => {
      if (!wanted.includes(iso)) return;
      const code = j.daily.weather_code[i];
      const snow = j.daily.snowfall_sum[i];
      const pop = j.daily.precipitation_probability_max[i];
      rows.push({
        date: iso.slice(5),
        max: Math.round(j.daily.temperature_2m_max[i]),
        min: Math.round(j.daily.temperature_2m_min[i]),
        summary: `${WMO[code] || 'Mixed'} • ${pop || 0}% precip${snow ? ` • ${snow} cm snow` : ''}`
      });
    });
    if (rows.length) {
      weatherCache = rows;
      if (document.getElementById('planview').classList.contains('on')) renderPlan();
    }
  } catch (e) { /* climate fallback stays */ }
}

initMap();
renderAll();
tryWeather();
setInterval(() => {
  renderHero();
  if (document.getElementById('planview').classList.contains('on')) renderPlan();
}, 30000);

if (tripPhase() === 'during' && todayLabel()) {
  toast('Today is ' + todayLabel() + ' — open Plan or Map for the live day.');
} else if (!isBooked('shuttle')) {
  toast('Set an alarm: shuttle seats Sep 25, 8:00 AM Mountain.');
}
