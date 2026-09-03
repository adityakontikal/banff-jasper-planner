/* visualize-3d.js
 * Immersive 3D Geographic Visualization for the Banff-Jasper Trip Planner.
 * Uses Google Maps JavaScript API 3D Maps (Map3DElement, Polyline3DElement, Marker3DElement)
 * with real Canadian Rockies terrain, actual OSRM road geometry, route elevation,
 * camera flight, and smooth mobile/desktop experiences.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.Visualize3D = api;
    if (typeof document !== 'undefined') {
      const checkAndInit = () => {
        const visView = document.getElementById('visualizeview');
        const hash = (root.location && root.location.hash || '').replace(/^#/, '');
        if ((visView && visView.classList.contains('on')) || hash.startsWith('visualizeview')) {
          api.onVisualizeTabActivated();
          if (hash.includes('?')) {
            const query = hash.split('?')[1];
            const params = new URLSearchParams(query);
            const day = params.get('day');
            if (day) api.chooseVisualizeDay(day);
            const mapOnly = params.get('mapOnly');
            if (mapOnly === 'true') {
              setTimeout(() => api.toggleMapOnly(true), 300);
            }
            const stop = params.get('stop');
            if (stop) setTimeout(() => api.selectStopById(stop), 800);
          }
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInit);
      } else {
        setTimeout(checkAndInit, 60);
      }
    }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Component state
  let isInitialized = false;
  let isGoogleMapsLoaded = false;
  let loadingPromise = null;
  let map3D = null;
  let maps3dLib = null;
  let activePolylineElements = [];
  let activeMarkerElements = [];
  let currentCameraMode = 'day'; // 'whole', 'day', 'stop', 'flight'
  let currentMapMode = 'HYBRID'; // 'HYBRID' or 'SATELLITE'
  let selectedStopId = null;
  let lastRenderedSelection = null;

  // Renderer state: Explorer is the Google Maps 3D planning view; World is the
  // Cesium + Google Photorealistic 3D Tiles cinematic route corridor.
  let currentRenderer = 'explorer';
  let worldReadyDay = null;
  let worldLoading = false;
  let worldStopsWithDistances = [];
  let worldCameraMode = 'road';
  let worldLastProgress = null;

  // Fly-through animation state (legacy dollhouse flyover + world drive controller)
  let isFlying = false;
  let isFlightPaused = false;
  let flightSpeedMultiplier = 1;
  let flightTimeoutId = null;
  let flightTrajectory = [];
  let flightLegIndex = 0;

  // Elevation state
  let currentElevationProfile = null;
  // Keep the map usable first; elevation is available on demand.
  let isElevationCollapsed = true;

  // Reduced motion preference
  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* ============================================================
   * CURATED GEOGRAPHIC LANDMARK CAMERA PROFILES
   * Tailored viewpoints oriented to each landmark's signature vista
   * ============================================================ */
  const LANDMARK_CAMERA_PROFILES = {
    // Sep 25 / Transit Hubs
    yyc25: { range: 8500, tilt: 42, heading: 270, elevation: 1080, viewContext: "Calgary International Airport looking west toward the rising wall of the Canadian Rockies." },
    yyc30: { range: 8500, tilt: 42, heading: 270, elevation: 1080, viewContext: "Calgary International Airport departure terminal looking west toward the mountain horizon." },
    canmore: { range: 5200, tilt: 52, heading: 270, elevation: 1310, viewContext: "Canmore mountain corridor looking west toward the Three Sisters peaks." },

    // Sep 26: Banff Highlights & Bow Valley
    cochrane26_dep: { range: 6500, tilt: 45, heading: 260, elevation: 1180, viewContext: "Cochrane foothills departure looking west toward the Front Ranges and Bow Gap." },
    minnewanka: { range: 6500, tilt: 54, heading: 68, elevation: 1475, viewContext: "Looking east-northeast along the 21 km glacial lake corridor flanked by Mount Aylmer (3,162 m)." },
    twojack: { range: 4800, tilt: 52, heading: 185, elevation: 1460, viewContext: "Looking south across calm emerald waters toward Mount Rundle's signature sloping cliff face." },
    banff: { range: 4500, tilt: 55, heading: 0, targetOffset: { lat: 0.003, lng: 0 }, elevation: 1383, viewContext: "Looking north down Banff Avenue toward the colossal vertical face of Cascade Mountain (2,998 m)." },
    bowfalls: { range: 3500, tilt: 48, heading: 260, elevation: 1370, viewContext: "Low valley perspective looking west along the roaring Bow River rapids beneath the Fairmont hotel." },
    surprise: { range: 3600, tilt: 48, heading: 245, elevation: 1410, viewContext: "Observation deck perspective looking west-southwest at the Fairmont 'Castle in the Rockies' framed by Sulphur Mountain." },
    gondola: { range: 5500, tilt: 52, heading: 42, targetOffset: { lat: -0.005, lng: 0.002 }, elevation: 2281, viewContext: "Sulphur Mountain summit panorama (2,281 m) looking northeast across the Bow Valley toward Mount Rundle and Banff." },
    castlejunction26_in: { range: 5800, tilt: 54, heading: 45, elevation: 1420, viewContext: "Bow Valley Parkway junction looking northeast up at the horizontal fortress battlements of Castle Mountain (2,766 m)." },
    johnston: { range: 4200, tilt: 54, heading: 330, elevation: 1430, viewContext: "Looking northwest up the steep limestone slot canyon carved by churning glacial torrents." },
    castlejunction26_out: { range: 5800, tilt: 54, heading: 45, elevation: 1420, viewContext: "Return waypoint beneath Castle Mountain toward the Trans-Canada Highway corridor." },
    cochrane26_ret: { range: 6500, tilt: 45, heading: 260, elevation: 1180, viewContext: "Super 8 Cochrane hotel arrival at the eastern gateway to the Bow Valley." },

    // Sep 27: Cochrane → Moraine/Louise → Icefields → Hinton
    cochrane27: { range: 6500, tilt: 45, heading: 260, elevation: 1180, viewContext: "Super 8 Cochrane morning departure looking west toward the Rocky Mountain wall." },
    parkride: { range: 6200, tilt: 50, heading: 225, elevation: 1650, viewContext: "Bow Valley shuttle hub beneath Whitehorn Mountain, looking across toward the Lake Louise peaks." },
    moraine: { range: 5800, tilt: 56, heading: 216, targetOffset: { lat: -0.004, lng: -0.003 }, elevation: 1884, viewContext: "The iconic 'Twenty Dollar' vista from the Rockpile, looking southwest into the glaciated Valley of the Ten Peaks." },
    louise: { range: 5600, tilt: 55, heading: 236, targetOffset: { lat: -0.004, lng: -0.005 }, elevation: 1731, viewContext: "Looking southwest across the emerald lake toward Mount Victoria (3,464 m) and the hanging Victoria Glacier." },
    bowlake: { range: 5800, tilt: 54, heading: 250, elevation: 1920, viewContext: "Icefields Parkway shoreline looking west across Bow Lake toward Crowfoot Mountain and Bow Glacier." },
    bowlake29: { range: 5800, tilt: 54, heading: 250, elevation: 1920, viewContext: "Southbound Parkway vista across Bow Lake framed beneath Crowfoot Mountain." },
    crowfoot: { range: 5200, tilt: 52, heading: 255, elevation: 1940, viewContext: "Roadside viewpoint looking west at the hanging ice claws of Crowfoot Glacier." },
    peyto: { range: 4800, tilt: 55, heading: 342, targetOffset: { lat: 0.005, lng: 0 }, elevation: 2068, viewContext: "Bow Summit cliff (~2,068 m) looking down into the Mistaya Valley at the brilliant turquoise wolf-head lake." },
    mistaya: { range: 3800, tilt: 52, heading: 310, elevation: 1450, viewContext: "Looking northwest into the swirling limestone slot canyon carved by the Mistaya River." },
    saskcrossing: { range: 7500, tilt: 48, heading: 315, elevation: 1400, viewContext: "River confluence crossroads where the North Saskatchewan, Howse, and Mistaya valleys meet beneath Mount Murchison." },
    icefield: { range: 6800, tilt: 55, heading: 232, targetOffset: { lat: -0.004, lng: -0.005 }, elevation: 1970, viewContext: "Icefields Parkway gateway looking southwest directly up the colossal tongue of Athabasca Glacier toward Snow Dome." },
    icefield29: { range: 6800, tilt: 55, heading: 232, targetOffset: { lat: -0.004, lng: -0.005 }, elevation: 1970, viewContext: "Second-chance glacier exploration looking up the Athabasca ice flow toward Mount Kitchener." },
    sunwapta: { range: 3800, tilt: 52, heading: 325, elevation: 1530, viewContext: "Looking northwest at Sunwapta River plunging around an island into a deep limestone chasm." },
    stutfield: { range: 5500, tilt: 54, heading: 260, elevation: 1980, viewContext: "Looking west across the Sunwapta canyon at the hanging ice tongues of Stutfield Glacier." },
    waterfowl: { range: 5400, tilt: 52, heading: 245, elevation: 1675, viewContext: "Looking southwest across Lower Waterfowl Lake toward the steep pyramid face of Mount Chephren." },
    athfalls: { range: 4200, tilt: 52, heading: 345, elevation: 1180, viewContext: "Powerful waterfall rushing through quartzite canyons with Mount Kerkeslin rising behind." },
    hinton27: { range: 6500, tilt: 45, heading: 240, elevation: 1010, viewContext: "Hinton gateway town looking southwest along Yellowhead Highway into the front ranges." },

    // Sep 28: Jasper & Maligne Valley
    hinton28a: { range: 6500, tilt: 45, heading: 240, elevation: 1010, viewContext: "Hinton morning departure toward Jasper National Park." },
    pyramid: { range: 4800, tilt: 55, heading: 355, targetOffset: { lat: 0.004, lng: 0 }, elevation: 1180, viewContext: "Looking north across the lake and wooden footbridge straight at the 2,766 m Pyramid Mountain face." },
    patricia: { range: 4500, tilt: 52, heading: 345, elevation: 1175, viewContext: "Tranquil mirror lake reflecting Pyramid Mountain's reddish quartzite ridges." },
    jasper: { range: 5800, tilt: 52, heading: 355, targetOffset: { lat: 0.005, lng: 0 }, elevation: 1062, viewContext: "Looking north across the broad Athabasca River valley toward the red quartzite crest of Pyramid Mountain." },
    jasper29: { range: 5800, tilt: 52, heading: 355, elevation: 1062, viewContext: "Jasper townsite southbound staging point beneath Pyramid Mountain and Whistler Peak." },
    medicine: { range: 6200, tilt: 52, heading: 135, elevation: 1435, viewContext: "Looking southeast down the Maligne Valley along the porous subterranean limestone basin of Medicine Lake." },
    maligne: { range: 6800, tilt: 56, heading: 152, targetOffset: { lat: -0.006, lng: 0.004 }, elevation: 1670, viewContext: "Looking southeast down the 22 km glacial basin toward Spirit Island and glaciated Queen Elizabeth peaks." },
    annette: { range: 4200, tilt: 50, heading: 340, elevation: 1040, viewContext: "Kettle lakes in the Athabasca valley looking north toward the Colin Range." },
    hinton28b: { range: 6500, tilt: 45, heading: 240, elevation: 1010, viewContext: "Hinton Lodge evening return after the Maligne Lake cruise." },

    // Sep 29: Southbound Parkway & Calgary
    hinton29: { range: 6500, tilt: 45, heading: 240, elevation: 1010, viewContext: "Hinton departure for the southbound Icefields Parkway drive." },
    valley5: { range: 4500, tilt: 50, heading: 350, elevation: 1080, viewContext: "Athabasca Valley pine forest looking north across the chain of jewel-colored lakes." },
    naturalbridge: { range: 3600, tilt: 48, heading: 310, elevation: 1220, viewContext: "Kicking Horse River carving through ancient rock formations beneath Mount Stephen." },
    emerald: { range: 5200, tilt: 54, heading: 322, elevation: 1300, viewContext: "Yoho National Park masterpiece looking northwest across emerald waters to the President Range." },
    cochrane29: { range: 6500, tilt: 45, heading: 270, elevation: 1070, viewContext: "Holiday Inn Calgary Airport looking west toward the Bow Valley corridor." },
    cochrane30: { range: 6500, tilt: 45, heading: 270, elevation: 1070, viewContext: "Calgary Airport hotel departure." }
  };

  /**
   * Retrieves the tailored camera profile and vantage point for a stop.
   */
  function getLandmarkCameraProfile(stop) {
    if (!stop) return { range: 2800, tilt: 58, heading: 330, viewContext: "Mountain valley perspective." };

    if (LANDMARK_CAMERA_PROFILES[stop.id]) {
      return LANDMARK_CAMERA_PROFILES[stop.id];
    }

    const lower = (stop.name || '').toLowerCase();
    for (const [key, prof] of Object.entries(LANDMARK_CAMERA_PROFILES)) {
      if (lower.includes(key.toLowerCase())) {
        return prof;
      }
    }
    if (lower.includes('moraine')) return LANDMARK_CAMERA_PROFILES.moraine;
    if (lower.includes('louise')) return LANDMARK_CAMERA_PROFILES.louise;
    if (lower.includes('peyto') || lower.includes('bow summit')) return LANDMARK_CAMERA_PROFILES.peyto;
    if (lower.includes('icefield') || lower.includes('glacier')) return LANDMARK_CAMERA_PROFILES.icefield;
    if (lower.includes('maligne')) return LANDMARK_CAMERA_PROFILES.maligne;
    if (lower.includes('sulphur') || lower.includes('gondola')) return LANDMARK_CAMERA_PROFILES.gondola;
    if (lower.includes('cascade') || lower.includes('banff')) return LANDMARK_CAMERA_PROFILES.banff;
    if (lower.includes('pyramid')) return LANDMARK_CAMERA_PROFILES.pyramid;
    if (lower.includes('sunwapta')) return LANDMARK_CAMERA_PROFILES.sunwapta;
    if (lower.includes('athabasca falls')) return LANDMARK_CAMERA_PROFILES.athfalls;
    if (lower.includes('minnewanka')) return LANDMARK_CAMERA_PROFILES.minnewanka;
    if (lower.includes('two jack')) return LANDMARK_CAMERA_PROFILES.twojack;
    if (lower.includes('johnston')) return LANDMARK_CAMERA_PROFILES.johnston;
    if (lower.includes('emerald')) return LANDMARK_CAMERA_PROFILES.emerald;
    if (lower.includes('hinton')) return LANDMARK_CAMERA_PROFILES.hinton27;
    if (lower.includes('cochrane')) return LANDMARK_CAMERA_PROFILES.cochrane26_dep;
    if (lower.includes('calgary') || lower.includes('airport')) return LANDMARK_CAMERA_PROFILES.yyc25;

    return {
      range: 2600,
      tilt: 58,
      heading: 335,
      viewContext: `Geographic perspective framing ${stop.name}.`
    };
  }

  /* ============================================================
   * 1. DATA ADAPTERS (Single Source of Truth from planner state)
   * ============================================================ */

  /**
   * Retrieves active stops for a specific day or whole trip.
   */
  function getVisualizeActiveStops(dayOrDate) {
    if (typeof S === 'undefined' || !S.days) return [];

    let dayObj = null;
    if (typeof dayOrDate === 'string') {
      dayObj = S.days.find(d => d.date === dayOrDate);
    } else {
      dayObj = dayOrDate;
    }

    if (!dayObj || !dayObj.stops) return [];

    if (S.filterMustOnly) {
      return dayObj.stops.filter(s =>
        s.priority === 'must' ||
        s.isHotel ||
        (typeof getSpotInfo === 'function' && /hotel|airport/i.test(getSpotInfo(s).tag || ''))
      );
    }

    return dayObj.stops.filter(s => {
      if (typeof isStopActive === 'function') return isStopActive(s);
      return s.priority !== 'cut';
    });
  }

  /**
   * Resolves continuous route geometry coordinates for a day from legCache.
   * Returns: { coordinates: [[lng, lat], ...], status: 'ready' | 'pending' | 'provisional' }
   */
  function getVisualizeRouteGeometry(dayOrDate) {
    if (typeof S === 'undefined' || !S.days) {
      return { coordinates: [], status: 'ready' };
    }

    let dayObj = null;
    if (typeof dayOrDate === 'string') {
      dayObj = S.days.find(d => d.date === dayOrDate);
    } else {
      dayObj = dayOrDate;
    }

    if (!dayObj) return { coordinates: [], status: 'ready' };

    const activeStops = getVisualizeActiveStops(dayObj);
    if (activeStops.length < 2) {
      if (activeStops.length === 1) {
        return { coordinates: [[activeStops[0].lng, activeStops[0].lat]], status: 'ready' };
      }
      return { coordinates: [], status: 'ready' };
    }

    const mergedCoordinates = [];
    let isPending = false;
    let hasError = false;

    for (let i = 0; i < activeStops.length - 1; i++) {
      const s1 = activeStops[i];
      const s2 = activeStops[i + 1];

      let leg = null;
      if (typeof getLeg === 'function') {
        leg = getLeg(s1, s2);
      } else if (typeof legCache !== 'undefined') {
        const key = `${s1.lng.toFixed(5)},${s1.lat.toFixed(5)}_${s2.lng.toFixed(5)},${s2.lat.toFixed(5)}`;
        leg = legCache[key];
      }

      if (leg && leg.status === 'pending') isPending = true;
      if (leg && leg.status === 'error') hasError = true;

      const legCoords = (leg && leg.coordinates) ? leg.coordinates : [[s1.lng, s1.lat], [s2.lng, s2.lat]];

      // Avoid duplicating joining vertices
      const startIndex = (mergedCoordinates.length > 0) ? 1 : 0;
      for (let j = startIndex; j < legCoords.length; j++) {
        mergedCoordinates.push(legCoords[j]);
      }
    }

    let status = 'ready';
    if (isPending) status = 'pending';
    else if (hasError) status = 'provisional';

    return { coordinates: mergedCoordinates, status };
  }

  /**
   * Retrieves summary data for a day.
   */
  function getVisualizeDayData(date) {
    if (typeof S === 'undefined' || !S.days) return null;
    const day = S.days.find(d => d.date === date);
    if (!day) return null;

    const activeStops = getVisualizeActiveStops(day);
    const route = getVisualizeRouteGeometry(day);

    let totalDistMeters = 0;
    let totalDriveSecs = 0;

    for (let i = 0; i < activeStops.length - 1; i++) {
      const s1 = activeStops[i];
      const s2 = activeStops[i + 1];
      if (typeof getLeg === 'function') {
        const leg = getLeg(s1, s2);
        if (leg) {
          totalDistMeters += leg.distance || 0;
          totalDriveSecs += leg.duration || 0;
        }
      }
    }

    return {
      day,
      date: day.date,
      label: day.label,
      start: day.start,
      sleep: day.sleep,
      note: day.note,
      activeStops,
      totalStopsCount: day.stops.length,
      routeCoordinates: route.coordinates,
      routeStatus: route.status,
      distanceKm: Math.round(totalDistMeters / 100) / 10,
      driveDurationMin: Math.round(totalDriveSecs / 60)
    };
  }

  /**
   * Retrieves whole trip data across all days.
   */
  function getVisualizeWholeTripData() {
    if (typeof S === 'undefined' || !S.days) return [];
    return S.days.map(d => getVisualizeDayData(d.date)).filter(Boolean);
  }

  /* ============================================================
   * 2. LAZY LOADER & RUNTIME CONFIGURATION
   * ============================================================ */

  /**
   * Reads configured Google Maps API Key from runtime config or localStorage.
   */
  function getApiKey() {
    if (typeof window !== 'undefined') {
      if (window.ROCKIES_CONFIG && window.ROCKIES_CONFIG.googleMapsApiKey) {
        return window.ROCKIES_CONFIG.googleMapsApiKey.trim();
      }
      const stored = localStorage.getItem('bj-google-maps-key');
      if (stored) return stored.trim();
    }
    return '';
  }

  /**
   * Stores a temporary local testing key into localStorage.
   */
  function setLocalApiKey(key) {
    if (typeof localStorage !== 'undefined') {
      if (key) localStorage.setItem('bj-google-maps-key', key.trim());
      else localStorage.removeItem('bj-google-maps-key');
    }
  }

  /**
   * Lazy-loads the Google Maps JavaScript API with the 3D maps library.
   */
  function loadGoogle3DLibrary() {
    if (isGoogleMapsLoaded && maps3dLib) {
      return Promise.resolve(maps3dLib);
    }
    if (loadingPromise) return loadingPromise;

    const apiKey = getApiKey();
    if (!apiKey) {
      return Promise.reject(new Error('NO_API_KEY'));
    }

    loadingPromise = new Promise((resolve, reject) => {
      // Check if already on page
      if (window.google && window.google.maps && window.google.maps.importLibrary) {
        window.google.maps.importLibrary('maps3d').then(lib => {
          maps3dLib = lib;
          isGoogleMapsLoaded = true;
          resolve(lib);
        }).catch(reject);
        return;
      }

      // Dynamic script bootstrap
      const callbackName = `__g3d_cb_${Date.now()}`;
      window[callbackName] = () => {
        delete window[callbackName];
        window.google.maps.importLibrary('maps3d').then(lib => {
          maps3dLib = lib;
          isGoogleMapsLoaded = true;
          resolve(lib);
        }).catch(reject);
      };

      const script = document.createElement('script');
      script.id = 'googleMaps3dScript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=alpha&libraries=maps3d,elevation&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callbackName];
        loadingPromise = null;
        reject(new Error('SCRIPT_LOAD_FAILED'));
      };
      document.head.appendChild(script);
    });

    return loadingPromise;
  }

  /* ============================================================
   * 3. 3D MAP INITIALIZATION & LIFECYCLE
   * ============================================================ */

  /**
   * Called when the user clicks the "Visualize" top-level tab.
   */
  function onVisualizeTabActivated() {
    renderVisualizeShell();

    const apiKey = getApiKey();
    if (!apiKey) {
      renderSetupState();
      return;
    }

    if (!isInitialized) {
      renderLoadingState('Loading 3D Canadian Rockies terrain…');
      loadGoogle3DLibrary()
        .then(() => {
          init3DMapInstance();
        })
        .catch(err => {
          renderErrorState(err);
        });
    } else {
      // Map instance already exists; synchronize state and layout
      syncSelectedDayView();
    }
  }

  /**
   * Renders the main workspace shell inside #visualizeview.
   */
  function renderVisualizeShell() {
    const root = document.getElementById('visualizeview');
    if (!root) return;

    if (root.querySelector('.visualize-workspace')) {
      // Already has shell; just update day switchers
      updateControlPanelDayButtons();
      return;
    }

    root.innerHTML = `
      <div class="visualize-workspace" id="visualizeWorkspace">
        <!-- Floating Left Control Panel -->
        <aside class="visualize-sidebar glass" id="visualizeSidebar">
          <div class="vis-sidehead">
            <div class="row">
              <div>
                <div class="ey">3D Rockies Explorer</div>
                <h2 class="vis-sidetitle" id="visSideTitle">Select a Day</h2>
              </div>
              <button class="btn small" id="visFitBtn" title="Fit active route to camera">Fit</button>
            </div>
            <!-- Day Selector Pills -->
            <div class="vis-dayswitch" id="visDaySwitch"></div>
          </div>

          <div class="vis-sidebody" id="visSideBody">
            <!-- Day Overview Card -->
            <div class="vis-day-metric-card" id="visMetricCard"></div>

            <!-- Action Controls -->
            <div class="vis-actions-row">
              <button class="btn primary small" id="visPlayRouteBtn">▶ Drive route</button>
              <button class="btn small" id="visLegacyFlyBtn" title="High-level landmark flyover in Explorer">Flyover</button>
              <button class="btn small" id="visWholeTripBtn">Whole trip</button>
              <button class="btn small" id="visResetCamBtn">Reset</button>
            </div>

            <!-- Route Flight Progress HUD (Hidden when not flying) -->
            <div class="vis-flight-hud hidden" id="visFlightHud">
              <div class="vis-flight-progress-bar">
                <div class="vis-flight-progress-fill" id="visFlightProgressFill"></div>
              </div>
              <div class="vis-flight-badge-row">
                <span class="vis-flight-badge" id="visFlightBadge">CINEMATIC FLYOVER</span>
                <span class="vis-flight-speed-tag" id="visFlightSpeedTag">1.0x</span>
              </div>
              <div class="vis-flight-hud-title" id="visFlightTitle">Following route…</div>
              <div class="vis-flight-hud-sub" id="visFlightSub">Glacial valleys & mountain passes</div>
              <div class="vis-flight-hud-actions">
                <button class="btn small" id="visPrevFlightLegBtn" title="Previous stop">⏮</button>
                <button class="btn small primary" id="visPauseFlightBtn" title="Pause / Resume">⏸</button>
                <button class="btn small" id="visNextFlightLegBtn" title="Next stop">⏭</button>
                <div class="vis-flight-speed-group" role="group" aria-label="Playback speed">
                  <button class="vis-speed-btn" data-speed="0.5" title="0.5x Scenic">0.5x</button>
                  <button class="vis-speed-btn active" data-speed="1" title="1x Cinematic">1x</button>
                  <button class="vis-speed-btn" data-speed="2" title="2x Fast">2x</button>
                </div>
                <button class="btn small danger" id="visStopFlightBtn" title="Exit flyover">⏹</button>
              </div>
            </div>

            <!-- Selected Stop Inspector Card -->
            <div class="vis-selected-stop-card hidden" id="visSelectedStopCard"></div>

            <!-- Ordered Stops List -->
            <div class="ey" style="margin: 12px 0 6px;">Ordered Stops</div>
            <div class="vis-stoplist" id="visStopList"></div>
          </div>
        </aside>

        <!-- Main 3D Viewport -->
        <main class="visualize-main" id="visualizeMain">
          <!-- Floating Stop Inspector for Map-Only Mode / Mobile -->
          <div class="vis-map-stop-card hidden" id="visMapStopCard"></div>

          <!-- Floating Movie Flyover HUD for Map-Only Mode / Fullscreen -->
          <div class="vis-map-flight-hud hidden" id="visMapFlightHud">
            <div class="vis-flight-progress-bar">
              <div class="vis-flight-progress-fill" id="visMapFlightProgressFill"></div>
            </div>
            <div class="vis-flight-badge-row">
              <span class="vis-flight-badge" id="visMapFlightBadge">CINEMATIC FLYOVER</span>
              <span class="vis-flight-speed-tag" id="visMapFlightSpeedTag">1.0x</span>
            </div>
            <div class="vis-flight-hud-title" id="visMapFlightTitle">Following route…</div>
            <div class="vis-flight-hud-sub" id="visMapFlightSub">Glacial valleys & mountain passes</div>
            <div class="vis-flight-hud-actions">
              <button class="btn small" id="visMapPrevFlightLegBtn" title="Previous stop">⏮</button>
              <button class="btn small primary" id="visMapPauseFlightBtn" title="Pause / Resume">⏸</button>
              <button class="btn small" id="visMapNextFlightLegBtn" title="Next stop">⏭</button>
              <div class="vis-flight-speed-group" role="group" aria-label="Playback speed">
                <button class="vis-speed-btn" data-speed="0.5" title="0.5x Scenic">0.5x</button>
                <button class="vis-speed-btn active" data-speed="1" title="1x Cinematic">1x</button>
                <button class="vis-speed-btn" data-speed="2" title="2x Fast">2x</button>
              </div>
              <button class="btn small danger" id="visMapStopFlightBtn" title="Exit flyover">⏹</button>
            </div>
          </div>

          <!-- Map style / quick camera presets. Kept left so Google's native exploration controls remain unobstructed on the right. -->
          <div class="vis-map-toolbar">
            <div class="vis-pill-group vis-renderer-switch" role="group" aria-label="3D renderer">
              <button class="vis-tool-btn on" id="visRendererExplorerBtn">Explorer</button>
              <button class="vis-tool-btn" id="visRendererWorldBtn">World</button>
            </div>
            <div class="vis-pill-group vis-map-style-switch" role="group" aria-label="Map style">
              <button class="vis-tool-btn on" id="visModeHybridBtn" data-mode="HYBRID">Hybrid</button>
              <button class="vis-tool-btn" id="visModeSatBtn" data-mode="SATELLITE">Satellite</button>
            </div>
            <button class="vis-tool-btn" id="visPresetDollhouseBtn" title="Dollhouse 3D miniature perspective">Dollhouse</button>
            <button class="vis-tool-btn" id="visPresetValleyBtn" title="Oblique valley perspective">Valley</button>
            <button class="vis-tool-btn" id="visPresetHighBtn" title="High aerial perspective">Aerial</button>
            <button class="vis-tool-btn" id="visControlsHelpBtn" aria-pressed="false" title="Show 3D control help">Controls</button>
            <button class="vis-tool-btn" id="visMapOnlyBtn" aria-pressed="false" title="Hide the itinerary panel and maximize the 3D map">Map only</button>
          </div>

          <!-- Always-visible camera pad. Google native move/zoom/rotate/tilt/compass controls remain enabled too. -->
          <div class="vis-camera-dock glass" id="visCameraDock" aria-label="3D camera controls">
            <div class="vis-camera-row">
              <button class="vis-camera-btn" id="visZoomOutBtn" aria-label="Zoom out" title="Zoom out">−</button>
              <div class="vis-camera-readout" id="visCameraReadout" aria-live="polite">3D camera</div>
              <button class="vis-camera-btn" id="visZoomInBtn" aria-label="Zoom in" title="Zoom in">+</button>
            </div>
            <div class="vis-camera-grid">
              <button class="vis-camera-btn" id="visRotateLeftBtn" aria-label="Rotate left" title="Rotate left">↶</button>
              <button class="vis-camera-btn vis-camera-north" id="visNorthBtn" aria-label="Face north" title="Face north">N</button>
              <button class="vis-camera-btn" id="visRotateRightBtn" aria-label="Rotate right" title="Rotate right">↷</button>
              <button class="vis-camera-btn vis-camera-wide" id="visLookDownBtn" aria-label="Look more downward" title="Look more downward">Look down</button>
              <button class="vis-camera-btn vis-camera-wide" id="visLookAheadBtn" aria-label="Tilt toward horizon" title="Tilt toward horizon">Look ahead</button>
            </div>
            <button class="vis-camera-fit" id="visCameraFitBtn">Fit route</button>
          </div>

          <div class="vis-control-help hidden" id="visControlHelp" role="status">
            <b>Explore freely</b>
            <span>Drag to move • scroll/pinch to zoom • use the camera pad or Google's controls to rotate and tilt.</span>
          </div>

          <!-- Google 3D Explorer -->
          <div class="visualize-map-container" id="visualizeMapContainer"></div>

          <!-- Cinematic route world: Cesium + Google Photorealistic 3D Tiles. -->
          <div class="visualize-world-container hidden" id="visualizeWorldContainer" aria-label="Cinematic 3D route world"></div>
          <div class="vis-world-status hidden" id="visWorldStatus">
            <div class="vis-world-status-top">
              <span class="vis-world-badge">LIVE WORLD</span>
              <span id="visWorldClock">Trip time</span>
              <span id="visWorldSun">Sun —</span>
            </div>
            <div class="vis-world-status-sub" id="visWorldStatusSub">Real route • real terrain • real trip-time sunlight</div>
            <div class="vis-world-camera-modes" role="group" aria-label="World camera height">
              <button class="vis-world-mode active" data-world-camera="road">Road</button>
              <button class="vis-world-mode" data-world-camera="scenic">Scenic</button>
              <button class="vis-world-mode" data-world-camera="aerial">Aerial</button>
            </div>
          </div>

          <!-- Notice / Loading / Error Overlay -->
          <div class="visualize-overlay hidden" id="visualizeOverlay"></div>

          <!-- Bottom Collapsible Elevation Drawer -->
          <div class="visualize-elevation-drawer glass" id="visualizeElevationDrawer">
            <div class="vis-elev-header" id="visElevHeader">
              <div class="vis-elev-title-wrap">
                <b>Route terrain elevation</b>
                <span class="vis-elev-stats-pill" id="visElevStatsPill">Sampling…</span>
              </div>
              <button class="vis-elev-toggle-btn" id="visElevToggleBtn" aria-label="Toggle elevation profile">▼</button>
            </div>
            <div class="vis-elev-content" id="visElevContent">
              <div id="visElevChartRoot"></div>
            </div>
          </div>
        </main>
      </div>
    `;

    bindShellEvents();
    updateControlPanelDayButtons();
    toggleElevationDrawer(isElevationCollapsed);
  }

  /**
   * Binds click events for shell controls.
   */
  function bindShellEvents() {
    const fitBtn = document.getElementById('visFitBtn');
    if (fitBtn) fitBtn.onclick = () => fitActiveRoute();

    const wholeTripBtn = document.getElementById('visWholeTripBtn');
    if (wholeTripBtn) wholeTripBtn.onclick = () => chooseVisualizeDay('all');

    const resetCamBtn = document.getElementById('visResetCamBtn');
    if (resetCamBtn) resetCamBtn.onclick = () => resetCamera();

    const playBtn = document.getElementById('visPlayRouteBtn');
    if (playBtn) playBtn.onclick = () => startRouteFlyThrough();

    const legacyFlyBtn = document.getElementById('visLegacyFlyBtn');
    if (legacyFlyBtn) legacyFlyBtn.onclick = () => startDollhouseFlyThrough();

    const rendererExplorerBtn = document.getElementById('visRendererExplorerBtn');
    if (rendererExplorerBtn) rendererExplorerBtn.onclick = () => setRenderer('explorer');

    const rendererWorldBtn = document.getElementById('visRendererWorldBtn');
    if (rendererWorldBtn) rendererWorldBtn.onclick = () => activateWorldView(false);

    document.querySelectorAll('.vis-world-mode').forEach(btn => {
      btn.onclick = () => setWorldCameraMode(btn.dataset.worldCamera);
    });

    ['visPauseFlightBtn', 'visMapPauseFlightBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => togglePauseFlyThrough();
    });

    ['visStopFlightBtn', 'visMapStopFlightBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => cancelRouteFlyThrough(true);
    });

    ['visNextFlightLegBtn', 'visMapNextFlightLegBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => skipFlightLeg(1);
    });

    ['visPrevFlightLegBtn', 'visMapPrevFlightLegBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = () => skipFlightLeg(-1);
    });

    document.querySelectorAll('.vis-speed-btn').forEach(btn => {
      btn.onclick = () => setFlightSpeed(Number(btn.dataset.speed));
    });

    const hybridBtn = document.getElementById('visModeHybridBtn');
    if (hybridBtn) hybridBtn.onclick = () => setMapMode('HYBRID');

    const satBtn = document.getElementById('visModeSatBtn');
    if (satBtn) satBtn.onclick = () => setMapMode('SATELLITE');

    const dollhouseBtn = document.getElementById('visPresetDollhouseBtn');
    if (dollhouseBtn) dollhouseBtn.onclick = () => setCameraPreset('dollhouse');

    const valleyBtn = document.getElementById('visPresetValleyBtn');
    if (valleyBtn) valleyBtn.onclick = () => setCameraPreset('valley');

    const highBtn = document.getElementById('visPresetHighBtn');
    if (highBtn) highBtn.onclick = () => setCameraPreset('high');

    const mapOnlyBtn = document.getElementById('visMapOnlyBtn');
    if (mapOnlyBtn) mapOnlyBtn.onclick = () => toggleMapOnly();

    const controlsHelpBtn = document.getElementById('visControlsHelpBtn');
    const controlsHelp = document.getElementById('visControlHelp');
    if (controlsHelpBtn && controlsHelp) {
      controlsHelpBtn.onclick = () => {
        const willShow = controlsHelp.classList.contains('hidden');
        controlsHelp.classList.toggle('hidden', !willShow);
        controlsHelpBtn.setAttribute('aria-pressed', willShow ? 'true' : 'false');
      };
    }

    const cameraBindings = [
      ['visZoomInBtn', () => adjustCamera({ rangeFactor: 0.72 })],
      ['visZoomOutBtn', () => adjustCamera({ rangeFactor: 1.38 })],
      ['visRotateLeftBtn', () => adjustCamera({ headingDelta: -20 })],
      ['visRotateRightBtn', () => adjustCamera({ headingDelta: 20 })],
      ['visNorthBtn', () => adjustCamera({ heading: 0 })],
      ['visLookDownBtn', () => adjustCamera({ tiltDelta: -10 })],
      ['visLookAheadBtn', () => adjustCamera({ tiltDelta: 10 })],
      ['visCameraFitBtn', () => fitActiveRoute()]
    ];
    cameraBindings.forEach(([id, fn]) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    });

    const elevToggleBtn = document.getElementById('visElevToggleBtn');
    const elevHeader = document.getElementById('visElevHeader');
    if (elevHeader) {
      elevHeader.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target !== elevToggleBtn) {
          toggleElevationDrawer();
        }
      };
    }
    if (elevToggleBtn) {
      elevToggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleElevationDrawer();
      };
    }
  }

  function setRenderer(renderer) {
    const next = renderer === 'world' ? 'world' : 'explorer';
    currentRenderer = next;

    const main = document.getElementById('visualizeMain');
    const googleContainer = document.getElementById('visualizeMapContainer');
    const worldContainer = document.getElementById('visualizeWorldContainer');
    const worldStatus = document.getElementById('visWorldStatus');
    const explorerBtn = document.getElementById('visRendererExplorerBtn');
    const worldBtn = document.getElementById('visRendererWorldBtn');

    if (main) main.classList.toggle('world-mode', next === 'world');
    if (googleContainer) googleContainer.classList.toggle('hidden', next === 'world');
    if (worldContainer) worldContainer.classList.toggle('hidden', next !== 'world');
    if (worldStatus) worldStatus.classList.toggle('hidden', next !== 'world');
    if (explorerBtn) explorerBtn.classList.toggle('on', next === 'explorer');
    if (worldBtn) worldBtn.classList.toggle('on', next === 'world');

    if (next === 'explorer' && typeof window !== 'undefined' && window.VisualizeWorld) {
      window.VisualizeWorld.stop(false);
      window.VisualizeWorld.hide();
    } else if (next === 'world' && typeof window !== 'undefined' && window.VisualizeWorld) {
      window.VisualizeWorld.show();
    }
  }

  function resolveDayIso(dateLabel) {
    try {
      if (typeof DATE_ISO !== 'undefined' && DATE_ISO && DATE_ISO[dateLabel]) return DATE_ISO[dateLabel];
    } catch (_) {}
    const year = (typeof S !== 'undefined' && S.settings && S.settings.startDate)
      ? String(S.settings.startDate).slice(0, 4)
      : '2026';
    const match = String(dateLabel || '').match(/([A-Za-z]{3})\s+(\d{1,2})/);
    if (!match) return year + '-09-27';
    const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    return year + '-' + (months[match[1]] || '09') + '-' + String(Number(match[2])).padStart(2, '0');
  }

  function formatWorldClock(date) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Edmonton',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    } catch (_) {
      return date ? date.toLocaleTimeString() : 'Trip time';
    }
  }

  function updateWorldHud(info) {
    if (!info) return;
    worldLastProgress = info;
    const clock = document.getElementById('visWorldClock');
    const sun = document.getElementById('visWorldSun');
    const sub = document.getElementById('visWorldStatusSub');
    if (clock && info.date) clock.textContent = formatWorldClock(info.date);
    if (sun && info.sun) {
      const sunState = info.sun.altitude >= 0 ? 'above horizon' : 'below horizon';
      sun.textContent = 'Sun ' + Math.round(info.sun.azimuth) + '° • ' + Math.round(info.sun.altitude) + '° ' + sunState;
    }
    if (sub) {
      sub.textContent = Math.round(info.surfaceHeight || 0) + ' m terrain • ' +
        Math.round(info.cameraHeight || 0) + ' m camera • ' +
        Math.round((info.distanceMeters || 0) / 1000) + ' / ' +
        Math.round((info.totalDistanceMeters || 0) / 1000) + ' km';
    }

    const pct = Math.round((info.progress || 0) * 100);
    document.querySelectorAll('.vis-flight-progress-fill').forEach(el => el.style.width = pct + '%');
    document.querySelectorAll('.vis-flight-hud-title').forEach(el => el.textContent = 'Driving the real route • ' + pct + '%');
    document.querySelectorAll('.vis-flight-hud-sub').forEach(el => {
      el.textContent = formatWorldClock(info.date) + ' • sun ' + Math.round(info.sun.altitude) + '° • ' + info.cameraMode + ' camera';
    });
    document.querySelectorAll('.vis-flight-badge').forEach(el => el.textContent = 'VIRTUAL WORLD DRIVE');
  }

  function setWorldCameraMode(mode) {
    worldCameraMode = ['road', 'scenic', 'aerial'].includes(mode) ? mode : 'road';
    document.querySelectorAll('.vis-world-mode').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.worldCamera === worldCameraMode);
    });
    if (typeof window !== 'undefined' && window.VisualizeWorld) {
      window.VisualizeWorld.setCameraMode(worldCameraMode);
    }
  }

  async function prepareCinematicWorld(dayData) {
    if (!dayData || dayData.date === 'all') throw new Error('Select an individual day for Cinematic World.');
    if (worldLoading) return false;
    const VW = (typeof window !== 'undefined') ? window.VisualizeWorld : null;
    const VE = (typeof window !== 'undefined') ? window.VisualizeElevation : null;
    if (!VW || !VE) throw new Error('Cinematic World module is unavailable.');

    const worldContainer = document.getElementById('visualizeWorldContainer');
    if (!worldContainer) throw new Error('Cinematic World container is unavailable.');

    worldLoading = true;
    try {
      renderLoadingState('Building route corridor world • loading photorealistic terrain…');
      await VW.initialize(worldContainer, getApiKey());

      const profile = await VE.fetchElevationProfile(dayData.routeCoordinates, { stops: dayData.activeStops });
      worldStopsWithDistances = VE.mapStopsToDistances(dayData.activeStops, dayData.routeCoordinates);

      VW.loadDay({
        routeCoordinates: dayData.routeCoordinates,
        elevationProfile: profile,
        stopsWithDistances: worldStopsWithDistances,
        dateISO: resolveDayIso(dayData.date),
        startTime: dayData.start || '08:00',
        driveDurationSeconds: Math.max(60, Number(dayData.driveDurationMin || 0) * 60),
        handlers: {
          onProgress: updateWorldHud,
          onStop: (stop, index) => {
            if (!stop) return;
            document.querySelectorAll('.vis-stop-item').forEach(el => {
              el.classList.toggle('selected', el.dataset.stopId === stop.id);
            });
            document.querySelectorAll('.vis-flight-hud-title').forEach(el => {
              el.textContent = 'Passing stop ' + (index + 1) + ': ' + stop.name;
            });
          },
          onEnd: finishWorldDrive
        }
      });
      VW.setCameraMode(worldCameraMode);
      VW.setSpeed(flightSpeedMultiplier);
      worldReadyDay = dayData.date;
      setRenderer('world');
      hideOverlay();
      return true;
    } finally {
      worldLoading = false;
    }
  }

  async function activateWorldView(autoPlay) {
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    if (currentDay === 'all') {
      if (typeof alert === 'function') alert('Select an individual day to enter the route-level virtual world.');
      return;
    }
    const dayData = getVisualizeDayData(currentDay);
    if (!dayData || !dayData.routeCoordinates || dayData.routeCoordinates.length < 2) {
      if (typeof alert === 'function') alert('The road route is still loading. Try again when its geometry is ready.');
      return;
    }

    try {
      if (worldReadyDay !== dayData.date) await prepareCinematicWorld(dayData);
      else setRenderer('world');
      if (autoPlay && window.VisualizeWorld) {
        window.VisualizeWorld.play({ speed: flightSpeedMultiplier, cameraMode: worldCameraMode });
      }
    } catch (err) {
      setRenderer('explorer');
      renderErrorState(new Error('Cinematic World could not load. Explorer is still available. Enable the Google Map Tiles API for this key and verify billing/quota. ' + (err.message || String(err))));
      throw err;
    }
  }

  /**
   * Hides/shows the itinerary side panel so the terrain can use the full workspace.
   * This is an in-app fullscreen mode and works where the browser Fullscreen API does not.
   */
  function toggleMapOnly(forceState) {
    const workspace = document.getElementById('visualizeWorkspace');
    const btn = document.getElementById('visMapOnlyBtn');
    const mapCard = document.getElementById('visMapStopCard');
    if (!workspace) return;
    const next = forceState === undefined ? !workspace.classList.contains('map-only') : !!forceState;
    workspace.classList.toggle('map-only', next);
    if (btn) {
      btn.textContent = next ? 'Show panel' : 'Map only';
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if (mapCard) {
      mapCard.classList.toggle('hidden', !(next && selectedStopId));
    }
    const sidebarHud = document.getElementById('visFlightHud');
    const mapHud = document.getElementById('visMapFlightHud');
    if (sidebarHud && mapHud) {
      sidebarHud.classList.toggle('hidden', !(!next && isFlying));
      mapHud.classList.toggle('hidden', !(next && isFlying));
    }
    setTimeout(refreshCameraReadout, 80);
  }

  /**
   * Toggles the elevation drawer collapse state.
   */
  function toggleElevationDrawer(forceState) {
    const drawer = document.getElementById('visualizeElevationDrawer');
    const btn = document.getElementById('visElevToggleBtn');
    if (!drawer) return;

    if (forceState !== undefined) {
      isElevationCollapsed = forceState;
    } else {
      isElevationCollapsed = !isElevationCollapsed;
    }

    drawer.classList.toggle('collapsed', isElevationCollapsed);
    if (btn) btn.textContent = isElevationCollapsed ? '▲' : '▼';
  }

  /**
   * Updates day switcher pills in the Visualize sidebar.
   */
  function updateControlPanelDayButtons() {
    const container = document.getElementById('visDaySwitch');
    if (!container || typeof S === 'undefined' || !S.days) return;

    const current = S.selectedDay || 'Sep 26';
    let html = `
      <button class="vis-daybtn ${current === 'all' ? 'on' : ''}" data-day="all">All Days</button>
    `;

    S.days.forEach(d => {
      const active = d.date === current;
      html += `
        <button class="vis-daybtn ${active ? 'on' : ''}" data-day="${d.date}">${d.date}</button>
      `;
    });

    container.innerHTML = html;
    container.querySelectorAll('.vis-daybtn').forEach(btn => {
      btn.onclick = () => chooseVisualizeDay(btn.dataset.day);
    });
  }

  /**
   * Handles user day selection from Visualize tab.
   */
  function chooseVisualizeDay(date) {
    const previousDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : null;
    const selectionChanged = previousDay !== date;
    if (isFlying && selectionChanged) cancelRouteFlyThrough(false);

    if (typeof S !== 'undefined') {
      S.selectedDay = date;
      if (selectionChanged && typeof persist === 'function') persist();
    }

    updateControlPanelDayButtons();
    syncSelectedDayView();
  }

  /**
   * Initializes the Google Maps 3D Web Component instance.
   */
  function init3DMapInstance() {
    const container = document.getElementById('visualizeMapContainer');
    if (!container) return;

    hideOverlay();

    if (map3D) {
      syncSelectedDayView();
      return;
    }

    try {
      const { Map3DElement } = maps3dLib;

      // Initialize Map3DElement
      map3D = new Map3DElement({
        mode: currentMapMode,
        center: { lat: 51.5, lng: -116.1, altitude: 0 },
        range: 120000,
        tilt: 55,
        heading: 330,
        // Google's native 3D exploration UI provides zoom, move, rotate, tilt and compass.
        defaultUIHidden: false,
        description: 'Interactive 3D Canadian Rockies trip map'
      });

      map3D.style.width = '100%';
      map3D.style.height = '100%';
      map3D.id = 'rockiesMap3D';

      // Detect user interaction during fly-through to cancel gracefully
      map3D.addEventListener('pointerdown', () => {
        // A direct gesture means the user is taking control. Never snap back to a preset.
        if (isFlying) cancelRouteFlyThrough(false);
      });
      ['gmp-headingchange', 'gmp-tiltchange', 'gmp-rangechange'].forEach(eventName => {
        map3D.addEventListener(eventName, refreshCameraReadout);
      });

      container.innerHTML = '';
      container.appendChild(map3D);
      isInitialized = true;

      // Render day routes & markers
      syncSelectedDayView();
    } catch (err) {
      renderErrorState(err);
    }
  }

  /**
   * Synchronizes route polylines, stop markers, camera, and elevation profile
   * with the currently selected day.
   */
  function syncSelectedDayView() {
    if (!map3D) return;

    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const isAll = currentDay === 'all';
    const selectionChanged = currentDay !== lastRenderedSelection;
    lastRenderedSelection = currentDay;
    if (selectionChanged) {
      worldReadyDay = null;
      if (currentDay === 'all' && currentRenderer === 'world') setRenderer('explorer');
    }

    // Update sidebar title & metrics
    const titleEl = document.getElementById('visSideTitle');
    const metricEl = document.getElementById('visMetricCard');

    if (isAll) {
      if (titleEl) titleEl.textContent = 'Whole Trip (Sep 25–30)';
      renderWholeTripMetrics(metricEl);
      renderWholeTripScene(selectionChanged);
    } else {
      const dayData = getVisualizeDayData(currentDay);
      if (titleEl) titleEl.textContent = `${currentDay}: ${dayData ? dayData.label : ''}`;
      renderDayMetrics(metricEl, dayData);
      renderDayScene(dayData, selectionChanged);
      if (currentRenderer === 'world' && selectionChanged && dayData) {
        prepareCinematicWorld(dayData).catch(err => {
          setRenderer('explorer');
          renderErrorState(new Error('Could not rebuild Cinematic World for ' + currentDay + '. ' + (err.message || String(err))));
        });
      }
    }
  }

  /* ============================================================
   * 4. SCENE RENDERING: ROUTES & 3D MARKERS
   * ============================================================ */

  /**
   * Cleans up existing 3D polylines and markers from the map.
   */
  function clearActive3DFeatures() {
    if (!map3D) return;

    activePolylineElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    activePolylineElements = [];

    activeMarkerElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    activeMarkerElements = [];
  }

  /**
   * Renders the single-day view on the 3D map.
   */
  function renderDayScene(dayData, autoFit = false) {
    clearActive3DFeatures();
    if (!dayData || !map3D) return;

    const { Polyline3DElement, Marker3DInteractiveElement, Marker3DElement } = maps3dLib;
    const dayColorCode = (typeof dayColor === 'function') ? dayColor(dayData.date) : '#56c6a5';

    // 1. Render road route polyline
    const coords = dayData.routeCoordinates;
    if (coords && coords.length >= 2) {
      const path = coords.map(c => ({ lat: c[1], lng: c[0] }));

      // High-contrast background polyline
      const casing = new Polyline3DElement({
        path,
        altitudeMode: 'CLAMP_TO_GROUND',
        strokeColor: '#05111a',
        strokeWidth: 9
      });
      map3D.appendChild(casing);
      activePolylineElements.push(casing);

      // Main colored route line
      const mainLine = new Polyline3DElement({
        path,
        altitudeMode: 'CLAMP_TO_GROUND',
        strokeColor: dayColorCode,
        strokeWidth: 5.5
      });
      map3D.appendChild(mainLine);
      activePolylineElements.push(mainLine);
    }

    // 2. Render 3D markers for active stops
    const MarkerClass = Marker3DInteractiveElement || Marker3DElement;

    dayData.activeStops.forEach((stop, index) => {
      const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
      const isWaypoint = /junction|waypoint/i.test(stop.name || '');
      const color = isHotel ? '#c5a6ff' : (stop.priority === 'must' ? '#56c6a5' : '#68b9ff');

      try {
        const marker = new MarkerClass({
          position: { lat: stop.lat, lng: stop.lng, altitude: 0 },
          altitudeMode: 'RELATIVE_TO_GROUND',
          label: isWaypoint ? '•' : String(index + 1),
          title: stop.name,
          extruded: true
        });

        // Click handler for interactive marker
        marker.addEventListener('gmp-click', () => {
          selectStop(stop, index + 1);
        });

        map3D.appendChild(marker);
        activeMarkerElements.push(marker);
      } catch (err) {
        // Fallback for marker creation errors
      }
    });

    // 3. Populate sidebar stop list
    renderSidebarStopList(dayData.activeStops);

    // 4. Fit only when the user actually changed day/view. Background OSRM refreshes
    // must never steal the camera after the user has started exploring.
    if (autoFit) fitActiveRoute();
    refreshCameraReadout();

    // 5. Update elevation profile
    updateElevationProfileForDay(dayData);
  }

  /**
   * Renders the whole trip view with all days superimposed.
   */
  function renderWholeTripScene(autoFit = false) {
    clearActive3DFeatures();
    if (!map3D) return;

    const { Polyline3DElement, Marker3DInteractiveElement, Marker3DElement } = maps3dLib;
    const MarkerClass = Marker3DInteractiveElement || Marker3DElement;
    const allDays = getVisualizeWholeTripData();

    allDays.forEach(dayData => {
      const color = (typeof dayColor === 'function') ? dayColor(dayData.date) : '#68b9ff';
      const coords = dayData.routeCoordinates;

      if (coords && coords.length >= 2) {
        const path = coords.map(c => ({ lat: c[1], lng: c[0] }));

        const poly = new Polyline3DElement({
          path,
          altitudeMode: 'CLAMP_TO_GROUND',
          strokeColor: color,
          strokeWidth: 4.5
        });
        map3D.appendChild(poly);
        activePolylineElements.push(poly);
      }

      // Add major hub markers (e.g. start/end hotel or airport)
      const keyStops = dayData.activeStops.filter(s => s.isHotel || /yyc|hinton|banff|cochrane|jasper/i.test(s.name));
      keyStops.forEach(s => {
        try {
          const m = new MarkerClass({
            position: { lat: s.lat, lng: s.lng, altitude: 0 },
            altitudeMode: 'RELATIVE_TO_GROUND',
            title: `${dayData.date}: ${s.name}`,
            extruded: true
          });
          m.addEventListener('gmp-click', () => {
            chooseVisualizeDay(dayData.date);
          });
          map3D.appendChild(m);
          activeMarkerElements.push(m);
        } catch (_) {}
      });
    });

    // Populate stop list with day summaries
    const listEl = document.getElementById('visStopList');
    if (listEl) {
      let html = '';
      allDays.forEach(d => {
        const c = (typeof dayColor === 'function') ? dayColor(d.date) : '#56c6a5';
        html += `
          <div class="vis-wholeday-row" data-day="${d.date}" style="border-left: 3px solid ${c};">
            <div class="vis-wholeday-title"><b>${d.date}</b> • ${escapeHtml(d.label)}</div>
            <div class="vis-wholeday-sub">${d.distanceKm} km • ${d.activeStops.length} stops • Overnight: ${escapeHtml(d.sleep || 'None')}</div>
          </div>
        `;
      });
      listEl.innerHTML = html;
      listEl.querySelectorAll('.vis-wholeday-row').forEach(row => {
        row.onclick = () => chooseVisualizeDay(row.dataset.day);
      });
    }

    // Set Whole Trip Camera Overview only when entering this selection.
    if (autoFit) flyToWholeTripOverview();
    refreshCameraReadout();

    // Clear elevation drawer for whole trip
    const chartRoot = document.getElementById('visElevChartRoot');
    const pill = document.getElementById('visElevStatsPill');
    if (pill) pill.textContent = 'Whole trip overview';
    if (chartRoot) {
      chartRoot.innerHTML = `
        <div class="elev-empty-state">
          <div class="elev-empty-icon">🏔️</div>
          <div class="elev-empty-msg">Select an individual day to view its detailed elevation profile.</div>
        </div>
      `;
    }
  }

  /**
   * Renders the ordered stop items in the sidebar.
   */
  function renderSidebarStopList(stops) {
    const listEl = document.getElementById('visStopList');
    if (!listEl) return;

    if (!stops || !stops.length) {
      listEl.innerHTML = '<div class="vis-empty-stops">No active stops for this day.</div>';
      return;
    }

    let html = '';
    stops.forEach((stop, index) => {
      const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
      const badgeClass = isHotel ? 'hotel' : (stop.priority === 'must' ? 'must' : 'nice');
      const badgeText = isHotel ? 'HOTEL' : (stop.priority === 'must' ? 'MUST' : 'NICE');
      const isSelected = stop.id === selectedStopId;

      html += `
        <div class="vis-stop-item ${isSelected ? 'selected' : ''}" data-stop-id="${stop.id}" data-index="${index}">
          <div class="vis-stop-num">${index + 1}</div>
          <div class="vis-stop-info">
            <div class="vis-stop-name">${escapeHtml(stop.name)}</div>
            <div class="vis-stop-meta">
              <span class="vis-badge ${badgeClass}">${badgeText}</span>
              <span>Stay: ${stop.stayMin || 0}m</span>
              ${stop.notBefore ? `<span>• Not before ${stop.notBefore}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
    listEl.querySelectorAll('.vis-stop-item').forEach(item => {
      item.onclick = () => {
        const idx = Number(item.dataset.index);
        const stop = stops[idx];
        if (stop) selectStop(stop, idx + 1);
      };
    });
  }

  /**
   * Renders metric cards for a single day.
   */
  function renderDayMetrics(el, dayData) {
    if (!el || !dayData) return;
    const c = (typeof dayColor === 'function') ? dayColor(dayData.date) : '#56c6a5';

    el.innerHTML = `
      <div class="vis-metric-chip" style="border-left: 3px solid ${c};">
        <div class="vis-met-val">${dayData.distanceKm} km</div>
        <div class="vis-met-lbl">Road distance</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">~${Math.round(dayData.driveDurationMin / 60)}h ${dayData.driveDurationMin % 60}m</div>
        <div class="vis-met-lbl">Driving time</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${dayData.activeStops.length}</div>
        <div class="vis-met-lbl">Active stops</div>
      </div>
    `;
  }

  /**
   * Renders metric cards for the whole trip.
   */
  function renderWholeTripMetrics(el) {
    if (!el) return;
    const allDays = getVisualizeWholeTripData();
    const totalKm = allDays.reduce((acc, d) => acc + d.distanceKm, 0);
    const totalStops = allDays.reduce((acc, d) => acc + d.activeStops.length, 0);

    el.innerHTML = `
      <div class="vis-metric-chip">
        <div class="vis-met-val">~${Math.round(totalKm)} km</div>
        <div class="vis-met-lbl">Total route</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">5 days</div>
        <div class="vis-met-lbl">On the ground</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${totalStops}</div>
        <div class="vis-met-lbl">Total stops</div>
      </div>
    `;
  }

  /* ============================================================
   * 5. CAMERA CONTROLS & PRESETS
   * ============================================================ */

  /**
   * Fits camera to the currently active route or stops.
   */
  function fitActiveRoute() {
    if (!map3D) return;
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';

    if (currentDay === 'all') {
      flyToWholeTripOverview();
      return;
    }

    const dayData = getVisualizeDayData(currentDay);
    if (!dayData || !dayData.activeStops.length) return;

    const stops = dayData.activeStops;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

    stops.forEach(s => {
      if (s.lat < minLat) minLat = s.lat;
      if (s.lat > maxLat) maxLat = s.lat;
      if (s.lng < minLng) minLng = s.lng;
      if (s.lng > maxLng) maxLng = s.lng;
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Estimate range based on bounding box diagonal
    const dLat = (maxLat - minLat) * 111000;
    const dLng = (maxLng - minLng) * 111000 * Math.cos(centerLat * Math.PI / 180);
    const spanMeters = Math.sqrt(dLat * dLat + dLng * dLng);
    const targetRange = Math.max(12000, Math.min(180000, spanMeters * 1.5));

    // Choose heading roughly aligned with Rockies valley direction (NW: ~330°)
    flyCameraTo({
      center: { lat: centerLat, lng: centerLng, altitude: 1500 },
      range: Math.max(28000, targetRange),
      tilt: 56,
      heading: 330,
      durationMillis: prefersReducedMotion() ? 0 : 2200
    });
  }

  /**
   * Flies camera to an oblique whole-trip overview.
   */
  function flyToWholeTripOverview() {
    if (!map3D) return;
    flyCameraTo({
      center: { lat: 51.95, lng: -116.35, altitude: 1500 },
      range: 240000,
      tilt: 56,
      heading: 325,
      durationMillis: prefersReducedMotion() ? 0 : 2500
    });
  }

  /**
   * Smoothly orbits camera 360 degrees around the selected stop's mountain basin.
   */
  function orbitCurrentStop() {
    if (!map3D) return;
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const dayData = getVisualizeDayData(currentDay);
    const stops = dayData ? dayData.activeStops : [];
    const stop = stops.find(s => s.id === selectedStopId) || (stops.length ? stops[0] : null);
    if (!stop) return;

    if (isFlying) cancelRouteFlyThrough(false);

    const profile = getLandmarkCameraProfile(stop);
    const targetAltitude = profile.elevation || 1500;
    const center = {
      lat: stop.lat + (profile.targetOffset?.lat || 0),
      lng: stop.lng + (profile.targetOffset?.lng || 0),
      altitude: targetAltitude
    };

    if (typeof map3D.flyCameraAround === 'function') {
      map3D.flyCameraAround({
        camera: {
          center,
          range: Math.max(4500, Math.round(profile.range * 1.15)),
          tilt: Math.min(58, profile.tilt),
          heading: profile.heading
        },
        durationMillis: prefersReducedMotion() ? 0 : 16000,
        repeatCount: 1
      });
    } else {
      adjustCamera({ headingDelta: 60 });
    }
  }

  /**
   * Resets camera to the stop's signature vantage view.
   */
  function refocusCurrentStop() {
    if (!map3D || !selectedStopId) return;
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const dayData = getVisualizeDayData(currentDay);
    const stops = dayData ? dayData.activeStops : [];
    const idx = stops.findIndex(s => s.id === selectedStopId);
    if (idx !== -1) {
      selectStop(stops[idx], idx + 1, { durationMillis: 800 });
    }
  }

  /**
   * Advances or steps back to adjacent stop along the day's route.
   */
  function stepAdjacentStop(direction) {
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const dayData = getVisualizeDayData(currentDay);
    const stops = dayData ? dayData.activeStops : [];
    if (!stops.length) return;

    let currentIndex = stops.findIndex(s => s.id === selectedStopId);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = stops.length - 1;
    if (nextIndex >= stops.length) nextIndex = 0;

    selectStop(stops[nextIndex], nextIndex + 1);
  }

  /**
   * Hides the stop inspector card.
   */
  function closeStopCard() {
    selectedStopId = null;
    const sideCard = document.getElementById('visSelectedStopCard');
    const mapCard = document.getElementById('visMapStopCard');
    if (sideCard) sideCard.classList.add('hidden');
    if (mapCard) mapCard.classList.add('hidden');
    document.querySelectorAll('.vis-stop-item').forEach(el => el.classList.remove('selected'));
  }

  /**
   * Renders the Stop Inspector Card into both the sidebar and map overlay.
   */
  function renderStopInspectorCard(stop, indexNumber, profile, totalStops) {
    const sideCard = document.getElementById('visSelectedStopCard');
    const mapCard = document.getElementById('visMapStopCard');
    if (!sideCard && !mapCard) return;

    const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
    const badgeClass = isHotel ? 'hotel' : (stop.priority === 'must' ? 'must' : 'nice');
    const badgeText = isHotel ? 'HOTEL' : (stop.priority === 'must' ? 'MUST DO' : 'NICE TO HAVE');
    const elevText = profile.elevation ? `⛰ ~${profile.elevation} m` : '';
    const stayText = stop.stayMin ? `⏱ ${stop.stayMin} min stay` : '';

    const contentHtml = `
      <div class="vis-stop-card-head">
        <div class="vis-stop-card-title-wrap">
          <div class="vis-stop-card-step">Stop ${indexNumber} of ${totalStops}</div>
          <div class="vis-stop-card-title">${escapeHtml(stop.name)}</div>
        </div>
        <button class="vis-stop-card-close" title="Close inspector" aria-label="Close inspector">✕</button>
      </div>

      <div class="vis-stop-card-tags">
        <span class="vis-badge ${badgeClass}">${badgeText}</span>
        ${stayText ? `<span class="vis-pill">${stayText}</span>` : ''}
        ${elevText ? `<span class="vis-pill">${elevText}</span>` : ''}
        <span class="vis-pill">🔭 ${profile.heading}° bearing</span>
      </div>

      <div class="vis-stop-card-context">
        <span class="vis-context-icon">🏔️</span>
        <span class="vis-context-text"><b>Vantage:</b> ${escapeHtml(profile.viewContext)}</span>
      </div>

      <div class="vis-stop-card-actions">
        <button class="btn primary small vis-orbit-btn" title="360° orbital flight around mountain basin">🔄 360° Orbit</button>
        <button class="btn small vis-refocus-btn" title="Reset to signature mountain vantage point">👁️ Signature</button>
        <div class="vis-stop-card-nav">
          <button class="btn small icon vis-prev-btn" title="Previous stop" aria-label="Previous stop">◀</button>
          <button class="btn small icon vis-next-btn" title="Next stop" aria-label="Next stop">▶</button>
        </div>
        <a href="https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}" target="_blank" rel="noopener" class="btn small" title="Open location in Google Maps">Google Maps ↗</a>
      </div>
    `;

    const bindCardEvents = (cardEl) => {
      if (!cardEl) return;
      cardEl.innerHTML = contentHtml;
      const closeBtn = cardEl.querySelector('.vis-stop-card-close');
      if (closeBtn) closeBtn.onclick = closeStopCard;

      const orbitBtn = cardEl.querySelector('.vis-orbit-btn');
      if (orbitBtn) orbitBtn.onclick = orbitCurrentStop;

      const refocusBtn = cardEl.querySelector('.vis-refocus-btn');
      if (refocusBtn) refocusBtn.onclick = refocusCurrentStop;

      const prevBtn = cardEl.querySelector('.vis-prev-btn');
      if (prevBtn) prevBtn.onclick = () => stepAdjacentStop(-1);

      const nextBtn = cardEl.querySelector('.vis-next-btn');
      if (nextBtn) nextBtn.onclick = () => stepAdjacentStop(1);
    };

    if (sideCard) {
      bindCardEvents(sideCard);
      sideCard.classList.remove('hidden');
      sideCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (mapCard) {
      bindCardEvents(mapCard);
      const workspace = document.getElementById('visualizeWorkspace');
      const isMapOnly = workspace && workspace.classList.contains('map-only');
      mapCard.classList.toggle('hidden', !isMapOnly);
    }
  }

  /**
   * Flies camera to focus on a specific stop using curated landmark vantage points.
   */
  function selectStop(stop, indexNumber, options = {}) {
    if (!stop || !map3D) return;
    selectedStopId = stop.id;

    if (isFlying) cancelRouteFlyThrough(false);

    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const dayData = getVisualizeDayData(currentDay);
    const stops = dayData ? dayData.activeStops : [];
    const totalStops = stops.length || 1;
    const idx = indexNumber || (stops.findIndex(s => s.id === stop.id) + 1) || 1;

    // 1. Highlight item in sidebar
    document.querySelectorAll('.vis-stop-item').forEach(el => {
      const isMatch = el.dataset.stopId === stop.id;
      el.classList.toggle('selected', isMatch);
    });

    if (options.scrollIntoView === true) {
      const activeEl = document.querySelector(`.vis-stop-item[data-stop-id="${stop.id}"]`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 2. Fetch curated camera profile for this stop
    const profile = getLandmarkCameraProfile(stop);

    // 3. Render Inspector Card
    renderStopInspectorCard(stop, idx, profile, totalStops);

    // 4. Compute target coordinates with authentic mountain elevation
    const targetLat = stop.lat + (profile.targetOffset ? profile.targetOffset.lat : 0);
    const targetLng = stop.lng + (profile.targetOffset ? profile.targetOffset.lng : 0);
    const targetAltitude = profile.elevation || 1500;

    // 5. Fly camera smoothly to signature vantage point
    flyCameraTo({
      center: { lat: targetLat, lng: targetLng, altitude: targetAltitude },
      range: profile.range,
      tilt: profile.tilt,
      heading: profile.heading,
      durationMillis: prefersReducedMotion() ? 0 : (options.durationMillis || 1800)
    });

    setTimeout(refreshCameraReadout, prefersReducedMotion() ? 0 : 400);
  }

  /**
   * Selects a stop by its ID across the active day.
   */
  function selectStopById(stopId, options = {}) {
    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    const dayData = getVisualizeDayData(currentDay);
    if (!dayData || !dayData.activeStops) return;
    const idx = dayData.activeStops.findIndex(s => s.id === stopId);
    if (idx !== -1) {
      selectStop(dayData.activeStops[idx], idx + 1, options);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function normalizeHeading(value) {
    const n = Number(value) || 0;
    return ((n % 360) + 360) % 360;
  }

  function getCurrentCameraCenter() {
    const center = map3D && map3D.center;
    if (center && Number.isFinite(Number(center.lat)) && Number.isFinite(Number(center.lng))) {
      return {
        lat: Number(center.lat),
        lng: Number(center.lng),
        altitude: Number(center.altitude || 0)
      };
    }
    return { lat: 51.5, lng: -116.1, altitude: 0 };
  }

  function refreshCameraReadout() {
    const readout = document.getElementById('visCameraReadout');
    if (!readout || !map3D) return;
    const tilt = Math.round(Number(map3D.tilt) || 0);
    const range = Math.max(1, Number(map3D.range) || 0);
    const rangeLabel = range >= 1000 ? `${(range / 1000).toFixed(range >= 10000 ? 0 : 1)} km` : `${Math.round(range)} m`;
    readout.textContent = `${tilt}° • ${rangeLabel}`;
  }

  /**
   * Manual camera pad adjustment. These controls are intentionally simple and
   * complement Google's native move/zoom/rotate/tilt/compass controls.
   */
  function adjustCamera(change = {}) {
    if (!map3D) return;
    if (isFlying) cancelRouteFlyThrough(false);

    const currentRange = Math.max(250, Number(map3D.range) || 12000);
    const currentTilt = clamp(Number(map3D.tilt) || 55, 0, 80);
    const currentHeading = normalizeHeading(map3D.heading);

    const range = clamp(
      change.rangeFactor ? currentRange * change.rangeFactor : currentRange,
      250,
      400000
    );
    const tilt = clamp(
      currentTilt + (Number(change.tiltDelta) || 0),
      0,
      80
    );
    const heading = change.heading !== undefined
      ? normalizeHeading(change.heading)
      : normalizeHeading(currentHeading + (Number(change.headingDelta) || 0));

    flyCameraTo({
      center: getCurrentCameraCenter(),
      range,
      tilt,
      heading,
      durationMillis: prefersReducedMotion() ? 0 : 180
    });
    setTimeout(refreshCameraReadout, prefersReducedMotion() ? 0 : 220);
  }

  /**
   * Resets camera to the active route framing.
   */
  function resetCamera() {
    fitActiveRoute();
  }

  /**
   * Switches camera presets while preserving the user's current map target.
   * Presets no longer jump back to the first itinerary stop.
   */
  function setCameraPreset(preset) {
    if (!map3D) return;
    if (isFlying) cancelRouteFlyThrough(false);
    const center = getCurrentCameraCenter();

    if (preset === 'dollhouse') {
      flyCameraTo({
        center,
        range: 5200,
        tilt: 60,
        heading: normalizeHeading(map3D.heading || 330),
        durationMillis: prefersReducedMotion() ? 0 : 850
      });
    } else if (preset === 'valley') {
      flyCameraTo({
        center,
        range: Math.min(Math.max(Number(map3D.range) || 4500, 2500), 12000),
        tilt: 72,
        heading: normalizeHeading(map3D.heading || 335),
        durationMillis: prefersReducedMotion() ? 0 : 650
      });
    } else if (preset === 'high') {
      flyCameraTo({
        center,
        range: Math.max(35000, Math.min(Number(map3D.range) * 4 || 85000, 120000)),
        tilt: 35,
        heading: normalizeHeading(map3D.heading),
        durationMillis: prefersReducedMotion() ? 0 : 800
      });
    }
  }

  /**
   * Wraps map3D.flyCameraTo with safety checks, mountain elevation validation, and clearance fallback.
   */
  function flyCameraTo(options) {
    if (!map3D) return;
    try {
      const targetAltitude = (options.center && options.center.altitude != null && options.center.altitude > 0)
        ? options.center.altitude
        : 1480;

      const safeCenter = {
        lat: options.center ? options.center.lat : 51.5,
        lng: options.center ? options.center.lng : -116.1,
        altitude: targetAltitude
      };

      const safeRange = Math.max(3200, Number(options.range) || 6000);
      const safeTilt = clamp(Number(options.tilt) || 55, 15, 75);
      const safeHeading = normalizeHeading(options.heading);
      const durationMillis = prefersReducedMotion() ? 0 : (options.durationMillis == null ? 1800 : options.durationMillis);

      if (typeof map3D.flyCameraTo === 'function') {
        map3D.flyCameraTo({
          endCamera: {
            center: safeCenter,
            range: safeRange,
            tilt: safeTilt,
            heading: safeHeading
          },
          durationMillis
        });
      } else {
        // Direct property fallback
        map3D.center = safeCenter;
        map3D.range = safeRange;
        map3D.tilt = safeTilt;
        map3D.heading = safeHeading;
      }
    } catch (err) {
      try {
        map3D.center = options.center;
        map3D.range = options.range;
        map3D.tilt = options.tilt;
        map3D.heading = options.heading;
      } catch (_) {}
    }
  }

  /**
   * Sets map display mode ('HYBRID' or 'SATELLITE').
   */
  function setMapMode(mode) {
    currentMapMode = mode;
    if (map3D) {
      try {
        map3D.mode = mode;
      } catch (_) {}
    }

    const hybridBtn = document.getElementById('visModeHybridBtn');
    const satBtn = document.getElementById('visModeSatBtn');
    if (hybridBtn) hybridBtn.classList.toggle('on', mode === 'HYBRID');
    if (satBtn) satBtn.classList.toggle('on', mode === 'SATELLITE');
  }

  /* ============================================================
   * 6. ROUTE FLY-THROUGH ("CINEMATIC DOLLHOUSE FLYOVER")
   * ============================================================ */

  /**
   * Generates a cinematic dollhouse flight trajectory for a day.
   * Instead of thousands of tiny 140m steps that stutter and crawl,
   * this builds a smooth 10-18 point keyframe spline connecting all active stops
   * and high-clearance highway corridor passes.
   */
  function generateDollhouseFlightTrajectory(dayData) {
    if (!dayData || !dayData.activeStops || dayData.activeStops.length === 0) return [];
    const stops = dayData.activeStops;
    const routeCoords = (dayData.routeCoordinates && dayData.routeCoordinates.length >= 2)
      ? dayData.routeCoordinates
      : null;

    const waypoints = [];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const profile = getLandmarkCameraProfile(stop);
      const targetLat = stop.lat + (profile.targetOffset ? profile.targetOffset.lat : 0);
      const targetLng = stop.lng + (profile.targetOffset ? profile.targetOffset.lng : 0);
      const targetAltitude = profile.elevation || 1500;

      // Add stop landmark waypoint with curated dollhouse vista
      waypoints.push({
        isStop: true,
        stopId: stop.id,
        stopIndex: i + 1,
        totalStops: stops.length,
        name: stop.name,
        lat: targetLat,
        lng: targetLng,
        altitude: targetAltitude,
        range: profile.range || 5500,
        tilt: profile.tilt || 56,
        heading: profile.heading || 330,
        viewContext: profile.viewContext || "Glacial basin & surrounding peaks",
        flightDuration: 3600,
        hoverDuration: 1300
      });

      // If there's a subsequent stop, evaluate if highway corridor waypoints are needed
      if (i < stops.length - 1) {
        const nextStop = stops[i + 1];
        const distMeters = Math.hypot((nextStop.lat - stop.lat) * 111000, (nextStop.lng - stop.lng) * 78000);

        if (distMeters > 16000) {
          // Determine how many intermediate corridor vistas based on distance
          const corridorCount = distMeters > 55000 ? 2 : 1;
          for (let c = 1; c <= corridorCount; c++) {
            const fraction = c / (corridorCount + 1);
            const midCoord = sampleRouteCoordinate(routeCoords, stop, nextStop, fraction);
            const heading = midCoord.heading != null ? midCoord.heading : computeBearing(stop, nextStop);
            const corridorName = getCorridorName(stop, nextStop, fraction);

            waypoints.push({
              isStop: false,
              stopId: null,
              stopIndex: i + 1,
              totalStops: stops.length,
              name: corridorName,
              lat: midCoord.lat,
              lng: midCoord.lng,
              altitude: midCoord.altitude || 1480,
              range: 7000, // High-angle dollhouse perspective
              tilt: 58,   // Movie tilt-shift angle
              heading: heading,
              viewContext: "High-angle dollhouse flight over winding mountain highway",
              flightDuration: 3000,
              hoverDuration: 0 // Continuous smooth sweep
            });
          }
        }
      }
    }

    return waypoints;
  }

  /**
   * Calculates geographic compass heading from p1 to p2 in degrees (0-360).
   */
  function computeBearing(p1, p2) {
    if (!p1 || !p2) return 0;
    if (typeof window !== 'undefined' && window.VisualizeElevation && window.VisualizeElevation.computeBearing) {
      return window.VisualizeElevation.computeBearing(p1, p2);
    }
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /**
   * Samples a coordinate and heading along the route geometry between two stops.
   */
  function sampleRouteCoordinate(routeCoords, stop1, stop2, fraction) {
    if (routeCoords && routeCoords.length >= 2) {
      let idx1 = -1;
      let idx2 = -1;
      let minD1 = Infinity;
      let minD2 = Infinity;

      for (let i = 0; i < routeCoords.length; i++) {
        const c = routeCoords[i];
        const d1 = Math.hypot(c[1] - stop1.lat, c[0] - stop1.lng);
        const d2 = Math.hypot(c[1] - stop2.lat, c[0] - stop2.lng);
        if (d1 < minD1) { minD1 = d1; idx1 = i; }
        if (d2 < minD2) { minD2 = d2; idx2 = i; }
      }

      if (idx1 !== -1 && idx2 !== -1 && idx1 !== idx2) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const targetIdx = idx1 < idx2
          ? Math.round(start + (end - start) * fraction)
          : Math.round(end - (end - start) * fraction);
        const coord = routeCoords[targetIdx];
        const fwdIdx = Math.min(routeCoords.length - 1, targetIdx + 4);
        const fwdCoord = routeCoords[fwdIdx];
        const heading = computeBearing(
          { lat: coord[1], lng: coord[0] },
          { lat: fwdCoord[1], lng: fwdCoord[0] }
        );
        return { lat: coord[1], lng: coord[0], heading, altitude: 1480 };
      }
    }

    // Fallback: linear interpolation
    const lat = stop1.lat + (stop2.lat - stop1.lat) * fraction;
    const lng = stop1.lng + (stop2.lng - stop1.lng) * fraction;
    const heading = computeBearing(stop1, stop2);
    return { lat, lng, heading, altitude: 1480 };
  }

  /**
   * Gives a human-friendly scenic corridor name based on nearby attractions.
   */
  function getCorridorName(s1, s2, fraction) {
    const combined = `${s1.name || ''} ${s2.name || ''}`.toLowerCase();
    if (combined.includes('icefield') || combined.includes('jasper') || combined.includes('sunwapta') || combined.includes('athabasca') || combined.includes('hinton')) {
      return 'Icefields Parkway (Hwy 93N)';
    }
    if (combined.includes('louise') || combined.includes('cochrane') || combined.includes('canmore') || combined.includes('banff') || combined.includes('airport') || combined.includes('yyc')) {
      return 'Bow Valley Corridor (Trans-Canada Hwy)';
    }
    if (combined.includes('maligne') || combined.includes('medicine')) {
      return 'Maligne Valley Mountain Pass';
    }
    if (combined.includes('yoho') || combined.includes('emerald') || combined.includes('bridge')) {
      return 'Kicking Horse Canyon Pass';
    }
    return 'Canadian Rockies Mountain Pass';
  }

  /**
   * Primary Play action: enter the route-level virtual world and continuously
   * drive the exact OSRM road geometry. The previous landmark flyover remains
   * available through the secondary Flyover button.
   */
  async function startRouteFlyThrough() {
    if (isFlying) {
      cancelRouteFlyThrough(false);
      return;
    }
    if (prefersReducedMotion()) {
      if (typeof alert === 'function') alert('Route drive animation is disabled because reduced motion is enabled. You can still open World and explore manually.');
      return;
    }

    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    if (currentDay === 'all') {
      if (typeof alert === 'function') alert('Select an individual day before driving the route.');
      return;
    }

    try {
      await activateWorldView(false);
      const VW = (typeof window !== 'undefined') ? window.VisualizeWorld : null;
      if (!VW || worldReadyDay !== currentDay) throw new Error('Virtual world is not ready.');

      isFlying = true;
      isFlightPaused = false;
      updateFlightHudVisibility(true);
      const playBtn = document.getElementById('visPlayRouteBtn');
      if (playBtn) playBtn.textContent = '⏹ Stop drive';
      document.querySelectorAll('.vis-flight-badge').forEach(el => el.textContent = 'VIRTUAL WORLD DRIVE');
      VW.setSpeed(flightSpeedMultiplier);
      VW.setCameraMode(worldCameraMode);
      VW.play({ speed: flightSpeedMultiplier, cameraMode: worldCameraMode });
    } catch (err) {
      isFlying = false;
      isFlightPaused = false;
      updateFlightHudVisibility(false);
      // Keep Explorer usable. Do not silently launch a totally different movie
      // after a world-loading failure; surface the configuration problem instead.
    }
  }

  /**
   * Starts a cinematic dollhouse movie flyover along the day's active route geometry.
   */
  function startDollhouseFlyThrough() {
    if (isFlying) {
      cancelRouteFlyThrough();
      return;
    }
    setRenderer('explorer');

    const currentDay = (typeof S !== 'undefined' && S.selectedDay) ? S.selectedDay : 'Sep 26';
    if (currentDay === 'all') {
      alert('Please select an individual day before playing route.');
      return;
    }

    const dayData = getVisualizeDayData(currentDay);
    if (!dayData || !dayData.activeStops || dayData.activeStops.length === 0) {
      alert('No stops available to play.');
      return;
    }

    if (prefersReducedMotion()) {
      alert('Route animation skipped because reduced motion is enabled in your system preferences. You can click individual stops to inspect them.');
      return;
    }

    flightTrajectory = generateDollhouseFlightTrajectory(dayData);
    if (flightTrajectory.length === 0) return;

    flightLegIndex = 0;
    isFlying = true;
    isFlightPaused = false;

    // Show HUDs in sidebar and floating map overlay
    updateFlightHudVisibility(true);

    const playBtn = document.getElementById('visPlayRouteBtn');
    if (playBtn) playBtn.textContent = '⏹ Stop flight';

    executeDollhouseFlightStep();
  }

  /**
   * Updates flight HUD elements across sidebar and floating map overlay.
   */
  function updateFlightHudVisibility(show) {
    const sidebarHud = document.getElementById('visFlightHud');
    const mapHud = document.getElementById('visMapFlightHud');
    const workspace = document.getElementById('visualizeWorkspace');
    const isMapOnly = workspace && workspace.classList.contains('map-only');

    if (sidebarHud) sidebarHud.classList.toggle('hidden', !show || isMapOnly);
    if (mapHud) mapHud.classList.toggle('hidden', !show || !isMapOnly);
  }

  /**
   * Executes next keyframe in the smooth dollhouse flight.
   */
  function executeDollhouseFlightStep() {
    if (!isFlying || isFlightPaused || !map3D) return;

    if (flightLegIndex >= flightTrajectory.length) {
      finishFlyThrough();
      return;
    }

    const wp = flightTrajectory[flightLegIndex];
    const pct = Math.round((flightLegIndex / (flightTrajectory.length - 1)) * 100);

    // Update HUD titles, subtitles, badges, and progress bar across all HUD instances
    const titleText = wp.isStop
      ? `Stop ${wp.stopIndex} of ${wp.totalStops}: ${wp.name}`
      : `Cruising: ${wp.name}`;
    const subText = wp.isStop
      ? `🏔️ ${wp.viewContext}`
      : `Glacial valleys & mountain highway (${pct}%)`;
    const badgeText = wp.isStop ? 'LANDMARK VISTA' : 'CORRIDOR PASS';

    document.querySelectorAll('.vis-flight-hud-title').forEach(el => el.textContent = titleText);
    document.querySelectorAll('.vis-flight-hud-sub').forEach(el => el.textContent = subText);
    document.querySelectorAll('.vis-flight-badge').forEach(el => el.textContent = badgeText);
    document.querySelectorAll('.vis-flight-progress-fill').forEach(el => el.style.width = `${pct}%`);

    // Highlight stop in left panel if this waypoint represents a stop
    if (wp.stopId) {
      document.querySelectorAll('.vis-stop-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.stopId === wp.stopId);
      });
      const activeEl = document.querySelector(`.vis-stop-item[data-stop-id="${wp.stopId}"]`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Fly camera smoothly to this dollhouse keyframe
    const flightDur = Math.round(wp.flightDuration / flightSpeedMultiplier);
    flyCameraTo({
      center: { lat: wp.lat, lng: wp.lng, altitude: wp.altitude },
      range: wp.range,
      tilt: wp.tilt,
      heading: wp.heading,
      durationMillis: flightDur
    });

    // Schedule next waypoint: flight time + brief landmark hover
    const hoverDur = wp.hoverDuration ? Math.round(wp.hoverDuration / flightSpeedMultiplier) : 0;
    const totalLegTime = flightDur + hoverDur;

    if (flightTimeoutId) clearTimeout(flightTimeoutId);
    flightTimeoutId = setTimeout(() => {
      if (!isFlying || isFlightPaused) return;
      flightLegIndex++;
      executeDollhouseFlightStep();
    }, totalLegTime);
  }

  /**
   * Sets playback speed multiplier (0.5x, 1x, 2x).
   */
  function setFlightSpeed(speed) {
    if (!speed || speed <= 0) return;
    flightSpeedMultiplier = speed;
    if (currentRenderer === 'world' && typeof window !== 'undefined' && window.VisualizeWorld) {
      window.VisualizeWorld.setSpeed(speed);
    }

    document.querySelectorAll('.vis-flight-speed-tag').forEach(el => {
      el.textContent = `${speed}x`;
    });

    document.querySelectorAll('.vis-speed-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.speed) === speed);
    });

    // If currently flying and not paused, re-adjust current step timing
    if (isFlying && !isFlightPaused) {
      if (flightTimeoutId) clearTimeout(flightTimeoutId);
      flightLegIndex = Math.min(flightTrajectory.length - 1, flightLegIndex + 1);
      executeDollhouseFlightStep();
    }
  }

  /**
   * Skips forward or backward to adjacent stops.
   */
  function skipFlightLeg(delta) {
    if (!isFlying) return;
    if (currentRenderer === 'world' && typeof window !== 'undefined' && window.VisualizeWorld) {
      const status = window.VisualizeWorld.getStatus();
      if (!worldStopsWithDistances.length) return;
      const current = Number(status.progress || 0);
      let targetIndex = delta > 0 ? worldStopsWithDistances.length - 1 : 0;
      if (delta > 0) {
        targetIndex = worldStopsWithDistances.findIndex(entry => Number(entry.fraction || 0) > current + 0.01);
        if (targetIndex < 0) targetIndex = worldStopsWithDistances.length - 1;
      } else {
        for (let i = worldStopsWithDistances.length - 1; i >= 0; i--) {
          if (Number(worldStopsWithDistances[i].fraction || 0) < current - 0.01) { targetIndex = i; break; }
        }
      }
      window.VisualizeWorld.setProgress(Number(worldStopsWithDistances[targetIndex].fraction || 0));
      return;
    }
    if (!flightTrajectory.length) return;
    if (flightTimeoutId) clearTimeout(flightTimeoutId);

    // Find next/prev stop waypoint in trajectory
    let target = flightLegIndex + delta;
    while (target >= 0 && target < flightTrajectory.length && !flightTrajectory[target].isStop) {
      target += delta;
    }
    flightLegIndex = clamp(target, 0, flightTrajectory.length - 1);
    executeDollhouseFlightStep();
  }

  /**
   * Pauses / resumes route flight.
   */
  function togglePauseFlyThrough() {
    if (!isFlying) return;
    if (currentRenderer === 'world' && typeof window !== 'undefined' && window.VisualizeWorld) {
      isFlightPaused = window.VisualizeWorld.togglePause();
    } else {
      isFlightPaused = !isFlightPaused;
    }

    ['visPauseFlightBtn', 'visMapPauseFlightBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.textContent = isFlightPaused ? '▶' : '⏸';
    });

    if (isFlightPaused) {
      if (flightTimeoutId) clearTimeout(flightTimeoutId);
    } else if (currentRenderer !== 'world') {
      executeDollhouseFlightStep();
    }
  }

  function finishWorldDrive() {
    isFlying = false;
    isFlightPaused = false;
    updateFlightHudVisibility(false);
    const playBtn = document.getElementById('visPlayRouteBtn');
    if (playBtn) playBtn.textContent = '▶ Drive route';
    document.querySelectorAll('.vis-flight-badge').forEach(el => el.textContent = 'VIRTUAL WORLD DRIVE');
  }

  /**
   * Cancels and resets route fly-through.
   */
  function cancelRouteFlyThrough(restoreFit = false) {
    isFlying = false;
    isFlightPaused = false;
    if (flightTimeoutId) clearTimeout(flightTimeoutId);
    if (currentRenderer === 'world' && typeof window !== 'undefined' && window.VisualizeWorld) {
      window.VisualizeWorld.stop(restoreFit);
    }

    updateFlightHudVisibility(false);

    const playBtn = document.getElementById('visPlayRouteBtn');
    if (playBtn) playBtn.textContent = '▶ Drive route';

    ['visPauseFlightBtn', 'visMapPauseFlightBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.textContent = '⏸';
    });

    if (restoreFit) fitActiveRoute();
    else refreshCameraReadout();
  }

  /**
   * Called when flight finishes naturally.
   */
  function finishFlyThrough() {
    isFlying = false;
    isFlightPaused = false;
    if (flightTimeoutId) clearTimeout(flightTimeoutId);

    updateFlightHudVisibility(false);

    const playBtn = document.getElementById('visPlayRouteBtn');
    if (playBtn) playBtn.textContent = '▶ Drive route';

    ['visPauseFlightBtn', 'visMapPauseFlightBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.textContent = '⏸';
    });

    refreshCameraReadout();
  }

  /* ============================================================
   * 7. ELEVATION PROFILE INTEGRATION
   * ============================================================ */

  /**
   * Fetches and renders the route elevation profile for the selected day.
   */
  function updateElevationProfileForDay(dayData) {
    const chartRoot = document.getElementById('visElevChartRoot');
    const pill = document.getElementById('visElevStatsPill');
    if (!chartRoot || !dayData) return;

    const coords = dayData.routeCoordinates;
    if (!coords || coords.length < 2) {
      if (pill) pill.textContent = 'No route geometry';
      chartRoot.innerHTML = `
        <div class="elev-empty-state">
          <div class="elev-empty-icon">🏔️</div>
          <div class="elev-empty-msg">No driving route coordinates found for this day.</div>
        </div>
      `;
      return;
    }

    if (pill) pill.textContent = 'Sampling terrain elevation…';

    const VE = (typeof window !== 'undefined' && window.VisualizeElevation)
      ? window.VisualizeElevation
      : null;

    if (!VE) {
      if (pill) pill.textContent = 'Module loading…';
      return;
    }

    VE.fetchElevationProfile(coords, { stops: dayData.activeStops })
      .then(profile => {
        currentElevationProfile = profile;

        if (profile.stats) {
          const s = profile.stats;
          const prefix = profile.isEstimated ? 'DEM estimate • ' : '';
          if (pill) {
            pill.textContent = `${prefix}Low: ${s.minElevation} m • High: ${s.maxElevation} m • Range: ${s.elevationRange} m`;
          }
        } else {
          if (pill) pill.textContent = 'Terrain elevation (demo)';
        }

        const stopsWithDistances = VE.mapStopsToDistances(dayData.activeStops, coords);
        const dayColorCode = (typeof dayColor === 'function') ? dayColor(dayData.date) : '#56c6a5';

        VE.renderElevationChart(chartRoot, profile, {
          totalDistanceMeters: dayData.distanceKm * 1000,
          dayColor: dayColorCode,
          stopsWithDistances,
          onHover: (sample) => {
            // Hover synchronization with 3D camera / position
          }
        });
      })
      .catch(err => {
        if (pill) pill.textContent = 'Elevation unavailable';
        chartRoot.innerHTML = `
          <div class="elev-empty-state">
            <div class="elev-empty-icon">⚠️</div>
            <div class="elev-empty-msg">Could not load elevation data: ${escapeHtml(err.message || String(err))}</div>
          </div>
        `;
      });
  }

  /* ============================================================
   * 8. SETUP / FALLBACK / ERROR STATES
   * ============================================================ */

  /**
   * Renders the setup state when no API key is configured.
   */
  function renderSetupState() {
    const root = document.getElementById('visualizeview');
    if (!root) return;

    root.innerHTML = `
      <div class="visualize-setup-container glass">
        <div class="vis-setup-card">
          <div class="vis-setup-badge">🏔️ Photorealistic 3D Setup</div>
          <h2>3D Terrain Requires a Google Maps API Key</h2>
          <p>
            The 3D Visualize tab places the exact Banff &amp; Jasper itinerary onto real Canadian Rockies
            topography using Google Maps JavaScript API 3D Maps (<gmp-map-3d>).
          </p>

          <div class="vis-setup-instructions">
            <div class="ey">How to configure:</div>
            <ol>
              <li>Create or obtain a Google Cloud API Key with the <b>Maps JavaScript API</b> enabled.</li>
              <li>Launch the planner server with the environment variable:<br>
                <code>GOOGLE_MAPS_API_KEY="AIzaSy..." npm start</code>
              </li>
              <li>Or test immediately below by providing a key in this browser session (saved in your browser only):</li>
            </ol>
          </div>

          <div class="vis-setup-form">
            <label for="visApiKeyInput">Google Maps API Key (browser session only):</label>
            <div class="vis-setup-input-group">
              <input type="password" id="visApiKeyInput" class="input" placeholder="AIzaSy..." autocomplete="off" />
              <button class="btn primary" id="visSaveKeyBtn">Save &amp; Load 3D</button>
            </div>
            <small style="color: var(--muted); display: block; margin-top: 6px;">
              Keys stay in this browser session. Recommended: restrict your key to HTTP referrer / application origin.
            </small>
          </div>

          <div class="actions" style="margin-top: 18px;">
            <button class="btn" onclick="setView('mapview')">← Return to 2D Map</button>
            <button class="btn" onclick="setView('planview')">Return to Plan</button>
          </div>
        </div>
      </div>
    `;

    const saveBtn = document.getElementById('visSaveKeyBtn');
    const input = document.getElementById('visApiKeyInput');
    if (saveBtn && input) {
      saveBtn.onclick = () => {
        const val = input.value.trim();
        if (!val) {
          alert('Please enter a valid Google Maps API Key.');
          return;
        }
        setLocalApiKey(val);
        onVisualizeTabActivated();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
      });
    }
  }

  /**
   * Displays an error state if WebGL or API fails.
   */
  function renderErrorState(err) {
    const overlay = document.getElementById('visualizeOverlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="vis-overlay-card glass">
        <div class="vis-overlay-icon">⚠️</div>
        <h3>3D Map Notice</h3>
        <p>${escapeHtml(err.message || 'Unable to load 3D terrain on this device.')}</p>
        <p style="font-size:12px; color:var(--muted)">
          Verify that WebGL is enabled and that your Google Maps API key has the Maps JavaScript API and 3D Maps enabled.
        </p>
        <div class="actions" style="margin-top:14px;">
          <button class="btn primary" onclick="setView('mapview')">Switch to 2D Map</button>
          <button class="btn" onclick="Visualize3D.clearLocalKeyAndReload()">Change API Key</button>
        </div>
      </div>
    `;
  }

  /**
   * Clears any locally entered key and reloads setup view.
   */
  function clearLocalKeyAndReload() {
    setLocalApiKey('');
    isInitialized = false;
    map3D = null;
    maps3dLib = null;
    isGoogleMapsLoaded = false;
    loadingPromise = null;
    renderSetupState();
  }

  /**
   * Shows a loading overlay.
   */
  function renderLoadingState(message) {
    const overlay = document.getElementById('visualizeOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="vis-overlay-card glass">
        <div class="vis-spinner"></div>
        <p style="margin-top:12px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * Hides the overlay.
   */
  function hideOverlay() {
    const overlay = document.getElementById('visualizeOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function escapeHtml(unsafe) {
    return String(unsafe || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  // Interactive keyboard shortcuts when in 3D Visualize view
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      const visView = document.getElementById('visualizeview');
      if (!visView || !visView.classList.contains('on')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target && e.target.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepAdjacentStop(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepAdjacentStop(-1);
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        orbitCurrentStop();
      } else if (e.key === ' ' && isFlying) {
        e.preventDefault();
        togglePauseFlyThrough();
      } else if (e.key === 'Escape') {
        if (isFlying) cancelRouteFlyThrough(false);
        else closeStopCard();
      }
    });
  }

  // Public module API
  return {
    onVisualizeTabActivated,
    chooseVisualizeDay,
    fitActiveRoute,
    selectStop,
    selectStopById,
    orbitCurrentStop,
    refocusCurrentStop,
    stepAdjacentStop,
    closeStopCard,
    getLandmarkCameraProfile,
    resetCamera,
    setCameraPreset,
    setMapMode,
    toggleMapOnly,
    toggleElevationDrawer,
    startRouteFlyThrough,
    startDollhouseFlyThrough,
    activateWorldView,
    setRenderer,
    setWorldCameraMode,
    cancelRouteFlyThrough,
    togglePauseFlyThrough,
    setFlightSpeed,
    skipFlightLeg,
    generateDollhouseFlightTrajectory,
    clearLocalKeyAndReload,
    getVisualizeActiveStops,
    getVisualizeRouteGeometry,
    getVisualizeDayData,
    getVisualizeWholeTripData,
    getApiKey,
    setLocalApiKey
  };
});
