/* visualize-free.js
 * Zero-cost Visualize controller.
 *
 * This file intentionally sits after visualize-3d.js and replaces only the public
 * Visualize entrypoints used by the planner. The old Google 3D implementation is
 * kept in the branch as optional/reference code, but the default user experience
 * requires no API key, no billing account and no paid map service.
 */
(function (root) {
  'use strict';

  if (!root || !root.Visualize3D || !root.VisualizeWorld) return;

  const legacy = root.Visualize3D;
  const World = root.VisualizeWorld;
  const Elevation = root.VisualizeElevation;

  let shellReady = false;
  let activeDay = null;
  let activeRouteStatus = null;
  let worldReadyDay = null;
  let renderToken = 0;
  let renderTimer = null;
  let isPlaying = false;
  let speed = 1;
  let cameraMode = 'road';
  let stopsWithDistances = [];
  let currentDayData = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[ch];
    });
  }

  function dayColorSafe(date) {
    try {
      if (typeof dayColor === 'function') return dayColor(date);
    } catch (_) {}
    return '#56c6a5';
  }

  function dayList() {
    try {
      return (typeof S !== 'undefined' && Array.isArray(S.days)) ? S.days : [];
    } catch (_) {
      return [];
    }
  }

  function selectedDayLabel() {
    try {
      const current = typeof S !== 'undefined' ? S.selectedDay : null;
      if (current && current !== 'all' && dayList().some(function (d) { return d.date === current; })) return current;
    } catch (_) {}

    const preferred = dayList().find(function (d) { return d.date === 'Sep 27'; });
    if (preferred) return preferred.date;
    const routeDay = dayList().find(function (d) { return d.stops && d.stops.length > 1; });
    return routeDay ? routeDay.date : (dayList()[0] ? dayList()[0].date : 'Sep 27');
  }

  function getDayData(date) {
    if (!legacy || typeof legacy.getVisualizeDayData !== 'function') return null;
    return legacy.getVisualizeDayData(date);
  }

  function buildFallbackProfile(dayData, mappedStops) {
    const entries = (mappedStops || []).map(function (entry) {
      const stop = entry.stop || entry;
      let elevation = null;
      try {
        if (legacy && typeof legacy.getLandmarkCameraProfile === 'function') {
          const profile = legacy.getLandmarkCameraProfile(stop);
          elevation = profile && Number(profile.elevation);
        }
      } catch (_) {}
      if (!Number.isFinite(elevation)) elevation = 1500;
      return {
        fraction: Number(entry.fraction || 0),
        elevation: elevation,
        location: { lat: Number(stop.lat), lng: Number(stop.lng) },
        resolution: null
      };
    }).filter(function (s) { return Number.isFinite(s.fraction); });

    entries.sort(function (a, b) { return a.fraction - b.fraction; });
    if (!entries.length) return null;
    if (entries[0].fraction > 0.001) entries.unshift(Object.assign({}, entries[0], { fraction: 0 }));
    if (entries[entries.length - 1].fraction < 0.999) {
      entries.push(Object.assign({}, entries[entries.length - 1], { fraction: 1 }));
    }

    const elevations = entries.map(function (s) { return s.elevation; });
    const min = Math.min.apply(Math, elevations);
    const max = Math.max.apply(Math, elevations);
    return {
      samples: entries,
      stats: {
        minElevation: Math.round(min),
        maxElevation: Math.round(max),
        elevationRange: Math.round(max - min),
        gain: 0,
        loss: 0
      },
      resolution: null,
      status: 'fallback',
      isEstimated: true
    };
  }

  function resolveDayIso(dateLabel) {
    try {
      if (typeof DATE_ISO !== 'undefined' && DATE_ISO && DATE_ISO[dateLabel]) return DATE_ISO[dateLabel];
    } catch (_) {}
    const match = String(dateLabel || '').match(/([A-Za-z]{3})\s+(\d{1,2})/);
    const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    if (!match) return '2026-09-27';
    return '2026-' + (months[match[1]] || '09') + '-' + String(Number(match[2])).padStart(2, '0');
  }

  function buildTimeAnchors(dayData, mappedStops) {
    if (!dayData || !dayData.day || typeof computeDayTimeline !== 'function') return [];
    try {
      const timeline = computeDayTimeline(dayData.day);
      if (!timeline || !Array.isArray(timeline.items)) return [];
      const byId = new Map();
      timeline.items.forEach(function (item) {
        if (item && !item.isCut && item.stop && item.stop.id != null && Number.isFinite(Number(item.arrMin))) {
          byId.set(String(item.stop.id), item);
        }
      });
      return (mappedStops || []).map(function (entry) {
        const stop = entry.stop || entry;
        const item = byId.get(String(stop.id));
        if (!item) return null;
        return {
          fraction: Number(entry.fraction || 0),
          elapsedSeconds: Math.max(0, (Number(item.arrMin) - Number(timeline.startMin || 0)) * 60)
        };
      }).filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function renderShell() {
    const rootEl = document.getElementById('visualizeview');
    if (!rootEl) return false;

    rootEl.innerHTML = `
      <div class="visualize-workspace free-world-workspace" id="visualizeWorkspace">
        <aside class="visualize-sidebar glass" id="visualizeSidebar">
          <div class="vis-sidehead">
            <div class="row">
              <div>
                <div class="ey">FREE 3D ROCKIES WORLD</div>
                <h2 class="vis-sidetitle" id="freeVisTitle">Select a day</h2>
              </div>
              <button class="btn small" id="freeFitBtn">Fit</button>
            </div>
            <div class="vis-dayswitch" id="freeDaySwitch"></div>
          </div>

          <div class="vis-sidebody">
            <div class="vis-free-source-note">
              <b>$0 terrain world</b>
              <span>OpenStreetMap/OpenFreeMap + AWS Open Terrain. No API key. No billing account.</span>
            </div>

            <div class="vis-day-metric-card" id="freeMetricCard"></div>

            <div class="vis-actions-row free-world-actions">
              <button class="btn primary small" id="freeDriveBtn">▶ Drive route</button>
              <button class="btn small" id="freeMapOnlyBtn">Map only</button>
            </div>

            <div class="vis-free-playback-row">
              <div class="vis-flight-speed-group" role="group" aria-label="Playback speed">
                <button class="vis-speed-btn" data-free-speed="0.5">0.5x</button>
                <button class="vis-speed-btn active" data-free-speed="1">1x</button>
                <button class="vis-speed-btn" data-free-speed="2">2x</button>
              </div>
              <button class="btn small" id="freePauseBtn" disabled>⏸ Pause</button>
              <button class="btn small danger" id="freeStopBtn" disabled>⏹ Stop</button>
            </div>

            <div class="ey" style="margin:12px 0 6px;">Camera</div>
            <div class="vis-world-camera-modes free-world-camera-modes" role="group" aria-label="World camera height">
              <button class="vis-world-mode active" data-free-camera="road">Road</button>
              <button class="vis-world-mode" data-free-camera="scenic">Scenic</button>
              <button class="vis-world-mode" data-free-camera="aerial">Aerial</button>
            </div>

            <div class="vis-free-live-card" id="freeLiveCard">
              <div class="vis-free-live-top">
                <span class="vis-world-badge">OPEN WORLD</span>
                <span id="freeClock">Trip time</span>
              </div>
              <div class="vis-free-live-main" id="freeLiveMain">Real terrain mesh • real route • real sun-aware relief</div>
              <div class="vis-flight-progress-bar"><div class="vis-flight-progress-fill" id="freeProgress"></div></div>
            </div>

            <div class="ey" style="margin:12px 0 6px;">Stops</div>
            <div class="vis-stoplist" id="freeStopList"></div>
          </div>
        </aside>

        <main class="visualize-main world-mode free-world-main" id="visualizeMain">
          <div class="visualize-world-container" id="visualizeWorldContainer" aria-label="Free 3D terrain world"></div>
          <div class="visualize-overlay hidden" id="freeWorldOverlay"></div>

          <div class="vis-free-map-hud" id="freeMapHud">
            <span class="vis-world-badge">FREE / OPEN DATA</span>
            <span id="freeMapHudText">Terrain model</span>
          </div>
        </main>
      </div>
    `;

    bindShell();
    shellReady = true;
    return true;
  }

  function ensureShell() {
    const rootEl = document.getElementById('visualizeview');
    if (!rootEl) return false;
    if (!rootEl.querySelector('.free-world-workspace')) return renderShell();
    shellReady = true;
    return true;
  }

  function showOverlay(message, isError) {
    const overlay = document.getElementById('freeWorldOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="vis-overlay-card glass">
        ${isError ? '<div class="vis-overlay-icon">⚠️</div>' : '<div class="vis-spinner"></div>'}
        <p style="margin-top:12px;">${escapeHtml(message)}</p>
        ${isError ? '<button class="btn" id="freeRetryBtn">Retry free terrain</button>' : ''}
      </div>`;
    if (isError) {
      const retry = document.getElementById('freeRetryBtn');
      if (retry) retry.onclick = function () { renderCurrentDay(false); };
    }
  }

  function hideOverlay() {
    const overlay = document.getElementById('freeWorldOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function bindShell() {
    const fit = document.getElementById('freeFitBtn');
    if (fit) fit.onclick = function () { World.fitRoute(1); };

    const drive = document.getElementById('freeDriveBtn');
    if (drive) drive.onclick = function () { startDrive(); };

    const pause = document.getElementById('freePauseBtn');
    if (pause) pause.onclick = function () { togglePause(); };

    const stop = document.getElementById('freeStopBtn');
    if (stop) stop.onclick = function () { stopDrive(true); };

    const mapOnly = document.getElementById('freeMapOnlyBtn');
    if (mapOnly) mapOnly.onclick = function () { toggleMapOnly(); };

    document.querySelectorAll('[data-free-speed]').forEach(function (btn) {
      btn.onclick = function () {
        setSpeed(Number(btn.dataset.freeSpeed));
      };
    });

    document.querySelectorAll('[data-free-camera]').forEach(function (btn) {
      btn.onclick = function () {
        setCameraMode(btn.dataset.freeCamera);
      };
    });
  }

  function renderDayButtons() {
    const switcher = document.getElementById('freeDaySwitch');
    if (!switcher) return;
    const current = activeDay || selectedDayLabel();
    switcher.innerHTML = dayList().map(function (day) {
      return `<button class="vis-daybtn ${day.date === current ? 'on' : ''}" data-free-day="${escapeHtml(day.date)}">${escapeHtml(day.date)}</button>`;
    }).join('');
    switcher.querySelectorAll('[data-free-day]').forEach(function (btn) {
      btn.onclick = function () { chooseDay(btn.dataset.freeDay); };
    });
  }

  function renderMetrics(dayData) {
    const el = document.getElementById('freeMetricCard');
    if (!el || !dayData) return;
    const color = dayColorSafe(dayData.date);
    const duration = Number(dayData.driveDurationMin || 0);
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    el.innerHTML = `
      <div class="vis-metric-chip" style="border-left:3px solid ${color}">
        <div class="vis-met-val">${Number(dayData.distanceKm || 0).toFixed(1)} km</div>
        <div class="vis-met-lbl">Road</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${h}h ${m}m</div>
        <div class="vis-met-lbl">Drive</div>
      </div>
      <div class="vis-metric-chip">
        <div class="vis-met-val">${dayData.activeStops.length}</div>
        <div class="vis-met-lbl">Stops</div>
      </div>`;
  }

  function renderStops(dayData) {
    const list = document.getElementById('freeStopList');
    if (!list || !dayData) return;
    if (!dayData.activeStops.length) {
      list.innerHTML = '<div class="vis-empty-stops">No active stops.</div>';
      return;
    }

    list.innerHTML = dayData.activeStops.map(function (stop, index) {
      const isHotel = stop.isHotel || /hotel|sleep/i.test(stop.name || '');
      const badge = isHotel ? 'HOTEL' : (stop.priority === 'must' ? 'MUST' : 'NICE');
      const badgeClass = isHotel ? 'hotel' : (stop.priority === 'must' ? 'must' : 'nice');
      return `
        <button class="vis-stop-item free-stop-button" data-free-stop="${escapeHtml(String(stop.id))}">
          <span class="vis-stop-num">${index + 1}</span>
          <span class="vis-stop-info">
            <span class="vis-stop-name">${escapeHtml(stop.name)}</span>
            <span class="vis-stop-meta"><span class="vis-badge ${badgeClass}">${badge}</span></span>
          </span>
        </button>`;
    }).join('');

    list.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      btn.onclick = function () { focusStop(btn.dataset.freeStop); };
    });
  }

  function formatClock(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return 'Trip time';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Edmonton',
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    } catch (_) {
      return date.toLocaleTimeString();
    }
  }

  function updateHud(info) {
    if (!info) return;
    const clock = document.getElementById('freeClock');
    const main = document.getElementById('freeLiveMain');
    const progress = document.getElementById('freeProgress');
    const mapHud = document.getElementById('freeMapHudText');
    if (clock) clock.textContent = formatClock(info.date);
    if (main) {
      main.textContent = `Sun ${Math.round(info.sun.azimuth)}° / ${Math.round(info.sun.altitude)}° • terrain ${Math.round(info.surfaceHeight || 0)} m • camera ${Math.round(info.cameraHeight || 0)} m`;
    }
    if (progress) progress.style.width = `${Math.round((info.progress || 0) * 100)}%`;
    if (mapHud) {
      mapHud.textContent = `${formatClock(info.date)} • ${Math.round((info.distanceMeters || 0) / 1000)} / ${Math.round((info.totalDistanceMeters || 0) / 1000)} km • ${info.cameraMode}`;
    }
  }

  function updatePlaybackUi() {
    const drive = document.getElementById('freeDriveBtn');
    const pause = document.getElementById('freePauseBtn');
    const stop = document.getElementById('freeStopBtn');
    if (drive) drive.textContent = isPlaying ? 'Driving…' : '▶ Drive route';
    if (pause) {
      pause.disabled = !isPlaying;
      pause.textContent = World.isPaused() ? '▶ Resume' : '⏸ Pause';
    }
    if (stop) stop.disabled = !isPlaying;
  }

  function setSpeed(value) {
    speed = Number(value) > 0 ? Number(value) : 1;
    World.setSpeed(speed);
    document.querySelectorAll('[data-free-speed]').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.freeSpeed) === speed);
    });
  }

  function setCameraMode(mode) {
    cameraMode = ['road', 'scenic', 'aerial'].includes(mode) ? mode : 'road';
    World.setCameraMode(cameraMode);
    document.querySelectorAll('[data-free-camera]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.freeCamera === cameraMode);
    });
  }

  function toggleMapOnly(force) {
    const workspace = document.getElementById('visualizeWorkspace');
    const btn = document.getElementById('freeMapOnlyBtn');
    if (!workspace) return;
    const next = force === undefined ? !workspace.classList.contains('map-only') : !!force;
    workspace.classList.toggle('map-only', next);
    if (btn) btn.textContent = next ? 'Show panel' : 'Map only';
    World.show();
  }

  function focusStop(stopId) {
    const idx = stopsWithDistances.findIndex(function (entry) {
      const stop = entry.stop || entry;
      return String(stop.id) === String(stopId);
    });
    if (idx < 0) return;
    const entry = stopsWithDistances[idx];
    const stop = entry.stop || entry;
    World.stop(false);
    isPlaying = false;
    let prof = null;
    if (World.focusLandmark) {
      prof = World.focusLandmark(stop, null, entry.arrivalDate, Number(entry.fraction || 0));
    } else {
      World.setProgress(Number(entry.fraction || 0));
    }
    updatePlaybackUi();
    document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
      const isMatch = btn.dataset.freeStop === String(stopId);
      btn.classList.toggle('selected', isMatch);
      if (isMatch && typeof btn.scrollIntoView === 'function') {
        try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
      }
    });
    const hud = document.getElementById('freeMapHudText');
    const live = document.getElementById('freeLiveMain');
    const detail = document.getElementById('freeLiveDetail');
    if (hud) {
      hud.textContent = `${stop.name || 'Stop'} • ${prof && prof.viewContext ? prof.viewContext : 'Landmark Vista'}`;
    }
    if (live) {
      live.textContent = stop.name || 'Stop';
    }
    if (detail && prof && prof.viewContext) {
      detail.textContent = prof.viewContext;
    }
  }

  async function renderCurrentDay(autoPlay) {
    if (!ensureShell()) return;
    const token = ++renderToken;
    const date = activeDay || selectedDayLabel();
    const dayData = getDayData(date);
    if (!dayData) return;

    activeDay = date;
    currentDayData = dayData;
    activeRouteStatus = dayData.routeStatus;
    renderDayButtons();

    const title = document.getElementById('freeVisTitle');
    if (title) title.textContent = `${date}: ${dayData.label || ''}`;
    renderMetrics(dayData);
    renderStops(dayData);

    if (!dayData.routeCoordinates || dayData.routeCoordinates.length < 2) {
      showOverlay('Route geometry is still loading. The free terrain world will update when the road route is ready.', false);
      return;
    }

    try {
      showOverlay('Loading free Canadian Rockies terrain mesh…', false);
      await World.initialize(document.getElementById('visualizeWorldContainer'));
      if (token !== renderToken) return;

      stopsWithDistances = Elevation && typeof Elevation.mapStopsToDistances === 'function'
        ? Elevation.mapStopsToDistances(dayData.activeStops, dayData.routeCoordinates)
        : [];

      const fallbackProfile = buildFallbackProfile(dayData, stopsWithDistances);
      const timeAnchors = buildTimeAnchors(dayData, stopsWithDistances);

      World.loadDay({
        routeCoordinates: dayData.routeCoordinates,
        elevationProfile: fallbackProfile,
        stopsWithDistances: stopsWithDistances,
        dateISO: resolveDayIso(dayData.date),
        startTime: dayData.start || '08:00',
        driveDurationSeconds: Math.max(60, Number(dayData.driveDurationMin || 0) * 60),
        timeAnchors: timeAnchors,
        handlers: {
          onProgress: updateHud,
          onStop: function (stop) {
            if (!stop) return;
            document.querySelectorAll('[data-free-stop]').forEach(function (btn) {
              btn.classList.toggle('selected', btn.dataset.freeStop === String(stop.id));
            });
          },
          onEnd: function () {
            isPlaying = false;
            updatePlaybackUi();
          }
        }
      });
      World.setCameraMode(cameraMode);
      World.setSpeed(speed);
      worldReadyDay = dayData.date;
      hideOverlay();

      if (autoPlay) {
        isPlaying = true;
        World.setProgress(0);
        World.play({ speed: speed, cameraMode: cameraMode });
      } else {
        isPlaying = false;
        World.fitRoute(0);
      }
      updatePlaybackUi();
    } catch (err) {
      if (token !== renderToken) return;
      isPlaying = false;
      updatePlaybackUi();
      showOverlay('Free terrain could not load. Check network access to OpenFreeMap/AWS Open Data and retry. ' + (err && err.message ? err.message : String(err)), true);
    }
  }

  function scheduleRender(autoPlay) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(function () { renderCurrentDay(!!autoPlay); }, 180);
  }

  function chooseDay(date) {
    const previous = activeDay;
    if (!date || date === 'all') date = selectedDayLabel();
    activeDay = date;

    try {
      if (typeof S !== 'undefined') {
        const changed = S.selectedDay !== date;
        S.selectedDay = date;
        if (changed && typeof persist === 'function') persist();
      }
    } catch (_) {}

    if (isPlaying && previous !== date) stopDrive(false);
    renderCurrentDay(false);
  }

  function onActivate() {
    ensureShell();
    const desired = selectedDayLabel();
    if (!activeDay) activeDay = desired;
    renderCurrentDay(false);
  }

  function startDrive() {
    if (!currentDayData || worldReadyDay !== currentDayData.date) {
      renderCurrentDay(true);
      return;
    }
    if (isPlaying) return;
    isPlaying = true;
    World.setSpeed(speed);
    World.setCameraMode(cameraMode);
    World.play({ speed: speed, cameraMode: cameraMode });
    updatePlaybackUi();
  }

  function togglePause() {
    if (!isPlaying) return;
    World.togglePause();
    updatePlaybackUi();
  }

  function stopDrive(restoreFit) {
    World.stop(!!restoreFit);
    isPlaying = false;
    updatePlaybackUi();
  }

  function publicChooseDay(date) {
    // app.js calls this when OSRM legs finish. Avoid a camera reset for every
    // partial leg; only rebuild when the same day's final route becomes ready.
    const sameDay = String(date) === String(activeDay);
    if (!sameDay) {
      chooseDay(date);
      return;
    }
    const latest = getDayData(date);
    if (!latest) return;
    if (!isPlaying && latest.routeStatus === 'ready' && activeRouteStatus !== 'ready') {
      activeRouteStatus = 'ready';
      scheduleRender(false);
    }
  }

  function selectStopById(stopId) {
    if (!shellReady) onActivate();
    setTimeout(function () { focusStop(stopId); }, 0);
  }

  // Replace only public entry points used by app.js/hash navigation. The old
  // Google implementation remains available in source history, but no paid API
  // is required by the active Visualize experience.
  legacy.onVisualizeTabActivated = onActivate;
  legacy.chooseVisualizeDay = publicChooseDay;
  legacy.startRouteFlyThrough = startDrive;
  legacy.cancelRouteFlyThrough = stopDrive;
  legacy.togglePauseFlyThrough = togglePause;
  legacy.toggleMapOnly = toggleMapOnly;
  legacy.selectStopById = selectStopById;
  legacy.setFlightSpeed = setSpeed;
  legacy.setWorldCameraMode = setCameraMode;

  legacy.getFreeWorldStatus = function () {
    return {
      activeDay: activeDay,
      readyDay: worldReadyDay,
      playing: isPlaying,
      speed: speed,
      cameraMode: cameraMode,
      renderer: World.getStatus(),
      paidApiRequired: false
    };
  };

  function maybeActivateFromHash() {
    const vis = document.getElementById('visualizeview');
    const hash = (root.location && root.location.hash || '').replace(/^#/, '');
    if ((vis && vis.classList.contains('on')) || hash.indexOf('visualizeview') === 0) {
      onActivate();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(maybeActivateFromHash, 0);
      });
    } else {
      setTimeout(maybeActivateFromHash, 0);
    }
    root.addEventListener('hashchange', function () { setTimeout(maybeActivateFromHash, 0); });
  }
})(typeof window !== 'undefined' ? window : null);
